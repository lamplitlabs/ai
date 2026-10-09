import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Vercel serves public/404.html for paths vercel.json does not rewrite, so a visitor on a typo'd URL sees the
// site's own page instead of the generic Vercel one. A rewrite of public/ must not drop it or its way home.
const path = fileURLToPath(new URL('../../public/404.html', import.meta.url));

describe('public/404.html', () => {
  it('exists, is branded Lamplit Labs, and links back to "/"', () => {
    expect(existsSync(path), 'public/404.html is missing').toBe(true);
    const html = readFileSync(path, 'utf8');
    expect(html).toMatch(/<title>[^<]*404[^<]*Lamplit Labs/);
    expect(html).toMatch(/<a[^>]*\shref="\/"[^>]*>/);
  });
});

// vercel.json must send every path that is not one of the three SPA routes to 404.html with a real 404 status,
// so a typo'd URL is reported as missing (to browsers, crawlers and link checkers) instead of a 200 home page.
describe('vercel.json unknown-route fallback', () => {
  const vercel = JSON.parse(readFileSync(fileURLToPath(new URL('../../vercel.json', import.meta.url)), 'utf8'));
  const rewrites: Array<{ source: string; destination: string; statusCode?: number }> = vercel.rewrites;

  it('keeps /models and /benchmarks on index.html (/ is the file itself)', () => {
    for (const route of ['/models', '/benchmarks']) {
      const rule = rewrites.find((r) => r.source === route);
      expect(rule?.destination, `${route} rewrite`).toBe('/index.html');
      expect(rule?.statusCode).toBeUndefined();
    }
  });

  it('ends with a catch-all that serves /404.html with status 404', () => {
    const last = rewrites[rewrites.length - 1];
    expect(last).toEqual({ source: '/(.*)', destination: '/404.html', statusCode: 404 });
  });
});
