// Which Chromium-based browser js/check-site.mjs launches, and with which flags. It lives apart from check-site.mjs,
// which starts the check as soon as it is loaded, so `node --test js/find-browser.test.mjs` (part of `make test`)
// can pin the order without a browser.
//
// The order, first existing path wins:
//   1. --browser <path>, then $BROWSER_PATH - an explicit choice always wins (CI sets /usr/bin/google-chrome);
//   2. Playwright's downloads under $PLAYWRIGHT_BROWSERS_PATH, ~/Library/Caches/ms-playwright and
//      ~/.cache/ms-playwright: every chromium_headless_shell-<rev>/ build first (no window, no Dock icon, no profile
//      prompt), then every chromium-<rev>/ "Google Chrome for Testing", each newest revision first;
//   3. an installed Google Chrome, Chromium or Brave (/Applications on macOS, /usr/bin on Linux).
// Microsoft Edge is never picked on its own: on a workstation it is the owner's everyday browser, and a headless
// copy of it starting and stopping under them is not what a site check should do. Pass --browser to use it anyway.
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const SYSTEM_BROWSERS = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
];

// The executable inside one Playwright revision directory, per platform (playwright-core's registry layout).
function playwrightLayouts(platform, arch) {
  if (platform === 'darwin') {
    const mac = arch === 'arm64' ? 'mac-arm64' : 'mac-x64';
    return {
      shell: [join(`chrome-headless-shell-${mac}`, 'chrome-headless-shell')],
      full: [
        join(`chrome-${mac}`, 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
        join('chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'), // revisions before Chrome for Testing
      ],
    };
  }
  if (platform === 'linux') {
    return {
      shell: [join('chrome-headless-shell-linux64', 'chrome-headless-shell'), join('chrome-linux', 'headless_shell')],
      full: [join('chrome-linux64', 'chrome'), join('chrome-linux', 'chrome')],
    };
  }
  return { shell: [], full: [] };
}

// Where Playwright keeps its downloads: $PLAYWRIGHT_BROWSERS_PATH first ("0" means inside node_modules, which this
// repository does not install), then the macOS and the Linux default cache.
function playwrightRoots(env, home) {
  const roots = [];
  const custom = env.PLAYWRIGHT_BROWSERS_PATH;
  if (custom && custom !== '0') roots.push(custom);
  roots.push(join(home, 'Library', 'Caches', 'ms-playwright'), join(home, '.cache', 'ms-playwright'));
  return [...new Set(roots)];
}

// `<root>/<prefix><rev>` directories, newest revision first; a missing root contributes nothing.
function revisionDirs(root, prefix, readdir) {
  let names;
  try {
    names = readdir(root);
  } catch {
    return [];
  }
  return names
    .map((name) => ({ name, rev: name.startsWith(prefix) && /^\d+$/.test(name.slice(prefix.length)) ? Number(name.slice(prefix.length)) : NaN }))
    .filter((d) => Number.isFinite(d.rev))
    .sort((a, b) => b.rev - a.rev)
    .map((d) => join(root, d.name));
}

/** Every path check-site.mjs would try, in the order it tries them (see the header). */
export function browserCandidates({ explicit, env = process.env, home = homedir(), platform = process.platform, arch = process.arch, readdir = readdirSync } = {}) {
  const roots = playwrightRoots(env, home);
  const layouts = playwrightLayouts(platform, arch);
  const playwright = (prefix, subpaths) =>
    roots.flatMap((root) => revisionDirs(root, prefix, readdir).flatMap((dir) => subpaths.map((p) => join(dir, p))));
  return [
    explicit,
    env.BROWSER_PATH,
    ...playwright('chromium_headless_shell-', layouts.shell),
    ...playwright('chromium-', layouts.full),
    ...SYSTEM_BROWSERS,
  ].filter(Boolean);
}

/** The first candidate that exists, or undefined. */
export function findBrowser(options = {}, exists = existsSync) {
  return browserCandidates(options).find((p) => exists(p));
}

/**
 * The command line check-site.mjs starts the browser with. --use-mock-keychain is always there: without it a
 * Chrome-for-Testing or Google Chrome binary started outside Playwright asks macOS for its "Chrome Safe Storage"
 * keychain item, and that dialog lands on the screen of whoever is at the machine on every run.
 */
export function browserArgs({ port, profile, width }) {
  return [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--use-mock-keychain',
    '--disable-gpu',
    '--hide-scrollbars',
    `--window-size=${width},900`,
    'about:blank',
  ];
}
