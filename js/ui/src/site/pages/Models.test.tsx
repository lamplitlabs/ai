import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ModelCard } from './Models';
import { models } from '../data';
import { primaryCta } from '../cta';
import { NOT_MEASURED } from '../data';

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
  expect(anchor!.replace(/<[^>]+>/g, '').trim()).not.toBe('');
  expect(anchor).toMatch(/Try|Weights on Hugging Face|Ask for the weights/);
}

/** Every datasheet on /models must offer a primary call to action - Try, Weights on Hugging Face, or Ask for the
 *  weights - so no model (not only the flagship) ever ships with an empty CTA slot again. */
describe('ModelCard primary CTA', () => {
  it('lists light-german-tutor-pro-v22 in site.json', () => {
    expect(models.some((m) => m.name === 'light-german-tutor-pro-v22')).toBe(true);
  });

  for (const m of models) {
    it(`${m.name} renders a non-empty primary CTA`, () => {
      expectPrimaryCta(renderToStaticMarkup(<ModelCard m={m} featured={false} />), m.name);
    });
  }

  // Regression for 510cf0a: a browser-flagged model whose hub entry has no Space rendered an empty slot,
  // because TryLink returns null when tryUrl(m) is null and nothing fell through to the hub/mail CTAs.
  it('falls back to a hub or mail CTA when a browser model has no Space (light-german-tutor-pro-v22)', () => {
    const v22 = models.find((m) => m.name === 'light-german-tutor-pro-v22')!;
    const { space: _space, ...hub } = v22.hub;
    const noSpace = { ...v22, browser: true, hub };
    const html = renderToStaticMarkup(<ModelCard m={noSpace} featured={false} />);
    expectPrimaryCta(html, `${v22.name} (browser, no space)`);
    expect(html).not.toContain('>Try<');
  });

  // A non-public edition explains on the card itself why there is no Try/Hub link, pointing at the mailto CTA,
  // so a visitor scanning one card need not read the page-level "Weights and licences" legend first.
  it('shows a per-card note when an edition is not public, and none when it is', () => {
    const v22 = models.find((m) => m.name === 'light-german-tutor-pro-v22')!;
    const privateHtml = renderToStaticMarkup(<ModelCard m={{ ...v22, hub: { ...v22.hub, public: false } }} featured={false} />);
    expect(privateHtml).toContain('data-testid="non-public-note"');
    expect(privateHtml).toMatch(/Not yet public: there is nothing to try here and no Hub page\. Ask by mail/);
    expect(primaryAnchor(privateHtml)).toMatch(/href="mailto:/);
    for (const m of models.filter((x) => x.hub.public)) {
      expect(renderToStaticMarkup(<ModelCard m={m} featured={false} />)).not.toContain('data-testid="non-public-note"');
    }
  });

  // Same contract as Offerings: a null metric (facts gate or export fidelity) renders the shared NOT_MEASURED phrase,
  // never a bare dash, on every edition's datasheet.
  for (const m of models) {
    it(`${m.name} with unmeasured facts and export fidelity says "${NOT_MEASURED}" instead of a bare dash`, () => {
      const g = m.gate!;
      const unmeasured = { ...m, export_agreement: null, gate: { ...g, gates: { ...g.gates, facts: { ...g.gates.facts!, actual: null } } } };
      const html = renderToStaticMarkup(<ModelCard m={unmeasured} featured={false} />);
      expect(html).toContain(NOT_MEASURED);
      expect(html).not.toMatch(/>\s*[–—-]\s*</);
    });
  }
});
