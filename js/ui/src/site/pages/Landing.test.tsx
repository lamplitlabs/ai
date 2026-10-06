import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Landing } from './Landing';
import { CONTACT } from '../SiteLayout';

/** The closing "Have a job for a model?" CTA must arrive with a subject, like the model-request and nav mailtos,
 *  so Lamplit can tell a landing-page enquiry from a blank email. */
describe('Landing contact CTA', () => {
  it('prefills the mailto subject', () => {
    const html = renderToStaticMarkup(<Landing />);
    const subject = encodeURIComponent('A job for a model');
    expect(html).toContain(`href="mailto:${CONTACT}?subject=${subject}"`);
    expect(html).not.toContain(`href="mailto:${CONTACT}"`);
  });
});
