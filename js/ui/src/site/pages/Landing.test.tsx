import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Landing } from './Landing';
import { CONTACT } from '../SiteLayout';
import { STALE_AFTER_DAYS, commissionMailto, siteData } from '../data';

/** The closing "Have a job for a model?" CTA must arrive with a subject, like the model-request and nav mailtos,
 *  so Lamplit can tell a landing-page enquiry from a blank email. */
describe('Landing contact CTA', () => {
  it('prefills the mailto subject', () => {
    const html = renderToStaticMarkup(<Landing />);
    const expectedHref = commissionMailto().replace(/&/g, '&amp;').replace(/'/g, '&#x27;');
    expect(html).toContain(`href="${expectedHref}"`);
    expect(html).not.toContain(`href="mailto:${CONTACT}"`);
  });
});

/** A visitor must be able to tell at a glance whether the measurements are current: past STALE_AFTER_DAYS the
 *  "data … UTC" line says how old the data set is; fresh data shows the timestamp alone. */
describe('Landing data freshness', () => {
  const generated = new Date(siteData.generated_at);
  it('warns when generated_at is older than the threshold', () => {
    const now = new Date(generated.getTime() + (STALE_AFTER_DAYS + 30) * 86_400_000);
    const html = renderToStaticMarkup(<Landing now={now} />);
    expect(html).toContain(`${STALE_AFTER_DAYS + 30} days old - may be stale`);
  });
  it('announces the stale warning to screen readers via a polite live region', () => {
    const now = new Date(generated.getTime() + (STALE_AFTER_DAYS + 30) * 86_400_000);
    const html = renderToStaticMarkup(<Landing now={now} />);
    const span = html.match(/<span[^>]*data-testid="data-age"[^>]*>/);
    expect(span, 'data-age span missing').not.toBeNull();
    expect(span![0]).toContain('aria-live="polite"');
    expect(span![0]).toContain('role="status"');
  });
  it('adds no live region when the data is fresh', () => {
    const now = new Date(generated.getTime() + 2 * 86_400_000);
    const html = renderToStaticMarkup(<Landing now={now} />);
    const span = html.match(/<span[^>]*data-testid="data-age"[^>]*>/);
    expect(span, 'data-age span missing').not.toBeNull();
    expect(span![0]).not.toContain('aria-live');
    expect(span![0]).not.toContain('role=');
  });
  it('repeats the stale warning next to the hero CTA so a visitor sees it before clicking through', () => {
    const now = new Date(generated.getTime() + (STALE_AFTER_DAYS + 30) * 86_400_000);
    const html = renderToStaticMarkup(<Landing now={now} />);
    const hero = html.match(/<p[^>]*data-testid="hero-data-age"[^>]*>([^<]*)<\/p>/);
    expect(hero, 'hero-data-age note missing').not.toBeNull();
    expect(hero![1]).toContain(`measured ${STALE_AFTER_DAYS + 30} days ago`);
    expect(html.indexOf('data-testid="hero-data-age"')).toBeLessThan(html.indexOf('data-testid="data-age"'));
  });
  it('shows no hero warning when the data is fresh', () => {
    const now = new Date(generated.getTime() + 2 * 86_400_000);
    const html = renderToStaticMarkup(<Landing now={now} />);
    expect(html).not.toContain('hero-data-age');
  });
  it('shows no warning when the data is fresh', () => {
    const now = new Date(generated.getTime() + 2 * 86_400_000);
    const html = renderToStaticMarkup(<Landing now={now} />);
    expect(html).not.toContain('may be stale');
  });
});

/** A visitor requests a non-public edition straight from the landing, as /models already allows, instead of
 *  opening the datasheet first: every non-public offering card carries a prefilled "Request this edition" mailto. */
describe('Landing non-public offerings', () => {
  it('server-renders a "Request this edition" mailto on each non-public card and none on public ones', async () => {
    vi.resetModules();
    vi.doMock('../data', async () => {
      const real = await vi.importActual<typeof import('../data')>('../data');
      const showcase = real.showcaseModels.map((m, i) => (i === 0 ? { ...m, hub: { ...m.hub, public: false } } : m));
      const lines = [...new Set(showcase.map((m) => m.line))].map((line) => ({ line, editions: showcase.filter((m) => m.line === line) }));
      return { ...real, showcaseModels: showcase, lines };
    });
    const { Landing: MockedLanding } = await import('./Landing');
    const { lines, mailtoFor } = await import('../data');
    const html = renderToStaticMarkup(<MockedLanding />);
    const privates = lines.flatMap((l) => l.editions).filter((m) => !m.hub.public);
    expect(privates.length).toBeGreaterThan(0);
    expect(html.match(/data-testid="request-edition"/g)?.length).toBe(privates.length);
    for (const m of privates) {
      expect(html).toContain(`href="${mailtoFor(m).split('&')[0]}&amp;body=`);
    }
    expect(html).toContain('Request this edition');
    vi.doUnmock('../data');
    vi.resetModules();
  });
});

/** The hero's "download" datum and the flagship's offering card must quote the same file - the smallest export, the one a
 *  visitor actually fetches - whatever order the producer lists the dtypes in. Reduced motion makes the datum render its
 *  final number instead of the count-up's starting 0. */
describe('Landing download matches the flagship offering card', () => {
  for (const order of ['larger dtype first', 'reversed: smaller dtype first'] as const) {
    it(`hero and card name the same dtype and size with the ${order}`, async () => {
      vi.resetModules();
      vi.doMock('../data', async () => {
        const real = await vi.importActual<typeof import('../data')>('../data');
        const f = real.flagship!;
        const bySize = [...f.dtypes].sort((a, b) => b.size_mb - a.size_mb);
        const flipped = { ...f, dtypes: order === 'larger dtype first' ? bySize : bySize.reverse() };
        const showcase = real.showcaseModels.map((m) => (m.name === f.name ? flipped : m));
        const lines = [...new Set(showcase.map((m) => m.line))].map((line) => ({ line, editions: showcase.filter((m) => m.line === line) }));
        return { ...real, flagship: flipped, showcaseModels: showcase, lines };
      });
      const { Landing: MockedLanding } = await import('./Landing');
      const { exportFidelity, flagship, gb, weightsSpec } = await import('../data');
      // stubbed after the imports: the router subscribes to window events at module load
      vi.stubGlobal('window', { matchMedia: (q: string) => ({ matches: q.includes('prefers-reduced-motion') }) });
      try {
        const f = flagship!;
        const sizes = new Set(f.dtypes.map((d) => d.size_mb));
        expect(sizes.size, 'the flagship needs two dtypes of different sizes for the order to matter').toBeGreaterThan(1);
        const smallest = f.dtypes.reduce((a, b) => (b.size_mb < a.size_mb ? b : a));
        if (order === 'larger dtype first') expect(f.dtypes[0].size_mb).toBeGreaterThan(smallest.size_mb);

        const html = renderToStaticMarkup(<MockedLanding />);
        const hero = html.match(/>download<\/div><div class="datum-value[^"]*">([^<]*)<\/div><div[^>]*>([^<]*)<\/div>/);
        expect(hero, 'hero download datum missing').not.toBeNull();
        expect(hero![1]).toBe(gb(smallest.size_mb));
        expect(hero![2].startsWith(`${smallest.dtype} · `)).toBe(true);

        // the flagship's row in the comparison table and its offering card quote the same size
        const row = html.slice(html.indexOf(`data-testid="compare-${f.name}"`));
        const cells = row.slice(0, row.indexOf('</tr>'));
        expect(cells).toContain(`>${gb(smallest.size_mb)}<`);
        // ... and every one of them carries that same export's fidelity, never another dtype's
        const fidelity = exportFidelity(f, smallest.dtype);
        expect(fidelity, 'the smallest export needs a measured fidelity for this test').not.toBeNull();
        const shown = `${(fidelity! * 100).toFixed(1)}%`;
        const heroFidelity = html.match(/>export fidelity<\/div><div class="datum-value[^"]*">([^<]*)<\/div><div[^>]*>([^<]*)<\/div>/);
        expect(heroFidelity, 'hero export fidelity datum missing').not.toBeNull();
        expect(heroFidelity![1]).toBe(shown);
        expect(heroFidelity![2].startsWith(`${smallest.dtype} file agrees with the trained weights`)).toBe(true);
        expect(cells).toContain(`${smallest.dtype} · fidelity <span`);
        expect(cells).toContain(`>${shown}</span>`);
        if (f.hub.public) expect(weightsSpec(f, true)).toContain(`· fidelity ${shown} ·`);
        if (f.hub.public) expect(html).toContain(weightsSpec(f, true));
        expect(weightsSpec(f, true).startsWith(`${smallest.dtype} · ${gb(smallest.size_mb)} · `)).toBe(true);
      } finally {
        vi.unstubAllGlobals();
        vi.doUnmock('../data');
        vi.resetModules();
      }
    });
  }
});

/** The hero's download datum quotes the smallest export (q4), so its export-fidelity datum must be that file's own
 *  number (83.3%, below the 95% bar and toned so) - not q8's 95.8% - and say which file it measured. */
describe('Landing hero export fidelity follows the download', () => {
  it('shows q4 83.3% beside the q4 download, toned below the bar', () => {
    vi.stubGlobal('window', { matchMedia: (q: string) => ({ matches: q.includes('prefers-reduced-motion') }) });
    try {
      const html = renderToStaticMarkup(<Landing />);
      const fidelity = html.match(/>export fidelity<\/div><div class="datum-value[^"]*text-(success|warning)[^"]*">([^<]*)<\/div><div[^>]*>([^<]*)<\/div>/);
      const download = html.match(/>download<\/div><div class="datum-value[^"]*">([^<]*)<\/div><div[^>]*>([^<]*)<\/div>/);
      expect(fidelity, 'hero export fidelity datum missing or untoned').not.toBeNull();
      expect(download![2].startsWith('q4 · ')).toBe(true);
      expect(fidelity![2]).toBe('83.3%');
      expect(fidelity![1]).toBe('warning');
      expect(fidelity![3]).toBe('q4 file agrees with the trained weights · under the 95% bar');
      expect(html).not.toContain('q8 file agrees');
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
