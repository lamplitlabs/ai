#!/usr/bin/env node
// Smoke check for the site pages (js/ui): opens every route in a headless Chromium-based browser, waits for the
// page to render (body[data-route]), records console errors and failed requests, and optionally saves a full-page
// screenshot per route. Zero console errors and every route rendered = exit 0. A route outside the three SPA routes
// (/, /models, /benchmarks) must instead answer with HTTP 404 and the static 404.html page, as vercel.json serves it.
//
//   node js/check-site.mjs [--base http://127.0.0.1:8787] [--routes /,/models,/benchmarks]
//                          [--theme dark|light] [--shots <dir>] [--width 1280] [--browser <path>] [--reduced-motion]
//                          [--route-timeout 10000]
//
// Opt-in hub link check (CHECK_SITE_HUB_LINKS=fail|warn, off by default so `make test`/`make ui-check` never need the
// network): for every showcase model in js/ui/src/data/site.json the Hugging Face URLs the site derives from
// hub.repo (public weights) and hub.space (the demo) get a HEAD request. An HTTP error (404, 401, 5xx) is reported
// under `hub_links` in the JSON report and fails the check (`fail`) or only warns (`warn`); a network error (offline,
// DNS, timeout) is reported as `skipped` and never fails, so an offline machine is not mistaken for a dead link.
//
// Every route runs under a hard timeout (--route-timeout ms, default 10s): a host where headless Chromium accepts
// the navigation but never answers the CDP evaluate fails fast with a message naming the stuck route instead of
// hanging `make ui-check`.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith('--') ? arr[i + 1] : 'true']);
    return acc;
  }, []),
);
const base = (args.base || 'http://127.0.0.1:8787').replace(/\/$/, '');
// the site's own routes; demos live on Hugging Face Spaces and are not checked here
const routes = (args.routes || '/,/models,/benchmarks,/nothing-here').split(',');
const theme = args.theme || 'dark';
const width = Number(args.width || 1280);
const routeTimeout = Number(args['route-timeout'] || process.env.CHECK_SITE_ROUTE_TIMEOUT_MS || 10000);
const candidates = [
  args.browser,
  process.env.BROWSER_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/microsoft-edge',
].filter(Boolean);
const browser = candidates.find((p) => existsSync(p));
if (!browser) {
  console.error('no Chromium-based browser found; pass --browser <path>');
  process.exit(2);
}
if (args.shots) mkdirSync(args.shots, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tmp = process.env.TMPDIR || '/tmp';
let port = 0;
let proc = null;
let profile = '';

// Shut the browser down and wait for it: SIGTERM first so Chromium can tear down its renderer/GPU children itself,
// then SIGKILL if it has not exited within `graceMs`. Without the wait `process.exit` ran while the browser was
// still alive, leaving a tree of orphaned renderers (and a profile directory) behind every `make ui-check`.
async function closeBrowser(graceMs = 5000) {
  const p = proc;
  proc = null;
  if (p && p.exitCode === null && p.signalCode === null) {
    const exited = new Promise((resolve) => p.once('exit', resolve));
    p.kill('SIGTERM');
    let timer;
    const grace = new Promise((resolve) => { timer = setTimeout(resolve, graceMs); });
    await Promise.race([exited, grace]);
    clearTimeout(timer);
    if (p.exitCode === null && p.signalCode === null) {
      p.kill('SIGKILL');
      await exited;
    }
  }
  if (profile) rmSync(profile, { recursive: true, force: true });
}

// When a harness (an outer CI timeout, Ctrl-C in `make ui-check`) kills this process directly, the `finally` block
// below never runs, so reap the browser here too before exiting with the conventional 128+signal status.
let reaping = false;
for (const [signal, code] of [['SIGINT', 130], ['SIGTERM', 143]]) {
  process.on(signal, () => {
    if (reaping) return;
    reaping = true;
    closeBrowser().finally(() => process.exit(code));
  });
}

// One launch attempt: a fresh random DevTools port and profile directory each time, so a port already taken or a
// profile left by a killed run cannot wedge the check. Resolves with /json/version once the browser answers.
async function launchOnce() {
  port = 9300 + Math.floor(Math.random() * 500);
  profile = join(tmp, `check-site-${process.pid}-${port}`);
  rmSync(profile, { recursive: true, force: true });
  proc = spawn(browser, [`--headless=new`, `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--disable-gpu', '--hide-scrollbars', `--window-size=${width},900`, 'about:blank'], { stdio: 'ignore' });
  let exited = false;
  proc.once('exit', () => { exited = true; });
  for (let i = 0; i < 100; i++) {
    if (exited) throw new Error(`browser exited before exposing the DevTools port ${port}`);
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) return res.json();
    } catch {}
    await sleep(200);
  }
  throw new Error(`browser did not expose the DevTools port ${port}`);
}

// Launching a headless browser is the flaky step (port collisions, a slow cold start): retry it a few times with a
// short backoff before failing the check, so a transient launch hiccup is not reported as a broken site.
async function waitForDevtools(attempts = 3) {
  let lastErr;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await launchOnce();
    } catch (err) {
      lastErr = err;
      await closeBrowser();
      console.error(`browser launch attempt ${attempt}/${attempts} failed: ${err.message}`);
      if (attempt < attempts) await sleep(500 * attempt);
    }
  }
  throw lastErr;
}

class CDP {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.pending = new Map();
    this.events = [];
    this.ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
      } else if (msg.method) this.events.push(msg);
    });
    this.ready = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('DevTools WebSocket did not open within 10s (CDP connect timed out)')), 10000);
      this.ws.addEventListener('open', () => { clearTimeout(timer); resolve(); });
      this.ws.addEventListener('error', (err) => { clearTimeout(timer); reject(err); });
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP response for ${method} did not arrive within 15s`));
      }, 15000);
      this.pending.set(id, {
        resolve: (v) => { clearTimeout(timer); resolve(v); },
        reject: (e) => { clearTimeout(timer); reject(e); },
      });
    });
  }
  async eval(expression) {
    const r = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'evaluate failed');
    return r.result.value;
  }
}

// the only paths vercel.json rewrites to index.html; everything else must be a real 404
const SPA_ROUTES = new Set(['/', '/models', '/benchmarks']);

const results = [];
let failed = false;
try {
  await waitForDevtools();
  for (const route of routes) {
    // the whole route (new target, navigate, render wait, snapshot, screenshot) must finish within routeTimeout
    let timer;
    const deadline = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`route ${route} did not finish within ${routeTimeout}ms (headless navigation or CDP evaluate stuck)`)), routeTimeout);
    });
    const entry = await Promise.race([checkRoute(route), deadline]).finally(() => clearTimeout(timer));
    if (entry.failed) failed = true;
    delete entry.failed;
    results.push(entry);
  }
} catch (err) {
  failed = true;
  results.push({ error: err.message });
} finally {
  await closeBrowser();
}

async function checkRoute(route) {
  let target, cdp;
  try {
    target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
    cdp = new CDP(target.webSocketDebuggerUrl);
    await cdp.ready;
    await cdp.send('Runtime.enable');
    await cdp.send('Log.enable');
    await cdp.send('Page.enable');
    await cdp.send('Network.enable');
    const url = `${base}${route}${route.includes('?') ? '&' : '?'}theme=${theme}`;
    // --reduced-motion: the pages must read the same with animation off (static hero, numbers shown at their value)
    if (args['reduced-motion']) await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    const expectNotFound = !SPA_ROUTES.has(route.split('?')[0]);
    await cdp.send('Page.navigate', { url });
    const start = Date.now();
    let rendered = '';
    while (Date.now() - start < routeTimeout) {
      await sleep(250);
      // the SPA sets body[data-route]; the static 404 page is rendered once its <h1> is in the document
      rendered = await cdp
        .eval(expectNotFound ? 'document.querySelector("h1") ? "404" : ""' : 'document.body ? (document.body.dataset.route || "") : ""')
        .catch(() => '');
      if (rendered) break;
    }
    // let reveal transitions settle
    await sleep(1200);
    const snapshot = JSON.parse(
      await cdp.eval(`JSON.stringify({
        title: document.title,
        dark: document.documentElement.classList.contains('dark'),
        h1: document.querySelector('h1')?.textContent.trim() || null,
        height: document.documentElement.scrollHeight,
        links: document.querySelectorAll('a[href]').length,
        revealed: [...document.querySelectorAll('.reveal, .reveal-stagger')].filter((e) => e.classList.contains('visible')).length,
        reveals: document.querySelectorAll('.reveal, .reveal-stagger').length,
        fonts: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family).filter((v, i, a) => a.indexOf(v) === i),
      })`),
    );
    // the site makes no request beyond its own files: any 4xx fails
    const errors = cdp.events
      .filter((e) => e.method === 'Runtime.exceptionThrown' || (e.method === 'Log.entryAdded' && e.params.entry.level === 'error'))
      // the browser logs the intended 404 of the unknown route's own document; that one is the point, not an error
      .filter((e) => !(expectNotFound && e.method === 'Log.entryAdded' && e.params.entry.url === url && /status of 404/.test(e.params.entry.text)))
      .map((e) => e.params.entry?.text || e.params.exceptionDetails?.exception?.description || JSON.stringify(e.params));
    const failedRequests = cdp.events.filter((e) => e.method === 'Network.loadingFailed').map((e) => e.params.errorText);
    const responses = cdp.events.filter((e) => e.method === 'Network.responseReceived');
    const document = responses.find((e) => e.params.type === 'Document');
    const status = document?.params.response.status ?? null;
    // an unknown route must be the one 4xx: the document itself, served as 404.html with a real 404 status
    const bad = responses
      .filter((e) => e.params.response.status >= 400 && !(expectNotFound && e === document && e.params.response.status === 404))
      .map((e) => `${e.params.response.status} ${e.params.response.url}`);
    const entry = { route, status, rendered: rendered || null, ...snapshot, console_errors: errors, failed_requests: failedRequests, http_errors: bad };
    if (expectNotFound && status !== 404) entry.http_errors.push(`expected 404 for unknown route ${route}, got ${status}`);
    if (args.shots) {
      const height = Math.min(snapshot.height, 8000);
      await cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
      // reveal blocks below the first viewport only animate in once observed; scrolling the tall viewport shows them all
      await cdp.eval('window.dispatchEvent(new Event("scroll"))');
      await sleep(900);
      const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
      const name = `${(route.split('?')[0].replace(/\//g, '_') || '_home').replace(/^_$/, '_home')}-${theme}.png`;
      writeFileSync(join(args.shots, name), Buffer.from(shot.data, 'base64'));
      entry.screenshot = join(args.shots, name);
    }
    entry.failed = !rendered || errors.length > 0 || entry.http_errors.length > 0 || snapshot.h1 == null;
    return entry;
  } finally {
    cdp?.ws.close();
    if (target) await fetch(`http://127.0.0.1:${port}/json/close/${target.id}`).catch(() => undefined);
  }
}
// --- opt-in hub link reachability (see the header) ---------------------------------------------------------------
const HUB_HOST = 'https://huggingface.co'; // mirrors js/ui/src/site/data.ts (hubRepoUrl/spaceUrl)
const hubMode = (process.env.CHECK_SITE_HUB_LINKS || '').trim().toLowerCase();
const hubEnabled = ['1', 'true', 'yes', 'fail', 'warn'].includes(hubMode);
const hubWarnOnly = hubMode === 'warn';

/** The hub URLs the site shows for its showcase models: repo page when the weights are public, Space when there is one. */
function showcaseHubUrls(sitePath) {
  const site = JSON.parse(readFileSync(sitePath, 'utf8'));
  const urls = [];
  for (const m of site.models || []) {
    if (!m.showcase || !m.hub) continue;
    if (m.hub.public && m.hub.repo) urls.push({ model: m.id || m.name || m.hub.repo, kind: 'repo', url: `${HUB_HOST}/${m.hub.repo}` });
    if (m.hub.space) urls.push({ model: m.id || m.name || m.hub.space, kind: 'space', url: `${HUB_HOST}/spaces/${m.hub.space}` });
  }
  return urls;
}

/** HEAD one URL: `{ ok, status }` on an HTTP answer, `{ skipped, error }` when the network itself failed. */
async function headLink(url, timeoutMs) {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(timeoutMs) });
    return { ok: res.ok, status: res.status };
  } catch (err) {
    const cause = err?.cause?.code || err?.name || '';
    return { skipped: true, error: `${err.message}${cause ? ` (${cause})` : ''}` };
  }
}

async function checkHubLinks() {
  const sitePath = process.env.CHECK_SITE_SITE_JSON || join(dirname(fileURLToPath(import.meta.url)), 'ui', 'src', 'data', 'site.json');
  const timeoutMs = Number(process.env.CHECK_SITE_HUB_TIMEOUT_MS || 10000);
  const links = showcaseHubUrls(sitePath);
  const checked = await Promise.all(links.map(async (l) => ({ ...l, ...(await headLink(l.url, timeoutMs)) })));
  const dead = checked.filter((l) => !l.skipped && !l.ok);
  const skipped = checked.filter((l) => l.skipped);
  const report = { mode: hubWarnOnly ? 'warn' : 'fail', checked: checked.length, dead: dead.length, skipped: skipped.length, links: checked };
  for (const l of dead) console.error(`hub link ${hubWarnOnly ? 'warning' : 'failure'}: ${l.model} ${l.kind} ${l.url} answered HTTP ${l.status}`);
  for (const l of skipped) console.error(`hub link skipped (no network?): ${l.model} ${l.kind} ${l.url}: ${l.error}`);
  return { report, failed: dead.length > 0 && !hubWarnOnly };
}

let hubLinks;
if (hubEnabled) {
  try {
    const r = await checkHubLinks();
    hubLinks = r.report;
    if (r.failed) failed = true;
  } catch (err) {
    hubLinks = { error: err.message };
    failed = true;
  }
}

console.log(JSON.stringify({ base, theme, ok: !failed, pages: results, ...(hubLinks ? { hub_links: hubLinks } : {}) }, null, 2));
process.exit(failed ? 1 : 0);
