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
