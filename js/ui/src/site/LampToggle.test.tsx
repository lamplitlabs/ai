import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { act, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { FakeNode, clickHandlerOf, installFakeDom } from './testDom';

/**
 * The lamp is the site's theme switch. vitest runs in node here (no jsdom / @testing-library in the lockfile,
 * dependencies are Tier 2), so a minimal DOM stand-in - just the handful of node methods react-dom/client calls
 * for this component - lets the real React tree mount and the real click handler run against theme.ts.
 */
const storage = new Map<string, string>();

const doc = installFakeDom();

let root: Root | null = null;
let container: FakeNode;
let LampToggle: () => ReactElement;
let isDark: () => boolean;
let setDark: (next: boolean) => void;

beforeAll(async () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = globalThis as any;
  g.location = { search: '' };
  g.localStorage = {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => void storage.set(k, v),
    removeItem: (k: string) => void storage.delete(k),
  };
  g.matchMedia = () => ({ matches: false });
  // theme.ts reads window/localStorage at import time, so import after the stand-in is in place.
  ({ isDark, setDark } = await import('./theme'));
  ({ LampToggle } = await import('./LampToggle'));
});

afterEach(() => {
  if (root) act(() => root!.unmount());
  root = null;
  setDark(false);
});

function mount() {
  container = new FakeNode('div', doc);
  root = createRoot(container as unknown as Element);
  act(() => root!.render(<LampToggle />));
  const button = container.find((n) => n.nodeName === 'BUTTON');
  if (!button) throw new Error('LampToggle rendered no <button>');
  return button;
}

describe('LampToggle (the lamp in the header switches the theme)', () => {
  it('renders one accessible button with a label that says what pulling the cord does', () => {
    const button = mount();
    expect(button.attrs.type).toBe('button');
    expect(button.attrs['aria-label']).toBe('Turn off the light'); // light mode = lamp lit
    expect(button.attrs.title).toBe(button.attrs['aria-label']);
    expect(button.attrs['data-theme']).toBe('light');
    // the artwork is decorative; the label carries the meaning
    const svg = button.find((n) => n.nodeName === 'SVG');
    expect(svg?.attrs['aria-hidden']).toBe('true');
  });

  it('clicking it flips theme.ts isDark(), persists the choice and relabels itself', () => {
    const button = mount();
    expect(isDark()).toBe(false);
    // re-read the handler each time: React swaps the props object on every render
    const click = () => act(() => clickHandlerOf(button)!());
    expect(clickHandlerOf(button)).toBeTypeOf('function');

    click();
    expect(isDark()).toBe(true);
    expect(storage.get('lamplit.theme')).toBe('dark');
    expect(doc.documentElement.classList.contains('dark')).toBe(true);
    expect(button.attrs['data-theme']).toBe('dark');
    expect(button.attrs['aria-label']).toBe('Turn on the light');

    click();
    expect(isDark()).toBe(false);
    expect(storage.get('lamplit.theme')).toBe('light');
    expect(doc.documentElement.classList.contains('dark')).toBe(false);
    expect(button.attrs['aria-label']).toBe('Turn off the light');
  });

  it('follows a theme change made elsewhere (same store as the rest of the site)', () => {
    const button = mount();
    act(() => setDark(true));
    expect(button.attrs['data-theme']).toBe('dark');
  });
});
