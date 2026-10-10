import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Reveal } from './Reveal';

/**
 * <Reveal> hides a block until it scrolls into view, which is only safe when the IntersectionObserver really
 * flips it to `visible` - otherwise the page stays blank. vitest runs in node here (no jsdom / @testing-library
 * in the lockfile, dependencies are Tier 2), so - as in LampToggle.test.tsx and SiteLayout.test.tsx - a minimal
 * DOM stand-in lets the real React tree mount, and a hand-written IntersectionObserver / matchMedia stand in
 * for the browser.
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
  get className() {
    return this.attrs.class ?? '';
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
doc.documentElement = new FakeNode('html', doc);

type IOCallback = (entries: { isIntersecting: boolean }[]) => void;
/** The observers the component created, in order, so a test can fire their callbacks by hand. */
const observers: { cb: IOCallback; observed: unknown[]; disconnected: boolean; options: unknown }[] = [];
class FakeIntersectionObserver {
  private rec: (typeof observers)[number];
  constructor(cb: IOCallback, options?: unknown) {
    this.rec = { cb, observed: [], disconnected: false, options };
    observers.push(this.rec);
  }
  observe(el: unknown) {
    this.rec.observed.push(el);
  }
  disconnect() {
    this.rec.disconnected = true;
  }
  unobserve() {}
}

let reducedMotion = false;
let root: Root | null = null;
let container: FakeNode;

beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = globalThis as any;
  g.document = doc;
  g.window = globalThis;
  g.IntersectionObserver = FakeIntersectionObserver;
  g.matchMedia = (q: string) => ({ matches: q.includes('prefers-reduced-motion') && reducedMotion });
  g.HTMLIFrameElement = class {};
  doc.body = new FakeNode('body', doc);
  doc.activeElement = doc.body;
  doc.defaultView = globalThis;
  g.IS_REACT_ACT_ENVIRONMENT = true;
});

beforeEach(() => {
  observers.length = 0;
  reducedMotion = false;
});

afterEach(() => {
  if (root) act(() => root!.unmount());
  root = null;
});

function mount(props: Partial<Parameters<typeof Reveal>[0]> = {}) {
  container = new FakeNode('div', doc);
  root = createRoot(container as unknown as Element);
  act(() =>
    root!.render(
      <Reveal {...props}>
        <p>hello</p>
      </Reveal>,
    ),
  );
  const el = container.children[0];
  if (!el) throw new Error('Reveal rendered nothing');
  return el;
}

const classes = (el: FakeNode) => el.className.split(/\s+/).filter(Boolean);

describe('Reveal (blocks stay hidden until they scroll into view, never for reduced-motion users)', () => {
  it('starts without `visible` while the IntersectionObserver has not fired, and observes its own element', () => {
    const el = mount();
    expect(classes(el)).toContain('reveal');
    expect(classes(el)).not.toContain('visible');
    expect(observers).toHaveLength(1);
    expect(observers[0].observed).toEqual([el]);
    expect(observers[0].options).toEqual({ threshold: 0.12 });
  });

  it('gains `visible` once the observer reports isIntersecting, then disconnects and stays visible', () => {
    const el = mount();
    act(() => observers[0].cb([{ isIntersecting: false }]));
    expect(classes(el)).not.toContain('visible');
    act(() => observers[0].cb([{ isIntersecting: false }, { isIntersecting: true }]));
    expect(classes(el)).toContain('visible');
    expect(observers[0].disconnected).toBe(true);
    // a later "left the viewport" report does not hide it again
    act(() => observers[0].cb([{ isIntersecting: false }]));
    expect(classes(el)).toContain('visible');
  });

  it('is visible immediately (no observer) when prefers-reduced-motion is set', () => {
    reducedMotion = true;
    const el = mount();
    expect(classes(el)).toContain('visible');
    expect(observers).toHaveLength(0);
  });

  it('honours `stagger`, `as` and `id`, and keeps the caller className', () => {
    const el = mount({ stagger: true, as: 'section', id: 'offers', className: 'grid' });
    expect(el.nodeName).toBe('SECTION');
    expect(el.attrs.id).toBe('offers');
    expect(classes(el)).toContain('reveal-stagger');
    expect(classes(el)).toContain('grid');
    expect(classes(el)).not.toContain('visible');
  });
});
