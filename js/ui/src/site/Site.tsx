import { useEffect } from 'react';
import { SiteLayout } from './SiteLayout';
import { Link, useRoute } from './router';
import { TryLink } from './TryLink';
import { SITE_URL, flagship, tryLabel, tryUrl } from './data';
import { Landing, primaryCta } from './pages/Landing';
import { Models } from './pages/Models';
import { Benchmarks } from './pages/Benchmarks';

const TITLES: Record<string, string> = {
  '/': 'Lamplit Labs AI - models you can host yourself',
  '/models': 'Offerings - Lamplit Labs AI',
  '/benchmarks': 'Benchmarks - Lamplit Labs AI',
  '/try': `${tryLabel()} - Lamplit Labs AI`,
};

/** Tab title for a route; an unknown path gets a "Not found" title instead of keeping the home page's. */
export function titleFor(route: string): string {
  return TITLES[route] ?? 'Not found - Lamplit Labs AI';
}

const HOME_DESCRIPTION =
  'Lamplit Labs AI builds small, specialised models you host yourself - in a browser, on a laptop, on-prem, in your private cloud, in your app or on the edge. Your data never leaves.';
/**
 * Routes whose page holds something other than the home pitch, so a search result or a link-share card for that
 * link previews what it opens on: the offerings list and the measured numbers. Any other known route uses the home pitch.
 */
const ROUTE_DESCRIPTIONS: Record<string, string> = {
  '/models':
    'The models Lamplit Labs AI offers to host yourself: each line with its editions for where it runs, its licence and whether it passed its release gate.',
  '/benchmarks':
    'The numbers behind every Lamplit Labs AI model: a fixed suite of learner scenarios run on each edition, scored by independent frontier-model judges.',
};

const NOT_FOUND_DESCRIPTION =
  'That page does not exist on Lamplit Labs AI. The home page lists the small, specialised models you can host yourself, with the numbers they were measured on.';

/**
 * Meta description for a route: the offerings and the numbers describe themselves, other known routes get the home
 * page's pitch, and an unknown path says the page is missing instead of repeating that pitch.
 */
export function descriptionFor(route: string): string {
  if (!(route in TITLES)) return NOT_FOUND_DESCRIPTION;
  return ROUTE_DESCRIPTIONS[route] ?? HOME_DESCRIPTION;
}

/**
 * `<meta name=robots>` for a route. The host answers every path with the app and HTTP 200 (vercel.json SPA rewrite),
 * so an unknown path carries `noindex` to tell crawlers the page is missing; known routes carry no robots meta.
 */
export function robotsFor(route: string): string | null {
  return route in TITLES ? null : 'noindex';
}

/** The routes public/sitemap.xml lists (scripts/sitemap.mjs): the pages a crawler should index under their own URL. */
const CANONICAL_ROUTES = new Set(['/', '/models', '/benchmarks']);

/**
 * Canonical URL of a route, written like a sitemap.xml `<loc>` (`SITE_URL` plus the path), so a search result or a
 * link-share card for /models or /benchmarks resolves to that page instead of the home page, and `/models/` or
 * `/models?theme=dark` fold into one URL. `/try` (moved to its Hugging Face Space) and an unknown path have none.
 */
export function canonicalFor(route: string): string | null {
  return CANONICAL_ROUTES.has(route) ? `${SITE_URL}${route.slice(1)}` : null;
}

/**
 * Keep `<link rel=canonical>` and og:url in sync with `canonicalFor(route)`: the link is added or updated for a
 * canonical route and removed otherwise, and og:url falls back to the home URL that index.html ships.
 */
export function setCanonical(url: string | null): void {
  let link = document.querySelector('link[rel="canonical"]');
  if (url === null) {
    link?.remove();
  } else {
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }
  document.querySelector('meta[property="og:url"]')?.setAttribute('content', url ?? SITE_URL);
}

/** Add, update or remove `<meta name=robots>` so the DOM matches `robotsFor(route)`. */
function setRobots(robots: string | null): void {
  let el = document.querySelector('meta[name="robots"]');
  if (robots === null) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', 'robots');
    document.head.appendChild(el);
  }
  el.setAttribute('content', robots);
}

/**
 * Keep document.title and its og:/twitter: mirrors in sync with the route. index.html ships the home title in all
 * three, so without this a JavaScript-rendering crawler or link unfurler opening /models or /benchmarks would read
 * the right tab title but still preview the page under the home title.
 */
export function setTitle(title: string): void {
  document.title = title;
  for (const [attr, key] of [
    ['property', 'og:title'],
    ['name', 'twitter:title'],
  ] as const) {
    document.querySelector(`meta[${attr}="${key}"]`)?.setAttribute('content', title);
  }
}

/** Keep `<meta name=description>` and the og:/twitter: mirrors in sync with the route, like the title. */
function setDescription(description: string): void {
  for (const [attr, key] of [
    ['name', 'description'],
    ['property', 'og:description'],
    ['name', 'twitter:description'],
  ] as const) {
    document.querySelector(`meta[${attr}="${key}"]`)?.setAttribute('content', description);
  }
}

function NotFound() {
  return (
    <section className="hero-lamplight lab-grid pt-14">
      <div className="mx-auto max-w-3xl px-5 py-32 text-center">
        <div className="mono-label text-muted-foreground">status · 404</div>
        <div className="font-display mt-4 text-7xl font-semibold text-primary sm:text-8xl">404</div>
        <h1 className="font-display mt-4 text-3xl font-semibold">Nothing lit here</h1>
        <p className="mt-3 text-muted-foreground">That page does not exist. The lamp is back on the home page.</p>
        <Link to="/" className={`${primaryCta} mt-8`}>
          Back home
        </Link>
      </div>
    </section>
  );
}

/**
 * `/try` once served a model in the page. Models now ship only to their Hugging Face Spaces (ADR-001), so an old link
 * lands here and is sent on; vercel.json answers the same path with a redirect before the app even loads.
 */
function TryMoved() {
  const href = tryUrl(flagship);
  const line = flagship?.line ?? '';
  useEffect(() => {
    if (href) window.location.replace(href);
  }, [href]);
  return (
    <section className="hero-lamplight lab-grid pt-14">
      <div className="mx-auto max-w-3xl px-5 py-32 text-center">
        <div className="mono-label text-muted-foreground">status · moved</div>
        <h1 className="font-display mt-4 text-3xl font-semibold">{flagship ? `The ${line} runs on Hugging Face` : 'Nothing to try yet'}</h1>
        <p className="mt-3 text-muted-foreground">{href ? 'Taking you there now. ' : ''}{flagship?.browser ? 'It runs entirely in your browser - the weights download once and every answer is computed on your machine.' : 'Its demo runs there.'}</p>
        <TryLink className={`${primaryCta} mt-8`}>{flagship ? `Open the ${line}` : 'See the offerings'}</TryLink>
      </div>
    </section>
  );
}

export function Site() {
  const route = useRoute();
  useEffect(() => {
    setTitle(titleFor(route));
    setDescription(descriptionFor(route));
    setCanonical(canonicalFor(route));
    setRobots(robotsFor(route));
    document.body.dataset.route = route;
  }, [route]);
  return <SiteLayout>{route === '/' ? <Landing /> : route === '/models' ? <Models /> : route === '/benchmarks' ? <Benchmarks /> : route === '/try' ? <TryMoved /> : <NotFound />}</SiteLayout>;
}
