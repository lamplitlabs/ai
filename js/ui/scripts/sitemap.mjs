// Writes public/sitemap.xml and public/robots.txt from src/data/site.json and src/site/data.ts: <lastmod> is the
// data's generated_at date and the site URL is data.ts's SITE_URL, never hand-typed in either file.
// Runs as the `prebuild` npm script so every build regenerates them (or run `node scripts/sitemap.mjs` by hand);
// src/site/sitemap.test.ts fails when either file drifts.
import { readFileSync, writeFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const site = JSON.parse(readFileSync(new URL('src/data/site.json', root), 'utf8'));
const lastmod = String(site.generated_at).slice(0, 10);
const dataTs = readFileSync(new URL('src/site/data.ts', root), 'utf8');
const SITE_URL = dataTs.match(/^export const SITE_URL = '([^']+)';$/m)?.[1];
if (!SITE_URL || !SITE_URL.endsWith('/')) throw new Error('src/site/data.ts: SITE_URL not found or does not end with /');
const routes = ['', 'models', 'benchmarks'];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map((r) => `  <url>\n    <loc>${SITE_URL}${r}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`).join('\n')}
</urlset>
`;
writeFileSync(new URL('public/sitemap.xml', root), xml);

const robots = `User-agent: *
Allow: /

Sitemap: ${SITE_URL}sitemap.xml
`;
writeFileSync(new URL('public/robots.txt', root), robots);
console.log(`sitemap.xml: ${routes.length} urls, lastmod ${lastmod}; robots.txt: Sitemap ${SITE_URL}sitemap.xml`);
