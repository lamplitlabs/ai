import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { act, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';

/**
 * The lamp is the site's theme switch. vitest runs in node here (no jsdom / @testing-library in the lockfile,
 * dependencies are Tier 2), so a minimal DOM stand-in - just the handful of node methods react-dom/client calls
 * for this component - lets the real React tree mount and the real click handler run against theme.ts.
 */
class FakeNode {
  nodeType = 1;
  nodeName: string;
  children: FakeNode[] = [];
  parentNode: FakeNode | null = null;
  attrs: Record<string, string> = {};
  style: Record<string, string> = {};
  textContent = '';
  ownerDocument: unknown;
  namespaceURI = 'http://www.w3.org/1999/xhtml';
  onclick: ((e: unknown) => void) | null = null;
  constructor(name: string, doc: unknown) {
    this.nodeName = name.toUpperCase();
    this.ownerDocument = doc;
  }
  appendChild(c: FakeNode) {
    c.parentNode = this;
    this.children.push(c);
    return c;
  }
  insertBefore(c: FakeNode, ref: FakeNode | null) {
    c.parentNode = this;
    const i = ref ? this.children.indexOf(ref) : -1;
    if (i < 0) this.children.push(c);
    else this.children.splice(i, 0, c);
    return c;
  }
  removeChild(c: FakeNode) {
    this.children = this.children.filter((x) => x !== c);
    return c;
  }
  setAttribute(k: string, v: string) {
    this.attrs[k] = String(v);
  }
  removeAttribute(k: string) {
    delete this.attrs[k];
  }
  getAttribute(k: string) {
    return this.attrs[k] ?? null;
  }
  addEventListener() {}
  removeEventListener() {}
  get firstChild() {
    return this.children[0] ?? null;
  }
  get nextSibling(): FakeNode | null {
    const p = this.parentNode;
    if (!p) return null;
    return p.children[p.children.indexOf(this) + 1] ?? null;
  }
  get tagName() {
    return this.nodeName;
  }
  find(pred: (n: FakeNode) => boolean): FakeNode | null {
    if (pred(this)) return this;
    for (const c of this.children) {
      const r = c.find(pred);
      if (r) return r;
    }
    return null;
  }
}

const htmlClasses = new Set<string>();
const storage = new Map<string, string>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const doc: any = {
  nodeType: 9,
  createElement: (t: string) => new FakeNode(t, doc),
  createElementNS: (_ns: string, t: string) => new FakeNode(t, doc),
  createTextNode: (s: string) => {
    const n = new FakeNode('#text', doc);
    n.nodeType = 3;
    n.textContent = s;
    return n;
  },
  addEventListener() {},
  removeEventListener() {},
};
doc.documentElement = Object.assign(new FakeNode('html', doc), {
  classList: {
    toggle: (c: string, on: boolean) => (on ? htmlClasses.add(c) : htmlClasses.delete(c)),
    contains: (c: string) => htmlClasses.has(c),
  },
});

// Find the React props object react-dom attaches to a host node, so a click can be dispatched without a real event system.
function clickHandlerOf(node: FakeNode): (() => void) | undefined {
  const key = Object.keys(node).find((k) => k.startsWith('__reactProps$'));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return key ? (node as any)[key]?.onClick : undefined;
}

let root: Root | null = null;
let container: FakeNode;
let LampToggle: () => ReactElement;
let isDark: () => boolean;
let setDark: (next: boolean) => void;

beforeAll(async () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = globalThis as any;
  g.document = doc;
  g.window = globalThis;
  g.location = { search: '' };
  g.localStorage = {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => void storage.set(k, v),
    removeItem: (k: string) => void storage.delete(k),
  };
  g.matchMedia = () => ({ matches: false });
  g.HTMLIFrameElement = class {};
  doc.body = new FakeNode('body', doc);
  doc.activeElement = doc.body;
  doc.defaultView = globalThis;
  g.IS_REACT_ACT_ENVIRONMENT = true;
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
    expect(htmlClasses.has('dark')).toBe(true);
    expect(button.attrs['data-theme']).toBe('dark');
    expect(button.attrs['aria-label']).toBe('Turn on the light');

    click();
    expect(isDark()).toBe(false);
    expect(storage.get('lamplit.theme')).toBe('light');
    expect(htmlClasses.has('dark')).toBe(false);
    expect(button.attrs['aria-label']).toBe('Turn off the light');
  });

  it('follows a theme change made elsewhere (same store as the rest of the site)', () => {
    const button = mount();
    act(() => setDark(true));
    expect(button.attrs['data-theme']).toBe('dark');
  });
});
