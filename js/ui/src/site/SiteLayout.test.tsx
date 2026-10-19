import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import React, { act, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { FakeNode, clickHandlerOf, installFakeDom } from './testDom';

/**
 * The header's menu button is the only way onto the other pages on a phone. vitest runs in node here (no jsdom /
 * @testing-library in the lockfile, dependencies are Tier 2), so - as in LampToggle.test.tsx - a minimal DOM stand-in
 * lets the real React tree mount and the real click handler and route subscription run.
 */
const storage = new Map<string, string>();

const doc = installFakeDom();

let root: Root | null = null;
let container: FakeNode;
let SiteHeader: () => ReactElement;
let SiteLayout: (p: { children: React.ReactNode }) => ReactElement;
let navigate: (to: string) => void;

beforeAll(async () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = globalThis as any;
  // a minimal history-API stand-in so the site's own router (useRoute / navigate) works in node
  g.location = new URL('http://localhost/');
  g.history = {
    pushState: (_s: unknown, _t: string, url: URL) => void (g.location = new URL(String(url))),
    replaceState: (_s: unknown, _t: string, url: URL) => void (g.location = new URL(String(url))),
  };
  g.addEventListener = () => {};
  g.removeEventListener = () => {};
  g.scrollY = 0;
  g.innerHeight = 800;
  g.scrollTo = () => {};
  g.requestAnimationFrame = (cb: () => void) => (cb(), 0);
  g.cancelAnimationFrame = () => {};
  g.localStorage = {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => void storage.set(k, v),
    removeItem: (k: string) => void storage.delete(k),
  };
  g.matchMedia = () => ({ matches: false });
  // theme.ts and router.tsx read window at import time, so import after the stand-in is in place.
  ({ navigate } = await import('./router'));
  ({ SiteHeader, SiteLayout } = await import('./SiteLayout'));
  // The two dynamic imports above transform the whole site tree on a cold cache; under a loaded machine that has
  // exceeded vitest's 10 s default hook timeout, which skipped all six tests. Give the hook room instead.
}, 60_000);

afterEach(() => {
  if (root) act(() => root!.unmount());
  root = null;
  act(() => navigate('/'));
});

const MOBILE_LINKS = ['Home', 'Offerings', 'Benchmarks'];

function mount() {
  container = new FakeNode('div', doc);
  root = createRoot(container as unknown as Element);
  act(() => root!.render(<SiteHeader />));
  const button = container.find((n) => n.nodeName === 'BUTTON' && /menu$/i.test(n.attrs['aria-label'] ?? ''));
  if (!button) throw new Error('SiteHeader rendered no menu <button>');
  return button;
}

/** The mobile nav is the `md:hidden` <nav>; the desktop one is `md:flex`. */
function mobilePanel(): FakeNode | null {
  return container.find((n) => n.nodeName === 'NAV' && (n.attrs.class ?? '').includes('md:hidden'));
}

function linkLabels(panel: FakeNode): string[] {
  return panel.findAll((n) => n.nodeName === 'A').map((a) => a.text.trim());
}

describe('SiteHeader (the mobile menu button opens and closes the page list)', () => {
  it('starts closed: "Open menu", aria-expanded=false and no mobile panel in the tree', () => {
    const button = mount();
    expect(button.attrs.type).toBe('button');
    expect(button.attrs['aria-label']).toBe('Open menu');
    expect(button.attrs['aria-expanded']).toBe('false');
    expect(mobilePanel()).toBeNull();
  });

  it('clicking opens the panel with Home / Offerings / Benchmarks, clicking again closes it', () => {
    const button = mount();
    // re-read the handler each time: React swaps the props object on every render
    const click = () => act(() => clickHandlerOf(button)!());
    expect(clickHandlerOf(button)).toBeTypeOf('function');

    click();
    expect(button.attrs['aria-expanded']).toBe('true');
    expect(button.attrs['aria-label']).toBe('Close menu');
    const panel = mobilePanel();
    expect(panel).not.toBeNull();
    expect(panel!.attrs['aria-label']).toBe('Main');
    const labels = linkLabels(panel!);
    for (const l of MOBILE_LINKS) expect(labels).toContain(l);

    click();
    expect(button.attrs['aria-expanded']).toBe('false');
    expect(button.attrs['aria-label']).toBe('Open menu');
    expect(mobilePanel()).toBeNull();
  });

  it('closes by itself when the route changes (so a tapped page link does not leave the menu over the new page)', () => {
    const button = mount();
    act(() => clickHandlerOf(button)!());
    expect(mobilePanel()).not.toBeNull();

    const offerings = mobilePanel()!.find((n) => n.nodeName === 'A' && n.attrs.href === '/models');
    expect(offerings).not.toBeNull();
    // a plain left click on an in-app Link: the router intercepts it and navigates to /models
    act(() => clickHandlerOf(offerings!)!({ button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, defaultPrevented: false, preventDefault() {} }));
    expect(String(globalThis.location.pathname)).toBe('/models');
    expect(mobilePanel()).toBeNull();
    expect(button.attrs['aria-expanded']).toBe('false');
    expect(button.attrs['aria-label']).toBe('Open menu');
  });

  it('marks the current page link with aria-current="page" in the mobile panel too (not just the desktop nav)', () => {
    act(() => navigate('/models'));
    const button = mount();
    act(() => clickHandlerOf(button)!());
    const panel = mobilePanel()!;
    const current = panel.find((n) => n.nodeName === 'A' && n.attrs.href === '/models');
    expect(current?.attrs['aria-current']).toBe('page');
    const other = panel.find((n) => n.nodeName === 'A' && n.attrs.href === '/');
    expect(other?.attrs['aria-current']).toBeUndefined();
  });
});

describe('SiteLayout (a "Skip to content" link lets keyboard users bypass the header)', () => {
  it('renders the skip link as the first focusable element, targeting #main-content', () => {
    container = new FakeNode('div', doc);
    root = createRoot(container as unknown as Element);
    act(() => root!.render(<SiteLayout>page body</SiteLayout>));
    const focusable = container.findAll((n) => n.nodeName === 'A' || n.nodeName === 'BUTTON');
    expect(focusable.length).toBeGreaterThan(1);
    const skip = focusable[0];
    expect(skip.nodeName).toBe('A');
    expect(skip.text.trim()).toBe('Skip to content');
    expect(skip.attrs.href).toBe('#main-content');
    // hidden until focused: Tailwind's sr-only pattern
    expect(skip.attrs.class).toContain('sr-only');
    expect(skip.attrs.class).toContain('focus:not-sr-only');
    const main = container.find((n) => n.nodeName === 'MAIN');
    expect(main?.attrs.id).toBe('main-content');
    expect(main?.attrs.tabindex).toBe('-1');
  });

  it('clicking the skip link focuses and scrolls to <main id="main-content">', () => {
    container = new FakeNode('div', doc);
    root = createRoot(container as unknown as Element);
    act(() => root!.render(<SiteLayout>page body</SiteLayout>));
    const main = container.find((n) => n.nodeName === 'MAIN')!;
    const calls: string[] = [];
    Object.assign(main, {
      focus: () => calls.push('focus'),
      scrollIntoView: () => calls.push('scroll'),
    });
    const prev = doc.getElementById;
    doc.getElementById = (id: string) => (id === 'main-content' ? main : null);
    try {
      const skip = container.find((n) => n.nodeName === 'A' && n.attrs.href === '#main-content')!;
      const onClick = clickHandlerOf(skip);
      expect(onClick).toBeTypeOf('function');
      let prevented = false;
      act(() => onClick!({ preventDefault: () => (prevented = true) }));
      expect(prevented).toBe(true);
      expect(calls).toEqual(['focus', 'scroll']);
    } finally {
      doc.getElementById = prev;
    }
  });
});
