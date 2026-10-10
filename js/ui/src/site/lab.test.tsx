import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Datum, useCountUp } from './lab';

/**
 * `useCountUp` drives every live number on the site, and `Datum` paints the measured values the offerings are
 * sold on - a wrong tone or a count that never starts is a product defect. vitest runs in node here (no jsdom /
 * @testing-library in the lockfile, dependencies are Tier 2), so - as in Reveal.test.tsx - a minimal DOM stand-in
 * lets the real React tree mount, with hand-written matchMedia / requestAnimationFrame / IntersectionObserver.
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
  /** all text below this node, in document order (React sets `textContent` on text nodes and single-text hosts) */
  text(): string {
    if (this.nodeType === 3) return this.textContent;
    return this.textContent + this.children.map((c) => c.text()).join('');
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
const observers: { cb: IOCallback }[] = [];
class FakeIntersectionObserver {
  constructor(cb: IOCallback) {
    observers.push({ cb });
  }
  observe() {}
  disconnect() {}
  unobserve() {}
}

let reducedMotion = false;
/** frames requested since the last reset; the queued callbacks are never run unless a test runs them */
let frames: FrameRequestCallback[] = [];
let now = 0;
let root: Root | null = null;
let container: FakeNode;

beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = globalThis as any;
  g.document = doc;
  g.window = globalThis;
  g.IntersectionObserver = FakeIntersectionObserver;
  g.matchMedia = (q: string) => ({ matches: q.includes('prefers-reduced-motion') && reducedMotion });
  g.requestAnimationFrame = (cb: FrameRequestCallback) => frames.push(cb);
  g.cancelAnimationFrame = () => {};
  g.performance = { now: () => now };
  g.HTMLIFrameElement = class {};
  doc.body = new FakeNode('body', doc);
  doc.activeElement = doc.body;
  doc.defaultView = globalThis;
  g.IS_REACT_ACT_ENVIRONMENT = true;
});

beforeEach(() => {
  observers.length = 0;
  frames = [];
  now = 0;
  reducedMotion = false;
});

afterEach(() => {
  if (root) act(() => root!.unmount());
  root = null;
});

function render(ui: React.ReactElement) {
  container = new FakeNode('div', doc);
  root = createRoot(container as unknown as Element);
  act(() => root!.render(ui));
  return container;
}

/** Renders the raw hook value into a <span>, so the test reads it like a user would. */
function Probe({ target, on, duration }: { target: number; on: boolean; duration?: number }) {
  const v = useCountUp(target, on, duration);
  return <span>{String(v)}</span>;
}

const probeValue = () => Number(container.children[0].text());

describe('useCountUp (numbers ease from 0 to the target once they are on; reduced motion jumps straight there)', () => {
  it('stays at 0 while `on` is false, and requests no frames', () => {
    render(<Probe target={42} on={false} />);
    expect(probeValue()).toBe(0);
    expect(frames).toHaveLength(0);
    act(() => root!.render(<Probe target={42} on={false} />));
    expect(probeValue()).toBe(0);
    expect(frames).toHaveLength(0);
  });

  it('starts at the target when reduced motion is set, even before `on`', () => {
    reducedMotion = true;
    render(<Probe target={42} on={false} />);
    expect(probeValue()).toBe(42);
    expect(frames).toHaveLength(0);
  });

  it('jumps straight to the target with no animation frames once `on` is true under reduced motion', () => {
    render(<Probe target={42} on={false} />);
    expect(probeValue()).toBe(0);
    reducedMotion = true;
    act(() => root!.render(<Probe target={42} on={true} />));
    expect(probeValue()).toBe(42);
    expect(frames).toHaveLength(0);
  });

  it('eases through animation frames and lands exactly on the target when motion is allowed', () => {
    render(<Probe target={100} on={false} duration={1000} />);
    act(() => root!.render(<Probe target={100} on={true} duration={1000} />));
    expect(frames).toHaveLength(1);
    now = 500;
    act(() => frames.shift()!(now));
    const mid = probeValue();
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(100);
    expect(frames).toHaveLength(1);
    now = 1000;
    act(() => frames.shift()!(now));
    expect(probeValue()).toBe(100);
    expect(frames).toHaveLength(0);
  });
});

describe('Datum (a measured value: mono key, display numeral, tone by `ok`)', () => {
  it('renders the key label and paints a failing value with text-warning', () => {
    const el = render(<Datum k="Latency" value={42} ok={false} />);
    const key = el.find((n) => n.className.includes('mono-label'));
    expect(key?.text()).toBe('Latency');
    const value = el.find((n) => n.className.includes('datum-value'));
    expect(value).not.toBeNull();
    expect(value!.className.split(/\s+/)).toContain('text-warning');
    expect(value!.className.split(/\s+/)).not.toContain('text-success');
    // not yet scrolled into view: the numeral sits at 0 until the observer fires
    expect(value!.text()).toBe('0');
  });

  it('counts to the value once it scrolls into view (reduced motion), and paints a passing value text-success', () => {
    reducedMotion = true;
    const el = render(<Datum k="Accuracy" value={97} ok={true} format={(v) => `${Math.round(v)}%`} />);
    const value = el.find((n) => n.className.includes('datum-value'))!;
    expect(value.className.split(/\s+/)).toContain('text-success');
    expect(value.text()).toBe('97%');
  });

  it('shows `text` instead of a number and no tone when `ok` is omitted', () => {
    const el = render(<Datum k="Format" text="gguf" sub="quantised" />);
    const value = el.find((n) => n.className.includes('datum-value'))!;
    expect(value.text()).toBe('gguf');
    expect(value.className.split(/\s+/)).not.toContain('text-warning');
    expect(value.className.split(/\s+/)).not.toContain('text-success');
    expect(el.text()).toContain('quantised');
  });
});
