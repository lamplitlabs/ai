import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { CATEGORY_LABELS, CONTACT, commissionMailto, contactMailto, dataAgeDays, defaultDtype, EDITION_LABELS, gb, mailtoFor, modelCta, factCategories, flagship, latestMeasuredAt, licenceName, lines, models, NOT_MEASURED, pct, runsIn, runsInDetail, selfHostCommand, shortDate, showcaseModels, siteData, spaceUrl, tryLabel, tryUrl, weightsAvailability, weightsSpec } from './data';

describe('site data (site.json is generated outside this repo, ADR-001)', () => {
  it('leads with a browser-runnable flagship and offers one edition of each kind per line', () => {
    expect(showcaseModels.length).toBeGreaterThan(0);
    expect(flagship.browser).toBe(true);
    expect(flagship.name).toBe(showcaseModels[0].name);
    expect(lines.length).toBeGreaterThan(0);
    for (const { editions } of lines) {
      expect(editions[0].browser).toBe(true);
      expect(new Set(editions.map((e) => e.edition)).size).toBe(editions.length);
    }
    expect(latestMeasuredAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
  it('describes every edition by its weights: an export the browser runs, or trained weights for a GPU', () => {
    for (const m of models) {
      expect(m.pitch.length).toBeGreaterThan(20);
      expect(m.line.length).toBeGreaterThan(0);
      if (m.weights === 'onnx') {
        expect(m.exported_at).toMatch(/^\d{4}-/);
        expect(m.dtypes[0].size_mb).toBeGreaterThan(0);
        expect(m.gate?.runtime).not.toBe('pytorch');
      } else {
        expect(m.exported_at).toBeNull();
        expect(m.dtypes).toEqual([]);
        expect(m.browser).toBe(false);
        expect(m.export_agreement).toBeNull();
        expect(m.memory_gb).toBeGreaterThan(0);
        expect(m.gate?.runtime).toBe('pytorch');
        // the PyTorch gate skips the export check; a skipped check is not a measurement and is not shown
        expect(m.gate?.gates.export).toBeUndefined();
      }
      if (m.gate) expect(m.measured_at).toBe(m.gate.created_at);
    }
  });
  it('carries measurements in range and never a path or host', () => {
    const text = JSON.stringify(siteData);
    expect(text).not.toMatch(/\/Users\/|runs\/|\d+\.\d+\.\d+\.\d+/);
    for (const m of models) {
      expect(m.params_b).toBeGreaterThan(0);
      if (m.gate) {
        for (const g of Object.values(m.gate.gates)) {
          if (g.actual == null) {
            expect(g.note).toMatch(/not verified/);
            expect(g.ok).toBe(false);
            continue;
          }
          expect(g.actual).toBeGreaterThanOrEqual(0);
          expect(g.actual).toBeLessThanOrEqual(1);
        }
        expect(factCategories(m.gate).every(([, v]) => typeof v.facts === 'number')).toBe(true);
      }
      if (m.panel) for (const j of m.panel.judges) expect(j.mean == null || (j.mean >= 1 && j.mean <= 5)).toBe(true);
    }
  });
  it('carries the prompt each browser edition was trained under, so a demo can serve it unchanged', () => {
    for (const m of showcaseModels.filter((x) => x.browser)) expect(m.system_prompt?.trim().length ?? 0).toBeGreaterThan(20);
  });
  it('marks the browser rule the way the producer does (every file under 2 GiB; WASM only under its heap budget)', () => {
    for (const m of models) {
      expect(m.browser).toBe(m.dtypes.some((d) => d.max_chunk_mb < 2147));
      expect(m.wasm).toBe(m.dtypes.some((d) => d.max_chunk_mb < 2147 && d.wasm));
      if (m.wasm) expect(m.browser).toBe(true);
    }
  });
});

describe('runtime labels', () => {
  it('names the real runtime for an ONNX edition too large for the browser, not a placeholder', () => {
    const m = { ...models[0], weights: 'onnx', browser: false, wasm: false } as (typeof models)[number];
    expect(runsIn(m)).toBe('desktop · server');
    expect(runsInDetail(m)).toBe('ONNX Runtime (desktop · server)');
    expect(runsInDetail(m)).not.toMatch(/browser limit/);
  });
});

describe('try links', () => {
  it('sends every "try" to the Space that runs the model - the site ships no runtime (ADR-001)', () => {
    expect(spaceUrl('org/name')).toBe('https://huggingface.co/spaces/org/name');
    expect(tryUrl(flagship)).toBe(spaceUrl(flagship.hub.space!));
    expect(tryUrl({ ...flagship, hub: { repo: null, public: false } })).toBeNull();
    expect(tryUrl(undefined)).toBeNull();
  });
  it('labels every "try" from the line on offer, never from a hard-coded product name', () => {
    expect(tryLabel()).toBe(`Try the ${flagship.line}`);
    expect(tryLabel(undefined)).toBe(`Try the ${flagship.line}`);
    expect(tryLabel({ ...flagship, line: 'Contract reviewer' })).toBe('Try the Contract reviewer');
    // No try-able model at all: the copy must not promise an interactive demo.
    expect(tryLabel(null)).toBe('See the model');
    expect(tryLabel(null)).not.toMatch(/^Try/);
  });
  it('redirects /try (vercel.json) to the same Space the data names, so config cannot drift from data', () => {
    const vercel = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8')) as { redirects?: { source: string; destination: string }[] };
    const redirect = vercel.redirects?.find((r) => r.source === '/try');
    expect(redirect?.destination).toBe(tryUrl(flagship));
  });
  it('names every benchmark category in site.json with a curated label, never the title-cased fallback', () => {
    const seen = new Set<string>();
    JSON.stringify(siteData, (k, v) => {
      if (k === 'by_category' && v && typeof v === 'object') for (const c of Object.keys(v)) seen.add(c);
      return v;
    });
    expect(seen.size).toBeGreaterThan(0);
    for (const c of [...seen].sort()) expect(CATEGORY_LABELS, `missing CATEGORY_LABELS entry for ${c}`).toHaveProperty(c);
  });
});

describe('weights and licence copy (one helper for /models and the offerings list)', () => {
  const base = models[0];
  it('drops the licence parenthetical and keeps a licence that has none', () => {
    expect(licenceName({ ...base, licence: 'Apache-2.0 (inherited from the base)' })).toBe('Apache-2.0');
    expect(licenceName({ ...base, licence: 'MIT' })).toBe('MIT');
  });
  it('says the same "public weights" / "weights on request" words for both pages', () => {
    expect(weightsAvailability({ ...base, hub: { ...base.hub, revision: undefined } }, true)).toBe('public weights');
    expect(weightsAvailability({ ...base, hub: { ...base.hub, revision: 'v3' } }, true)).toBe('public weights · v3');
    expect(weightsAvailability(base, false)).toBe('weights on request');
  });
  it('ends every weights spec line with the licence name, with or without a measured size', () => {
    for (const m of models) {
      expect(weightsSpec(m, true).endsWith(licenceName(m))).toBe(true);
      expect(weightsSpec(m, false).endsWith(licenceName(m))).toBe(true);
    }
    expect(weightsSpec({ ...base, dtypes: [], weights_mb: null, licence: 'MIT (x)' }, true)).toBe('size unmeasured · MIT');
  });
  it('never reduces a public-weights spec line to a bare licence tag: an unmeasured size says so', () => {
    for (const m of models) expect(weightsSpec(m, true)).not.toBe(licenceName(m));
    expect(weightsSpec({ ...base, dtypes: [], weights_mb: null, licence: 'MIT' }, true)).toContain(' · ');
  });
  it('shows the smallest measured dtype as the weight size, whatever order the producer listed them in', () => {
    const q8 = { dtype: 'q8', size_mb: 3552, chunks: 2, max_chunk_mb: 1796, wasm: false };
    const q4 = { dtype: 'q4', size_mb: 2086, chunks: 2, max_chunk_mb: 1808, wasm: false };
    expect(defaultDtype({ dtypes: [q8, q4] })?.dtype).toBe('q4');
    expect(defaultDtype({ dtypes: [q4, q8] })?.dtype).toBe('q4');
    expect(defaultDtype({ dtypes: [] })).toBeUndefined();
    expect(weightsSpec({ ...base, dtypes: [q8, q4], licence: 'MIT' }, true)).toBe(weightsSpec({ ...base, dtypes: [q4, q8], licence: 'MIT' }, true));
    expect(weightsSpec({ ...base, dtypes: [q8, q4], licence: 'MIT' }, true).startsWith('q4 · ')).toBe(true);
    for (const m of models) {
      const smallest = Math.min(...m.dtypes.map((d) => d.size_mb));
      if (m.dtypes.length) expect(defaultDtype(m)?.size_mb).toBe(smallest);
    }
  });

  it('mailtoFor prefills a non-empty body naming the model so the draft is not blank', () => {
    const href = mailtoFor(base);
    expect(href.startsWith(`mailto:${CONTACT}?`)).toBe(true);
    const params = new URLSearchParams(href.slice(href.indexOf('?') + 1));
    expect(params.get('subject')).toBe(`${base.line} - ${EDITION_LABELS[base.edition]} (${base.label})`);
    const body = params.get('body') ?? '';
    expect(body.length).toBeGreaterThan(0);
    expect(body).toContain(base.line);
    expect(body).toContain('self-hosting');
  });

  it('mailtoFor names the specific edition when two editions of one line differ in weights availability', () => {
    const line = 'Receipt Reader';
    const browserEd: typeof base = { ...base, line, label: 'receipt-reader-0.5b', edition: 'browser', weights: 'onnx', browser: true, hub: { repo: 'lamplit/receipt-reader-0.5b', public: true } };
    const mediumEd: typeof base = { ...base, line, label: 'receipt-reader-3b', edition: 'medium', weights: 'pytorch', browser: false, hub: { repo: null, public: false } };
    const params = (href: string) => new URLSearchParams(href.slice(href.indexOf('?') + 1));
    const onRequest = params(mailtoFor(mediumEd));
    const subject = onRequest.get('subject') ?? '';
    const body = onRequest.get('body') ?? '';
    for (const text of [subject, body]) {
      expect(text).toContain(line);
      expect(text).toContain(EDITION_LABELS.medium);
      expect(text).toContain(mediumEd.label);
      expect(text).not.toContain(EDITION_LABELS.browser);
      expect(text).not.toContain(browserEd.label);
    }
    expect(params(mailtoFor(browserEd)).get('subject')).not.toBe(subject);
  });

  it('modelCta falls back to a mailto CTA when a model has neither public weights nor a browser demo', () => {
    const noHubNoTry: typeof base = { ...base, browser: false, hub: { repo: null, public: false } };
    const cta = modelCta(noHubNoTry);
    expect(cta.kind).toBe('mail');
    expect(cta.href).toBe(mailtoFor(noHubNoTry));
    expect(cta.href.startsWith(`mailto:${CONTACT}?`)).toBe(true);
    const params = new URLSearchParams(cta.href.slice(cta.href.indexOf('?') + 1));
    expect(params.get('subject')).toContain(noHubNoTry.line);
    expect((params.get('body') ?? '').length).toBeGreaterThan(0);
    expect(cta.hubUrl).toBeNull();
    expect(cta.tryHref).toBeNull();
    expect(cta.publicWeights).toBe(false);
    expect(cta.secondaryHub).toBeNull();
    // A private repo name alone must not surface as a Hub link.
    expect(modelCta({ ...noHubNoTry, hub: { repo: 'lamplit/private', public: false } }).kind).toBe('mail');
    // Every shipped model resolves to a non-empty CTA href, whatever its kind.
    for (const m of models) expect(modelCta(m).href.length).toBeGreaterThan(0);
  });

  it('contactMailto targets CONTACT with an encoded subject', () => {
    expect(contactMailto()).toBe(`mailto:${CONTACT}?subject=Hello%20from%20lamplitlabs.com`);
  });

  it('commissionMailto prefills a non-empty body so the commission draft is not blank', () => {
    const href = commissionMailto();
    expect(href.startsWith(`mailto:${CONTACT}?`)).toBe(true);
    const params = new URLSearchParams(href.slice(href.indexOf('?') + 1));
    expect(params.get('subject')).toBe('A model for our job');
    const body = params.get('body') ?? '';
    expect(body.length).toBeGreaterThan(0);
  });
});

describe('pct', () => {
  it('says NOT_MEASURED for a missing value, never a bare dash a visitor cannot tell from a failed check', () => {
    expect(pct(null)).toBe(NOT_MEASURED);
    expect(pct(undefined)).toBe(NOT_MEASURED);
    expect(pct(0.5)).toBe('50%');
  });
});

describe('small formatting helpers shown on model cards and /benchmarks', () => {
  it('gb() shows megabytes below 1000 MB and one-decimal gigabytes from 1000 MB', () => {
    expect(gb(0)).toBe('0 MB');
    expect(gb(87.4)).toBe('87 MB');
    expect(gb(87.6)).toBe('88 MB');
    expect(gb(999)).toBe('999 MB');
    expect(gb(1000)).toBe('1.0 GB');
    expect(gb(1234)).toBe('1.2 GB');
    expect(gb(1250)).toBe('1.3 GB');
    expect(gb(15_900)).toBe('15.9 GB');
  });
  it('dataAgeDays() counts whole days between generated_at and now and never goes negative', () => {
    const generated = '2026-01-01T12:00:00Z';
    expect(dataAgeDays(generated, new Date('2026-01-01T12:00:00Z'))).toBe(0);
    expect(dataAgeDays(generated, new Date('2026-01-02T11:59:59Z'))).toBe(0);
    expect(dataAgeDays(generated, new Date('2026-01-02T12:00:00Z'))).toBe(1);
    expect(dataAgeDays(generated, new Date('2026-01-15T12:00:00Z'))).toBe(14);
    expect(dataAgeDays(generated, new Date('2026-02-01T00:00:00Z'))).toBe(30);
    expect(dataAgeDays(generated, new Date('2025-12-25T00:00:00Z'))).toBe(0);
  });
  it('shortDate() keeps the calendar day of an ISO string and shows a dash for missing dates', () => {
    expect(shortDate('2026-03-04T05:06:07.000Z')).toBe('2026-03-04');
    expect(shortDate('2026-03-04')).toBe('2026-03-04');
    expect(shortDate(null)).toBe('–');
    expect(shortDate(undefined)).toBe('–');
    expect(shortDate('')).toBe('–');
  });
  it('selfHostCommand() prints the exact huggingface-cli line, pinning --revision only when the hub has one', () => {
    const base = { ...models[0], name: 'tiny-ocr' };
    const withRev = { ...base, hub: { repo: 'lamplit/tiny-ocr', public: true, revision: 'v1.2.0' } };
    expect(selfHostCommand(withRev)).toBe('huggingface-cli download lamplit/tiny-ocr --revision v1.2.0 --local-dir ./tiny-ocr');
    const noRev = { ...base, hub: { repo: 'lamplit/tiny-ocr', public: true } };
    expect(selfHostCommand(noRev)).toBe('huggingface-cli download lamplit/tiny-ocr --local-dir ./tiny-ocr');
    expect(selfHostCommand({ ...base, hub: { repo: 'lamplit/tiny-ocr', public: false, revision: 'v1.2.0' } })).toBeNull();
    expect(selfHostCommand({ ...base, hub: { repo: null, public: true } })).toBeNull();
  });
});
