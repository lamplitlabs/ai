import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CommissionCard, OfferingCard } from './Offerings';
import { models } from './data';
import { primaryCta } from './cta';
import { commissionBody, commissionMailto, mailtoFor, modelCta, NOT_MEASURED, requestBody, selfHostCommand } from './data';
import { CopyButtonView } from './CopyButton';

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
  expect(anchor).toMatch(/Try it|Weights on Hugging Face|Request this edition/);
}

/** Every offering on the landing must carry a primary call to action with a real href - Try it, Weights on
 *  Hugging Face, or Request this edition - so no edition ever ships with an empty or href-less CTA slot. */
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

  // Every number a card shows is either measured or says so in words: a visitor cannot tell a bare dash from a failed
  // check (the defects fixed in 1bee5ff, 2d18ab0, 6bc479d). The shared `measured` helper in data.ts is the only fallback.
  for (const m of models) {
    it(`${m.name} with an unmeasured facts gate says "${NOT_MEASURED}" instead of a bare dash`, () => {
      const g = m.gate!;
      const unmeasured = { ...m, gate: { ...g, gates: { ...g.gates, facts: { ...g.gates.facts!, actual: null } } } };
      const html = renderToStaticMarkup(<OfferingCard m={unmeasured} featured={false} />);
      expect(html).toContain(NOT_MEASURED);
      expect(html).not.toMatch(/>\s*[–—-]\s*</);
    });
  }
});

/** A visitor copies an offering's pull command from the landing without opening /models: public-weights cards
 *  render the command with a copy button in its idle state; cards without public weights show neither. */
describe('OfferingCard pull command', () => {
  it('renders a copy button in its idle state next to the pull command of every public-weights offering', () => {
    const publicModels = models.filter((m) => selfHostCommand(m) != null);
    expect(publicModels.length).toBeGreaterThan(0);
    for (const m of publicModels) {
      const html = renderToStaticMarkup(<OfferingCard m={m} />);
      const i = html.indexOf('data-testid="offer-pull"');
      expect(i, `${m.name} has no pull snippet`).toBeGreaterThan(-1);
      const snippet = html.slice(i, html.indexOf('</button>', i));
      expect(snippet).toContain(selfHostCommand(m)!);
      expect(snippet).toContain('data-testid="copy-button"');
      expect(snippet).toContain(`aria-label="Copy the pull command for ${m.label}"`);
      expect(snippet).toContain('data-copy-state="idle"');
    }
  });
  it('shows the copied and failed states the button moves through after a click', () => {
    expect(renderToStaticMarkup(<CopyButtonView state="copied" label="Copy" onCopy={() => {}} />)).toContain('data-copied="true"');
    expect(renderToStaticMarkup(<CopyButtonView state="failed" label="Copy" onCopy={() => {}} />)).toContain('data-testid="copy-failed"');
  });
  it('omits the pull command on offerings without public weights', () => {
    for (const m of models.filter((x) => selfHostCommand(x) == null)) {
      expect(renderToStaticMarkup(<OfferingCard m={m} />)).not.toContain('data-testid="offer-pull"');
    }
  });
});

/** A landing visitor without a mail handler still sends the request with the measured numbers: every non-public
 *  offering card carries a Copy-the-request button whose text is the same body the mailto CTA prefills. */
describe('OfferingCard request copy', () => {
  it('offers to copy the prefilled request on every non-public offering, matching the mailto body', () => {
    const v22 = models.find((m) => m.name === 'light-german-tutor-pro-v22')!;
    const nonPublic = [{ ...v22, hub: { ...v22.hub, public: false } }, ...models.filter((m) => !modelCta(m).publicWeights)];
    for (const m of nonPublic) {
      const html = renderToStaticMarkup(<OfferingCard m={m} />);
      expect(html, `${m.name} has no request copy button`).toContain('aria-label="Copy the request"');
      expect(html).toContain('href="mailto:');
      const href = mailtoFor(m);
      expect(new URLSearchParams(href.slice(href.indexOf('?') + 1)).get('body')).toBe(requestBody(m));
      if (m.gate) expect(requestBody(m)).toContain(`on ${m.gate.suite_size} scenarios`);
    }
  });
  it('omits the request copy button on public-weights offerings', () => {
    for (const m of models.filter((x) => modelCta(x).publicWeights)) {
      expect(renderToStaticMarkup(<OfferingCard m={m} />)).not.toContain('aria-label="Copy the request"');
    }
  });
});

/** A visitor without a mail handler can still send the commission request: the card carries a copy button whose
 *  text is the same body the mailto CTA prefills. */
describe('CommissionCard request copy', () => {
  it('offers to copy the commission request, matching the mailto body', () => {
    const html = renderToStaticMarkup(<CommissionCard />);
    expect(html).toContain('aria-label="Copy the commission request"');
    expect(html).toContain('href="mailto:');
    const href = commissionMailto();
    expect(new URLSearchParams(href.slice(href.indexOf('?') + 1)).get('body')).toBe(commissionBody());
    expect(renderToStaticMarkup(<CopyButtonView label="Copy the commission request" state="idle" onCopy={() => {}} />)).toContain('Copy the commission request');
  });
});
