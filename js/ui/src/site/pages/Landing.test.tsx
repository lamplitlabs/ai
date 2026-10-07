import { describe, expect, it } from 'vitest';
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
  it('shows no warning when the data is fresh', () => {
    const now = new Date(generated.getTime() + 2 * 86_400_000);
    const html = renderToStaticMarkup(<Landing now={now} />);
    expect(html).not.toContain('may be stale');
  });
});
