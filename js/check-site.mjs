#!/usr/bin/env node
// Smoke check for the site pages (js/ui): opens every route in a headless Chromium-based browser, waits for the
// page to render (body[data-route]), records console errors and failed requests, and optionally saves a full-page
// screenshot per route. Zero console errors and every route rendered = exit 0.
//
//   node js/check-site.mjs [--base http://127.0.0.1:8787] [--routes /,/models,/benchmarks]
//                          [--theme dark|light] [--shots <dir>] [--width 1280] [--browser <path>] [--reduced-motion]
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
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

// One launch attempt: a fresh random DevTools port and profile directory each time, so a port already taken or a
// profile left by a killed run cannot wedge the check. Resolves with /json/version once the browser answers.
async function launchOnce() {
  port = 9300 + Math.floor(Math.random() * 500);
  const profile = join(tmp, `check-site-${process.pid}-${port}`);
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
      proc?.kill();
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

const results = [];
let failed = false;
try {
  await waitForDevtools();
  for (const route of routes) {
    const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
    const cdp = new CDP(target.webSocketDebuggerUrl);
    await cdp.ready;
    await cdp.send('Runtime.enable');
    await cdp.send('Log.enable');
    await cdp.send('Page.enable');
    await cdp.send('Network.enable');
    const url = `${base}${route}${route.includes('?') ? '&' : '?'}theme=${theme}`;
    // --reduced-motion: the pages must read the same with animation off (static hero, numbers shown at their value)
    if (args['reduced-motion']) await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await cdp.send('Page.navigate', { url });
    const start = Date.now();
    let rendered = '';
    while (Date.now() - start < 20000) {
      await sleep(250);
      rendered = await cdp.eval('document.body ? (document.body.dataset.route || "") : ""').catch(() => '');
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
      .map((e) => e.params.entry?.text || e.params.exceptionDetails?.exception?.description || JSON.stringify(e.params));
    const failedRequests = cdp.events.filter((e) => e.method === 'Network.loadingFailed').map((e) => e.params.errorText);
    const bad = cdp.events.filter((e) => e.method === 'Network.responseReceived' && e.params.response.status >= 400).map((e) => `${e.params.response.status} ${e.params.response.url}`);
    const entry = { route, rendered: rendered || null, ...snapshot, console_errors: errors, failed_requests: failedRequests, http_errors: bad };
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
    if (!rendered || errors.length || bad.length || snapshot.h1 == null) failed = true;
    results.push(entry);
    cdp.ws.close();
    await fetch(`http://127.0.0.1:${port}/json/close/${target.id}`).catch(() => undefined);
  }
} catch (err) {
  failed = true;
  results.push({ error: err.message });
} finally {
  proc?.kill();
}
console.log(JSON.stringify({ base, theme, ok: !failed, pages: results }, null, 2));
process.exit(failed ? 1 : 0);
