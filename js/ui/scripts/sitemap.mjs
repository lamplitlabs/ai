// Writes public/sitemap.xml from src/data/site.json: <lastmod> is the data's generated_at date, never hand-typed.
// Run `node scripts/sitemap.mjs` after site.json changes; src/site/sitemap.test.ts fails when the file drifts.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const site = JSON.parse(readFileSync(new URL('src/data/site.json', root), 'utf8'));
const lastmod = String(site.generated_at).slice(0, 10);
const SITE_URL = 'https://ai.lamplitlabs.com/';
const routes = ['', 'models', 'benchmarks'];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map((r) => `  <url>\n    <loc>${SITE_URL}${r}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`).join('\n')}
</urlset>
`;
writeFileSync(new URL('public/sitemap.xml', root), xml);
console.log(`sitemap.xml: ${routes.length} urls, lastmod ${lastmod}`);
