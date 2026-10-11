/**
 * A minimal DOM stand-in for the site's component tests.
 *
 * vitest runs in node here (no jsdom / @testing-library in the lockfile, dependencies are Tier 2), so these few node
 * methods - the ones react-dom/client actually calls - let a real React tree mount and real handlers run. The three
 * render tests (LampToggle, SiteLayout, Reveal) used to carry their own copy of this; keep additions here so every
 * component test meets the same React 19 host requirements.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export class FakeNode {
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
  get className() {
    return this.attrs.class ?? '';
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

/** A document stand-in whose `documentElement.classList` really records classes, so theme.ts can be observed. */
function createFakeDocument(): any {
  const htmlClasses = new Set<string>();
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
    classList: {
      toggle: (c: string, on: boolean) => (on ? htmlClasses.add(c) : htmlClasses.delete(c)),
      contains: (c: string) => htmlClasses.has(c),
    },
  });
  doc.body = new FakeNode('body', doc);
  doc.activeElement = doc.body;
  doc.defaultView = globalThis;
  return doc;
}

/**
 * Install `doc` as the global document/window and the few globals react-dom/client checks on mount. Call from
 * `beforeAll` before importing modules (theme.ts, router.tsx) that read `window` at import time; test-specific
 * globals (localStorage, matchMedia, location, IntersectionObserver) stay with the test that needs them.
 */
export function installFakeDom(doc: any = createFakeDocument()): any {
  const g = globalThis as any;
  g.document = doc;
  g.window = globalThis;
  g.HTMLIFrameElement = class {};
  g.IS_REACT_ACT_ENVIRONMENT = true;
  return doc;
}

/** The React props react-dom attaches to a host node, so a click can be dispatched without a real event system. */
export function clickHandlerOf(node: FakeNode): ((e?: unknown) => void) | undefined {
  const key = Object.keys(node).find((k) => k.startsWith('__reactProps$'));
  return key ? (node as any)[key]?.onClick : undefined;
}
