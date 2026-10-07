import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SITE_URL, siteData } from './data';

// Crawlers read public/sitemap.xml as-is. Its <lastmod> used to be hand-typed and drifted from the data the pages
// actually show; it must equal the date of site.json's generated_at (regenerate with `node scripts/sitemap.mjs`).
const xml = readFileSync(fileURLToPath(new URL('../../public/sitemap.xml', import.meta.url)), 'utf8');
const urls = [...xml.matchAll(/<url>\s*<loc>([^<]*)<\/loc>\s*<lastmod>([^<]*)<\/lastmod>\s*<\/url>/g)].map((m) => ({ loc: m[1], lastmod: m[2] }));

describe('public/sitemap.xml', () => {
  it('lists the public routes under the canonical site URL', () => {
    expect(urls.map((u) => u.loc)).toEqual(['', 'models', 'benchmarks'].map((r) => `${SITE_URL}${r}`));
  });

  it('every lastmod is the data generated_at date, not a hand-typed one', () => {
    const expected = siteData.generated_at.slice(0, 10);
    expect(expected).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    for (const u of urls) expect(u.lastmod, u.loc).toBe(expected);
  });
});
