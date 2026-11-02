/**
 * The static `<head>` of each page, as plain strings with no React and no data import, so both the app (Site.tsx,
 * which keeps the head in step on client-side navigation) and the build (vite.config.ts, which prerenders a page per
 * route) read the same words. Link unfurlers that run no JavaScript (Slack, X, LinkedIn, iMessage) only ever see the
 * file the host serves, so a route that should preview as itself needs its own file with its own head.
 */
export const HOME_TITLE = 'Lamplit Labs AI - models you can host yourself';
export const HOME_DESCRIPTION =
  'Lamplit Labs AI builds small, specialised models you host yourself - in a browser, on a laptop, on-prem, in your private cloud, in your app or on the edge. Your data never leaves.';

/**
 * Routes served from their own prerendered copy of index.html (`file` in dist/, rewritten to by vercel.json and
 * scripts/preview-static.mjs): the same app, with the route's title, description and og:url in the static head.
 */
export const PAGE_HEADS = {
  '/models': {
    file: 'models.html',
    title: 'Offerings - Lamplit Labs AI',
    description:
      'The models Lamplit Labs AI offers to host yourself: each line with its editions for where it runs, its licence and whether it passed its release gate.',
  },
  '/benchmarks': {
    file: 'benchmarks.html',
    title: 'Benchmarks - Lamplit Labs AI',
    description:
      'The numbers behind every Lamplit Labs AI model: a fixed suite of learner scenarios run on each edition, scored by independent frontier-model judges.',
  },
} as const;

const escapeAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Replace the one match of `pattern` in `html`; a missing or repeated tag fails the build instead of shipping the home head. */
function replaceOnce(html: string, pattern: RegExp, value: string, what: string): string {
  const hits = html.match(new RegExp(pattern.source, 'g'))?.length ?? 0;
  if (hits !== 1) throw new Error(`routePageHtml: expected one ${what} in index.html, found ${hits}`);
  return html.replace(pattern, (_m, open: string, close: string) => `${open}${value}${close}`);
}

/**
 * index.html rewritten for `route`: `<title>`, the description and their og:/twitter: mirrors carry the route's own
 * words, and og:url its own URL (index.html's og:url, the home URL, plus the path - the URL `canonicalFor` gives).
 * Everything else, the app's script and styles included, is index.html unchanged.
 */
export function routePageHtml(indexHtml: string, route: keyof typeof PAGE_HEADS): string {
  const { title, description } = PAGE_HEADS[route];
  const home = indexHtml.match(/<meta property="og:url" content="([^"]*)"/)?.[1];
  if (!home || !home.endsWith('/')) throw new Error('routePageHtml: index.html has no og:url ending in /');
  const meta = (attr: 'name' | 'property', key: string) => new RegExp(`(<meta ${attr}="${key}" content=")[^"]*(")`);
  let html = replaceOnce(indexHtml, /(<title>)[^<]*(<\/title>)/, escapeAttr(title), '<title>');
  for (const [attr, key, value] of [
    ['name', 'description', description],
    ['property', 'og:url', `${home}${route.slice(1)}`],
    ['property', 'og:title', title],
    ['property', 'og:description', description],
    ['name', 'twitter:title', title],
    ['name', 'twitter:description', description],
  ] as const) {
    html = replaceOnce(html, meta(attr, key), escapeAttr(value), `<meta ${attr}="${key}">`);
  }
  return html;
}
