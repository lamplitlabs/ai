import { describe, expect, it, vi } from 'vitest';
import * as data from '../data';
import { renderToStaticMarkup } from 'react-dom/server';
import { ModelCard, Models } from './Models';
import { CopyButton, CopyButtonView, copyStateFor, copyText } from '../CopyButton';
import { models } from '../data';
import { primaryCta } from '../cta';
import { NOT_MEASURED, measuredPct } from '../data';

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
  expect(anchor).toMatch(/Try|Weights on Hugging Face|Request this edition/);
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

  // A visitor requests a non-public edition in one click: a "Request this edition" mailto, prefilled with the
  // edition's name, instead of working out the delivery steps from the licence paragraph. Public editions show none.
  it('renders a prefilled "Request this edition" mailto for non-public editions only', () => {
    const v22 = models.find((m) => m.name === 'light-german-tutor-pro-v22')!;
    const priv = { ...v22, hub: { ...v22.hub, public: false } };
    const privateHtml = renderToStaticMarkup(<ModelCard m={priv} featured={false} />);
    expect(privateHtml).toContain('data-testid="request-edition"');
    expect(privateHtml).toContain('Request this edition');
    const subject = data.mailtoFor(priv).split('&')[0];
    expect(privateHtml).toContain(`href="${subject}&amp;body=`);
    expect(decodeURIComponent(data.mailtoFor(priv))).toContain(priv.label);
    // A browser-only edition (Try as primary) whose weights are not public still gets the request link.
    const browserPriv = { ...priv, browser: true };
    if (data.tryUrl(browserPriv)) {
      expect(renderToStaticMarkup(<ModelCard m={browserPriv} featured={false} />)).toContain('data-testid="request-edition"');
    }
    for (const m of models.filter((x) => x.hub.public)) {
      expect(renderToStaticMarkup(<ModelCard m={m} featured={false} />)).not.toContain('data-testid="request-edition"');
    }
  });

  // The request mail carries the context the visitor saw: edition, model name and the measured numbers, so the
  // mailto CTA and the copyable body in the note agree and nothing has to be retyped.
  it('prefills the request mail body with the edition and its measured numbers, and offers it to copy', () => {
    const v22 = models.find((m) => m.name === 'light-german-tutor-pro-v22')!;
    const m = { ...v22, hub: { ...v22.hub, public: false } };
    const body = data.requestBody(m);
    expect(body).toContain(v22.name);
    expect(body).toContain(`${v22.line} - ${data.EDITION_LABELS[v22.edition]} (${v22.label})`);
    const facts = v22.gate!.gates.facts;
    expect(body).toContain(`on ${v22.gate!.suite_size} scenarios`);
    expect(body).toContain(`facts against the reference ${data.pct(facts.actual, 1)}`);
    expect(body).toContain(`release gate ${v22.gate!.release ? 'passed' : 'not passed yet'}`);
    const href = data.mailtoFor(m);
    expect(new URLSearchParams(href.slice(href.indexOf('?') + 1)).get('body')).toBe(body);
    const html = renderToStaticMarkup(<ModelCard m={m} featured={false} />);
    expect(primaryAnchor(html)).toContain(`href="${href.replace(/&/g, '&amp;').replace(/'/g, '&#x27;')}"`);
    expect(html).toContain('data-testid="request-body"');
    expect(html).toContain('Copy the request');
    expect(data.requestBody({ ...m, gate: null })).toContain('No measured numbers are published for this edition yet.');
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

  // The strongest/weakest category line must use measuredPct() like every other metric: even if factCategories'
  // null-filter is loosened and a null-facts category reaches the card, the visitor sees NOT_MEASURED, never a dash.
  it('strongest/weakest category line never renders a bare dash for a null-facts category', () => {
    const m = models.find((x) => x.gate)!;
    const spy = vi.spyOn(data, 'factCategories').mockReturnValue([
      ['measured', { facts: 0.9 } as never],
      ['unmeasured', { facts: null } as never],
    ]);
    try {
      const html = renderToStaticMarkup(<ModelCard m={m} featured={false} />);
      expect(html).toContain('strongest');
      expect(html).toContain(NOT_MEASURED);
      expect(html).not.toMatch(/>\s*[–—-]\s*</);
    } finally {
      spy.mockRestore();
    }
  });
});

// The strongest/weakest category line follows the same convention: a category whose facts rate is null is dropped by
// factCategories, and any value that does reach the line goes through measuredPct, so the line never shows a bare dash.
describe('ModelCard strongest/weakest category line', () => {
  const measuredModel = models.find((m) => m.gate && Object.values(m.gate.by_category).some((c) => c.facts != null))!;

  it('renders an unmeasured category facts value as NOT_MEASURED, never a dash', () => {
    const g = measuredModel.gate!;
    const k0 = Object.keys(g.by_category)[0];
    const by_category = Object.fromEntries(Object.entries(g.by_category).map(([k, c]) => [k, k === k0 ? c : { ...c, facts: undefined }]));
    const html = renderToStaticMarkup(<ModelCard m={{ ...measuredModel, gate: { ...g, by_category } }} featured={false} />);
    // Only one category survives factCategories' null-filter here, so the line names it once rather than
    // repeating it as both "strongest" and "weakest".
    expect(html).not.toContain('strongest ');
    expect(html).not.toMatch(/text-(success|warning)">–</);
    expect(html).not.toMatch(/>\s*[–—-]\s*</);
    // Null facts never reach the line through factCategories; if they ever do, measuredPct is what renders them.
    expect(measuredPct(null)).toBe(NOT_MEASURED);
  });

  it('omits the line rather than showing dashes when no category has a facts rate', () => {
    const g = measuredModel.gate!;
    const by_category = Object.fromEntries(Object.entries(g.by_category).map(([k, c]) => [k, { ...c, facts: undefined }]));
    const html = renderToStaticMarkup(<ModelCard m={{ ...measuredModel, gate: { ...g, by_category } }} featured={false} />);
    expect(html).not.toContain('strongest ');
    expect(html).not.toMatch(/>\s*[–—-]\s*</);
  });
});

// A visitor evaluating self-hosting gets a copyable command on the card itself - not only a mailto or a Hub page:
// every public edition shows a huggingface-cli download pinned to its revision; a non-public one shows none.
describe('ModelCard self-host snippet', () => {
  for (const m of models.filter((x) => x.hub.public)) {
    it(`${m.name} shows a huggingface-cli download command for its repo`, () => {
      const html = renderToStaticMarkup(<ModelCard m={m} featured={false} />);
      expect(html).toContain('data-testid="self-host-snippet"');
      expect(html).toContain(`huggingface-cli download ${m.hub.repo}`);
      if (m.hub.revision) expect(html).toContain(`--revision ${m.hub.revision}`);
    });
  }
  it('offers a one-click copy button for the pull command instead of hand-selecting it', async () => {
    const m = models.find((x) => x.hub.public)!;
    const html = renderToStaticMarkup(<ModelCard m={m} featured={false} />);
    const snippet = html.slice(html.indexOf('data-testid="self-host-snippet"'), html.indexOf('</pre>'));
    expect(snippet).toContain('data-testid="copy-button"');
    expect(snippet).toContain('aria-label="Copy the pull command"');
    expect(renderToStaticMarkup(<CopyButton text="x" label="Copy" />)).toContain('data-copied="false"');
    // The handler writes the exact command through the clipboard API and reports whether it was accepted.
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    try {
      expect(await copyText(data.selfHostCommand(m)!)).toBe(true);
      expect(writeText).toHaveBeenCalledWith(data.selfHostCommand(m));
      vi.stubGlobal('navigator', {});
      expect(await copyText('x')).toBe(false);
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it('tells the visitor to select the command manually when the browser refuses the clipboard', async () => {
    // A missing or rejecting clipboard API must not end in a silent no-op: the button turns into a failed state with a visible message.
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
    try {
      expect(copyStateFor(await copyText('x'))).toBe('failed');
    } finally {
      vi.unstubAllGlobals();
    }
    expect(copyStateFor(true)).toBe('copied');
    const failed = renderToStaticMarkup(<CopyButtonView state="failed" label="Copy" />);
    expect(failed).toContain('data-copy-state="failed"');
    expect(failed).toContain('data-testid="copy-failed"');
    expect(failed).toContain('role="status"');
    expect(failed).toContain('select the command');
    expect(failed).toContain('retry');
    // The idle and copied states carry no failure message.
    expect(renderToStaticMarkup(<CopyButtonView state="idle" label="Copy" />)).not.toContain('copy-failed');
    expect(renderToStaticMarkup(<CopyButtonView state="copied" label="Copy" />)).not.toContain('copy-failed');
    const m = models.find((x) => x.hub.public)!;
    const html = renderToStaticMarkup(<ModelCard m={m} featured={false} />);
    // The command itself is still rendered as selectable text for the manual fallback.
    expect(html).toContain(data.selfHostCommand(m)!.replace(/&/g, '&amp;'));
  });
  it('shows no snippet when the weights are not public', () => {
    const v22 = models.find((m) => m.name === 'light-german-tutor-pro-v22')!;
    const html = renderToStaticMarkup(<ModelCard m={{ ...v22, hub: { ...v22.hub, public: false } }} featured={false} />);
    expect(html).not.toContain('huggingface-cli download');
    expect(html).not.toContain('data-testid="self-host-snippet"');
  });
  it('names the contact address on the card when weights are on request, so the reader need not hunt the footer', () => {
    const v22 = models.find((m) => m.name === 'light-german-tutor-pro-v22')!;
    const html = renderToStaticMarkup(<ModelCard m={{ ...v22, hub: { ...v22.hub, public: false } }} featured={false} />);
    expect(html).toContain('weights on request');
    expect(html).toContain(data.CONTACT);
  });
});

/** A visitor landing directly on /models from a search compares the editions' measured numbers before scrolling the datasheets. */
describe('/models comparison table', () => {
  it('renders the OfferingComparison table above the first datasheet when more than one edition is listed', () => {
    const page = renderToStaticMarkup(<Models />);
    const table = page.indexOf('data-testid="offering-comparison"');
    const firstCard = page.indexOf(`id="${data.showcaseModels[0].name}"`);
    if (data.showcaseModels.length > 1) {
      expect(table).toBeGreaterThan(0);
      expect(firstCard).toBeGreaterThan(table);
      for (const m of data.showcaseModels) expect(page).toContain(`data-testid="compare-${m.name}"`);
    } else {
      expect(table).toBe(-1);
    }
  });
});
