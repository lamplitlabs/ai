import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { OfferingCard } from './Offerings';
import { models } from './data';
import { primaryCta } from './cta';

const PRIMARY_CLASS = `class="${primaryCta}"`;

/** The anchor carrying the primary CTA class, or null when the slot is empty. */
function primaryAnchor(html: string): string | null {
  const i = html.indexOf(PRIMARY_CLASS);
  if (i < 0) return null;
  return html.slice(html.lastIndexOf('<a ', i), html.indexOf('</a>', i));
}

function expectPrimaryCta(html: string, name: string) {
  const anchor = primaryAnchor(html);
  expect(anchor, `${name} has no primary CTA`).not.toBeNull();
  expect(anchor).toMatch(/href="(https?:\/\/|mailto:)[^"]+"/);
  expect(anchor).not.toMatch(/href=""/);
  expect(anchor!.replace(/<[^>]+>/g, '').trim()).not.toBe('');
  expect(anchor).toMatch(/Try it|Weights on Hugging Face|Ask for the weights/);
}

/** Every offering on the landing must carry a primary call to action with a real href - Try it, Weights on
 *  Hugging Face, or Ask for the weights - so no edition ever ships with an empty or href-less CTA slot. */
describe('OfferingCard primary CTA', () => {
  it('has at least one model in site.json', () => {
    expect(models.length).toBeGreaterThan(0);
  });

  for (const m of models) {
    it(`${m.name} renders a non-empty primary CTA with a non-empty href`, () => {
      expectPrimaryCta(renderToStaticMarkup(<OfferingCard m={m} featured={false} />), m.name);
    });
  }

  // Regression for d4038ca: a browser-flagged model whose hub entry has no Space must fall through to the
  // hub/mail CTAs instead of rendering an empty slot or a link without an href.
  for (const m of models) {
    it(`${m.name} as a browser model with no hub.space still has a primary CTA`, () => {
      const { space: _space, ...hub } = m.hub;
      const noSpace = { ...m, browser: true, hub };
      const html = renderToStaticMarkup(<OfferingCard m={noSpace} featured={false} />);
      expectPrimaryCta(html, `${m.name} (browser, no space)`);
      expect(html).not.toContain('>Try it<');
    });
  }
});
