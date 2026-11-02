import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SITE_URL } from './data';
import { canonicalFor, descriptionFor, robotsFor, setCanonical, setTitle, titleFor } from './Site';

// vitest runs in the node environment (no DOM package is installed), so React effects never fire and the server
// renderer always snapshots the '/' route. `titleFor` is the only value the Site effect assigns to document.title,
// so the tab title for an unknown path is asserted through it.
describe('document.title follows the route', () => {
  it('names the home page on /', () => {
    expect(titleFor('/')).toMatch(/^Lamplit Labs AI/);
  });
  it('gives a mistyped URL a Not found title instead of the home page title', () => {
    for (const path of ['/does-not-exist', '/models/typo', '/404']) {
      expect(titleFor(path)).toBe('Not found - Lamplit Labs AI');
      expect(titleFor(path)).not.toBe(titleFor('/'));
    }
  });
});

describe('meta description follows the route', () => {
  it('gives the home page and the try page the home pitch', () => {
    for (const path of ['/', '/try']) expect(descriptionFor(path)).toMatch(/host yourself/);
    expect(descriptionFor('/try')).toBe(descriptionFor('/'));
  });
  it('previews a link to /models with the offerings it lists, not the home pitch', () => {
    const d = descriptionFor('/models');
    expect(d).toMatch(/Lamplit Labs AI/);
    expect(d).toMatch(/models/);
    expect(d).toMatch(/editions/);
    expect(d).not.toBe(descriptionFor('/'));
  });
  it('previews a link to /benchmarks with the numbers it holds, not the home pitch', () => {
    const d = descriptionFor('/benchmarks');
    expect(d).toMatch(/Lamplit Labs AI/);
    expect(d).toMatch(/numbers/);
    expect(d).toMatch(/judges/);
    expect(d).not.toBe(descriptionFor('/'));
    expect(d).not.toBe(descriptionFor('/models'));
  });
  it('keeps every known description short enough for a search snippet', () => {
    for (const path of ['/', '/models', '/benchmarks', '/try']) expect(descriptionFor(path).length).toBeLessThanOrEqual(180);
  });
  it('tells a visitor on a stale or mistyped link that the page is missing instead of repeating the home pitch', () => {
    for (const path of ['/does-not-exist', '/models/typo', '/404']) {
      expect(descriptionFor(path)).toMatch(/does not exist/);
      expect(descriptionFor(path)).not.toBe(descriptionFor('/'));
    }
  });
});

describe('robots meta follows the route', () => {
  it('leaves every known route indexable', () => {
    for (const path of ['/', '/models', '/benchmarks', '/try']) expect(robotsFor(path)).toBeNull();
  });
  it('marks a mistyped URL noindex so a crawler sees the missing page despite the SPA rewrite answering 200', () => {
    for (const path of ['/does-not-exist', '/models/typo', '/404']) expect(robotsFor(path)).toBe('noindex');
  });
});

/**
 * A <head> holding what index.html ships: og:url on the home page and no canonical link, plus any `extra` meta tags,
 * with the node methods setCanonical / setTitle call. vitest has no DOM here, so this stands in for `document`.
 */
function fakeHead(extra: Record<string, string>[] = []) {
  type El = { attrs: Record<string, string>; setAttribute(k: string, v: string): void; getAttribute(k: string): string | null; remove(): void };
  const nodes: El[] = [];
  const el = (attrs: Record<string, string> = {}): El => {
    const e: El = {
      attrs: { ...attrs },
      setAttribute: (k, v) => void (e.attrs[k] = v),
      getAttribute: (k) => e.attrs[k] ?? null,
      remove: () => void nodes.splice(nodes.indexOf(e), 1),
    };
    return e;
  };
  nodes.push(el({ property: 'og:url', content: SITE_URL }));
  for (const attrs of extra) nodes.push(el(attrs));
  const doc = {
    title: '',
    head: { appendChild: (e: El) => (nodes.push(e), e) },
    createElement: () => el(),
    querySelector: (sel: string) => {
      const m = sel.match(/^(?:link|meta)\[(\w+)="([^"]+)"\]$/);
      return (m && nodes.find((n) => n.attrs[m[1]] === m[2])) ?? null;
    },
  };
  const canonicalHref = () => doc.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null;
  const ogUrl = () => doc.querySelector('meta[property="og:url"]')?.getAttribute('content') ?? null;
  const meta = (attr: string, key: string) => doc.querySelector(`meta[${attr}="${key}"]`)?.getAttribute('content') ?? null;
  return { doc, canonicalHref, ogUrl, meta, count: () => nodes.length };
}

// index.html ships the home title in <title>, og:title and twitter:title. A JavaScript-rendering crawler or link
// unfurler that opens /models or /benchmarks reads the head after the Site effect has run, so setTitle has to move all
// three to the route's title - otherwise the shared link previews as the home page under its own URL and description.
describe('og:title and twitter:title follow the route', () => {
  it('previews /models and /benchmarks under their own title, not the home title, and restores it on /', () => {
    const g = globalThis as { document?: unknown };
    const saved = g.document;
    const home = titleFor('/');
    const head = fakeHead([
      { property: 'og:title', content: home },
      { name: 'twitter:title', content: home },
    ]);
    g.document = head.doc;
    try {
      for (const path of ['/models', '/benchmarks', '/does-not-exist', '/']) {
        setTitle(titleFor(path));
        expect(head.doc.title).toBe(titleFor(path));
        expect(head.meta('property', 'og:title')).toBe(titleFor(path));
        expect(head.meta('name', 'twitter:title')).toBe(titleFor(path));
        if (path !== '/') expect(head.meta('property', 'og:title')).not.toBe(home);
      }
      expect(head.count()).toBe(3); // updated in place - no tag added
    } finally {
      g.document = saved;
    }
  });
});

// Every route renders from one index.html whose og:url names the home page, so without a per-route canonical a shared
// /models or /benchmarks link and its search result fold into the home page. canonicalFor gives each indexable route
// its own URL, the same one public/sitemap.xml lists, and setCanonical writes it into <link rel=canonical> and og:url.
describe('canonical URL follows the route', () => {
  it('gives /models and /benchmarks their own URL under SITE_URL, not the home page', () => {
    expect(canonicalFor('/')).toBe(SITE_URL);
    expect(canonicalFor('/models')).toBe(`${SITE_URL}models`);
    expect(canonicalFor('/benchmarks')).toBe(`${SITE_URL}benchmarks`);
    expect(canonicalFor('/models')).not.toBe(canonicalFor('/'));
    expect(canonicalFor('/benchmarks')).not.toBe(canonicalFor('/'));
  });
  it('matches the <loc> of every URL in public/sitemap.xml, so crawlers see one URL per page', () => {
    const xml = readFileSync(fileURLToPath(new URL('../../public/sitemap.xml', import.meta.url)), 'utf8');
    const locs = [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);
    expect(['/', '/models', '/benchmarks'].map(canonicalFor)).toEqual(locs);
  });
  it('gives /try (moved to its Space) and a mistyped URL no canonical, like their noindex', () => {
    for (const path of ['/try', '/does-not-exist', '/models/typo', '/404']) expect(canonicalFor(path)).toBeNull();
  });

  it('writes the route URL into <link rel=canonical> and og:url, and drops the link on a page without one', () => {
    const g = globalThis as { document?: unknown };
    const saved = g.document;
    const head = fakeHead();
    g.document = head.doc;
    try {
      setCanonical(canonicalFor('/models'));
      expect(head.canonicalHref()).toBe(`${SITE_URL}models`);
      expect(head.ogUrl()).toBe(`${SITE_URL}models`);
      setCanonical(canonicalFor('/benchmarks'));
      expect(head.canonicalHref()).toBe(`${SITE_URL}benchmarks`);
      expect(head.ogUrl()).toBe(`${SITE_URL}benchmarks`);
      expect(head.count()).toBe(2); // one canonical link, updated in place - never a second one
      setCanonical(canonicalFor('/does-not-exist'));
      expect(head.canonicalHref()).toBeNull();
      expect(head.ogUrl()).toBe(SITE_URL);
      setCanonical(canonicalFor('/'));
      expect(head.canonicalHref()).toBe(SITE_URL);
      expect(head.ogUrl()).toBe(SITE_URL);
    } finally {
      g.document = saved;
    }
  });
});
