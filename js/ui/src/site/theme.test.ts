import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// vitest runs in the node environment (no DOM package is installed), so the browser globals theme.ts reads are
// stubbed by hand: a `window` with `location.search` and `matchMedia`, a `localStorage` map and a `document`
// whose `<html>` classList records the `dark` class. theme.ts computes its initial value at import time, so each
// case resets the module registry and imports it fresh.

const KEY = 'lamplit.theme';

function stubBrowser(opts: { search?: string; stored?: string; systemDark?: boolean }) {
  const store = new Map<string, string>();
  if (opts.stored !== undefined) store.set(KEY, opts.stored);
  const classes = new Set<string>();
  const matchMedia = vi.fn((query: string) => ({ matches: query.includes('dark') && !!opts.systemDark }));
  vi.stubGlobal('window', { location: { search: opts.search ?? '' }, matchMedia });
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  });
  vi.stubGlobal('document', {
    documentElement: {
      classList: {
        toggle: (c: string, force: boolean) => (force ? classes.add(c) : classes.delete(c)),
        contains: (c: string) => classes.has(c),
      },
    },
  });
  return { store, classes, matchMedia };
}

async function loadTheme() {
  vi.resetModules();
  return import('./theme');
}

describe('theme', () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.unstubAllGlobals());

  it('?theme=dark overrides a stored light value and does not save', async () => {
    const env = stubBrowser({ search: '?theme=dark', stored: 'light', systemDark: false });
    const theme = await loadTheme();
    expect(theme.isDark()).toBe(true);
    expect(env.classes.has('dark')).toBe(true);
    expect(env.store.get(KEY)).toBe('light');
    expect(env.matchMedia).not.toHaveBeenCalled();
  });

  it('?theme=light overrides a stored dark value', async () => {
    const env = stubBrowser({ search: '?theme=light', stored: 'dark', systemDark: true });
    const theme = await loadTheme();
    expect(theme.isDark()).toBe(false);
    expect(env.classes.has('dark')).toBe(false);
    expect(env.store.get(KEY)).toBe('dark');
  });

  it('ignores an unknown ?theme value and falls through to the stored value', async () => {
    stubBrowser({ search: '?theme=sepia', stored: 'dark', systemDark: false });
    const theme = await loadTheme();
    expect(theme.isDark()).toBe(true);
  });

  it('a stored value wins over the system preference', async () => {
    const env = stubBrowser({ stored: 'light', systemDark: true });
    const theme = await loadTheme();
    expect(theme.isDark()).toBe(false);
    expect(env.matchMedia).not.toHaveBeenCalled();
  });

  it('falls back to prefers-color-scheme when nothing is stored', async () => {
    const env = stubBrowser({ systemDark: true });
    const theme = await loadTheme();
    expect(theme.isDark()).toBe(true);
    expect(env.matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
    expect(env.classes.has('dark')).toBe(true);
  });

  it('defaults to light when nothing is stored and the system prefers light', async () => {
    stubBrowser({ systemDark: false });
    const theme = await loadTheme();
    expect(theme.isDark()).toBe(false);
  });

  it('setDark persists under lamplit.theme and toggles the html class', async () => {
    const env = stubBrowser({ systemDark: false });
    const theme = await loadTheme();
    theme.setDark(true);
    expect(theme.isDark()).toBe(true);
    expect(env.store.get(KEY)).toBe('dark');
    expect(env.classes.has('dark')).toBe(true);
    theme.setDark(false);
    expect(theme.isDark()).toBe(false);
    expect(env.store.get(KEY)).toBe('light');
    expect(env.classes.has('dark')).toBe(false);
  });

  it('setDark with the current value is a no-op that writes nothing', async () => {
    const env = stubBrowser({ systemDark: true });
    const theme = await loadTheme();
    theme.setDark(true);
    expect(env.store.has(KEY)).toBe(false);
  });
});
