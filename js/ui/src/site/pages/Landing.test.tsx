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
