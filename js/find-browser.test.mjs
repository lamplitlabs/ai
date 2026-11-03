// Unit check of the browser order js/check-site.mjs uses (js/find-browser.mjs). No browser is started: the file
// system is a fake. Run with `node --test js/find-browser.test.mjs` (part of `make test`).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { browserArgs, browserCandidates, findBrowser } from './find-browser.mjs';

const HOME = '/home/u';
const MAC_CACHE = join(HOME, 'Library', 'Caches', 'ms-playwright');
const LINUX_CACHE = join(HOME, '.cache', 'ms-playwright');
const MAC_SHELL = join('chrome-headless-shell-mac-arm64', 'chrome-headless-shell');
const MAC_CFT = join('chrome-mac-arm64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing');

// A fake readdirSync: `dirs` maps a directory to its entries; any other directory does not exist.
const fakeReaddir = (dirs) => (dir) => {
  if (!(dir in dirs)) throw Object.assign(new Error(`ENOENT: ${dir}`), { code: 'ENOENT' });
  return dirs[dir];
};

const macOptions = (dirs, env = {}) => ({ env, home: HOME, platform: 'darwin', arch: 'arm64', readdir: fakeReaddir(dirs) });

test('explicit --browser, then BROWSER_PATH, come before anything detected', () => {
  const c = browserCandidates({ ...macOptions({ [MAC_CACHE]: ['chromium_headless_shell-1252'] }, { BROWSER_PATH: '/env/chrome' }), explicit: '/arg/chrome' });
  assert.deepEqual(c.slice(0, 3), ['/arg/chrome', '/env/chrome', join(MAC_CACHE, 'chromium_headless_shell-1252', MAC_SHELL)]);
});

test('Playwright headless shell first, then Chrome for Testing, each newest revision first, then installed browsers', () => {
  const c = browserCandidates(
    macOptions({ [MAC_CACHE]: ['chromium-1200', 'chromium_headless_shell-1200', 'chromium-1252', 'chromium_headless_shell-1252', 'ffmpeg-1013', 'chromium-tip-of-tree-1300', '.links'] }),
  );
  assert.deepEqual(c, [
    join(MAC_CACHE, 'chromium_headless_shell-1252', MAC_SHELL),
    join(MAC_CACHE, 'chromium_headless_shell-1200', MAC_SHELL),
    join(MAC_CACHE, 'chromium-1252', MAC_CFT),
    join(MAC_CACHE, 'chromium-1252', 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
    join(MAC_CACHE, 'chromium-1200', MAC_CFT),
    join(MAC_CACHE, 'chromium-1200', 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ]);
});

test('revisions sort numerically, not as text', () => {
  const c = browserCandidates(macOptions({ [MAC_CACHE]: ['chromium_headless_shell-999', 'chromium_headless_shell-1000'] }));
  assert.deepEqual(c.slice(0, 2), [join(MAC_CACHE, 'chromium_headless_shell-1000', MAC_SHELL), join(MAC_CACHE, 'chromium_headless_shell-999', MAC_SHELL)]);
});

test('PLAYWRIGHT_BROWSERS_PATH is searched before the default caches', () => {
  const c = browserCandidates(macOptions({ '/pw': ['chromium_headless_shell-1100'], [MAC_CACHE]: ['chromium_headless_shell-1252'] }, { PLAYWRIGHT_BROWSERS_PATH: '/pw' }));
  assert.deepEqual(c.slice(0, 2), [join('/pw', 'chromium_headless_shell-1100', MAC_SHELL), join(MAC_CACHE, 'chromium_headless_shell-1252', MAC_SHELL)]);
});

test('Linux uses the linux64 layouts from ~/.cache/ms-playwright', () => {
  const c = browserCandidates({ env: {}, home: HOME, platform: 'linux', arch: 'x64', readdir: fakeReaddir({ [LINUX_CACHE]: ['chromium-1252', 'chromium_headless_shell-1252'] }) });
  assert.deepEqual(c.slice(0, 4), [
    join(LINUX_CACHE, 'chromium_headless_shell-1252', 'chrome-headless-shell-linux64', 'chrome-headless-shell'),
    join(LINUX_CACHE, 'chromium_headless_shell-1252', 'chrome-linux', 'headless_shell'),
    join(LINUX_CACHE, 'chromium-1252', 'chrome-linux64', 'chrome'),
    join(LINUX_CACHE, 'chromium-1252', 'chrome-linux', 'chrome'),
  ]);
});

test('Microsoft Edge is never a candidate', () => {
  const c = browserCandidates(macOptions({}));
  assert.ok(c.every((p) => !/edge/i.test(p)), c.join('\n'));
  const linux = browserCandidates({ env: {}, home: HOME, platform: 'linux', arch: 'x64', readdir: fakeReaddir({}) });
  assert.ok(linux.every((p) => !/edge/i.test(p)), linux.join('\n'));
});

test('findBrowser returns the first candidate that exists', () => {
  const shell = join(MAC_CACHE, 'chromium_headless_shell-1252', MAC_SHELL);
  const cft = join(MAC_CACHE, 'chromium-1252', MAC_CFT);
  const opts = macOptions({ [MAC_CACHE]: ['chromium-1252', 'chromium_headless_shell-1252'] });
  const present = new Set([cft, shell, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']);
  assert.equal(findBrowser(opts, (p) => present.has(p)), shell);
  present.delete(shell);
  assert.equal(findBrowser(opts, (p) => present.has(p)), cft);
  assert.equal(findBrowser(opts, () => false), undefined);
});

test('the browser always starts headless with --use-mock-keychain', () => {
  const a = browserArgs({ port: 9301, profile: '/tmp/p', width: 390 });
  assert.ok(a.includes('--use-mock-keychain'));
  assert.ok(a.includes('--headless=new'));
  assert.ok(a.includes('--remote-debugging-port=9301'));
  assert.ok(a.includes('--user-data-dir=/tmp/p'));
  assert.ok(a.includes('--window-size=390,900'));
});
