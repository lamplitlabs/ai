import { useEffect } from 'react';
import { SiteLayout } from './SiteLayout';
import { Link, useRoute } from './router';
import { TryLink } from './TryLink';
import { flagship, tryLabel, tryUrl } from './data';
import { Landing, primaryCta } from './pages/Landing';
import { Models } from './pages/Models';
import { Benchmarks } from './pages/Benchmarks';

const TITLES: Record<string, string> = {
  '/': 'Lamplit Labs AI - models you can host yourself',
  '/models': 'Offerings - Lamplit Labs AI',
  '/benchmarks': 'Benchmarks - Lamplit Labs AI',
  '/try': `${tryLabel()} - Lamplit Labs AI`,
};

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
    document.title = TITLES[route] ?? 'Lamplit Labs AI';
    document.body.dataset.route = route;
  }, [route]);
  return <SiteLayout>{route === '/' ? <Landing /> : route === '/models' ? <Models /> : route === '/benchmarks' ? <Benchmarks /> : route === '/try' ? <TryMoved /> : <NotFound />}</SiteLayout>;
}
