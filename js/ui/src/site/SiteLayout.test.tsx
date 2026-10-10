import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { act, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';

/**
 * The header's menu button is the only way onto the other pages on a phone. vitest runs in node here (no jsdom /
 * @testing-library in the lockfile, dependencies are Tier 2), so - as in LampToggle.test.tsx - a minimal DOM stand-in
 * lets the real React tree mount and the real click handler and route subscription run.
 */
class FakeNode {
  nodeType = 1;
  nodeName: string;
  children: FakeNode[] = [];
  parentNode: FakeNode | null = null;
  attrs: Record<string, string> = {};
  style: Record<string, unknown> = { setProperty: (k: string, v: string) => void (this.style[k] = v) };
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
  /** All text under this node, in document order. */
  get text(): string {
    return this.children.length ? this.children.map((c) => c.text).join('') : this.textContent;
  }
  find(pred: (n: FakeNode) => boolean): FakeNode | null {
    if (pred(this)) return this;
    for (const c of this.children) {
      const r = c.find(pred);
      if (r) return r;
    }
    return null;
  }
  findAll(pred: (n: FakeNode) => boolean, out: FakeNode[] = []): FakeNode[] {
    if (pred(this)) out.push(this);
    for (const c of this.children) c.findAll(pred, out);
    return out;
  }
}

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
  getElementById: () => null,
  addEventListener() {},
  removeEventListener() {},
};
doc.documentElement = Object.assign(new FakeNode('html', doc), {
  scrollHeight: 0,
  classList: { toggle() {}, contains: () => false },
});

// Find the React props object react-dom attaches to a host node, so a click can be dispatched without a real event system.
function clickHandlerOf(node: FakeNode): ((e?: unknown) => void) | undefined {
  const key = Object.keys(node).find((k) => k.startsWith('__reactProps$'));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return key ? (node as any)[key]?.onClick : undefined;
}

let root: Root | null = null;
let container: FakeNode;
let SiteHeader: () => ReactElement;
let navigate: (to: string) => void;

beforeAll(async () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = globalThis as any;
  g.document = doc;
  g.window = globalThis;
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
  g.HTMLIFrameElement = class {};
  doc.body = new FakeNode('body', doc);
  doc.activeElement = doc.body;
  doc.defaultView = globalThis;
  g.IS_REACT_ACT_ENVIRONMENT = true;
  // theme.ts and router.tsx read window at import time, so import after the stand-in is in place.
  ({ navigate } = await import('./router'));
  ({ SiteHeader } = await import('./SiteLayout'));
});

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
});
