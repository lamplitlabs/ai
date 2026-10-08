import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Benchmarks, GateCard, lastUpdatedNote, STALE_AFTER_DAYS, unmetGates, unmetLabel } from './Benchmarks';
import { GATE_DEFINITIONS, GATE_LABELS, models, NOT_MEASURED } from '../data';

const withGate = models.filter((m) => m.gate);
const newest = withGate.reduce((best, m) => ((m.gate!.created_at ?? '') > (best.gate!.created_at ?? '') ? m : best));

/** The Benchmarks header names the newest gated model - the one with the maximum gate.created_at - not whichever
 *  model happens to sit at index 0 of site.json's models list. */
describe('Benchmarks header picks the newest gate', () => {
  it('site.json has at least two gated models and index 0 is not the newest (so this test discriminates)', () => {
    expect(withGate.length).toBeGreaterThanOrEqual(2);
    expect(models[0].name).not.toBe(newest.name);
  });

  it('names the model with the maximum gate.created_at', () => {
    const html = renderToStaticMarkup(<Benchmarks />);
    const status = html.match(/(gate passed|gate not passed)/);
    expect(status, 'header status badge missing').not.toBeNull();
    const headerEnd = html.indexOf(status![0]);
    const header = html.slice(0, headerEnd);
    expect(header).toContain(`${newest.label} · `);
    const expectedStatus = newest.gate!.release ? 'gate passed' : 'gate not passed';
    expect(status![0]).toBe(expectedStatus);
    for (const m of withGate) {
      if (m.name !== newest.name) expect(header).not.toContain(`${m.label} · gate`);
    }
  });
});

/** Beside every gate name sits a methodology marker: a link with an accessible name and a title tooltip carrying the
 *  gate's definition, whose href points at a matching anchor in the methodology list on the same page. */
describe('Benchmarks gate methodology help', () => {
  const html = renderToStaticMarkup(<Benchmarks />);
  const gateKeys = [...new Set(withGate.flatMap((m) => Object.keys(m.gate!.gates)))];

  it('every rendered gate has a definition', () => {
    expect(gateKeys.length).toBeGreaterThan(0);
    for (const k of gateKeys) expect(GATE_DEFINITIONS[k], `no definition for gate ${k}`).toBeTruthy();
  });

  it('renders a reachable link with tooltip and accessible name for each gate, pointing at an anchor on the page', () => {
    for (const k of gateKeys) {
      const link = html.match(new RegExp(`<a[^>]*data-gate-help="${k}"[^>]*>`));
      expect(link, `methodology link missing for gate ${k}`).not.toBeNull();
      expect(link![0]).toContain(`href="#gate-${k}"`);
      expect(link![0]).toMatch(/title="[^"]+"/);
      expect(link![0]).toContain(`aria-label="What &quot;${GATE_LABELS[k] ?? k}&quot; measures:`);
      expect(html, `anchor #gate-${k} missing`).toContain(`id="gate-${k}"`);
    }
    expect(html).toContain('id="methodology"');
  });
});

/** The progression table's release cell names the unmet gate instead of a bare "not yet", so a reader learns which
 *  metric still has to pass. */
describe('Benchmarks release cell names the unmet gate', () => {
  const html = renderToStaticMarkup(<Benchmarks />);

  it('never renders a bare "not yet" tag', () => {
    expect(html).not.toMatch(/>not yet</);
  });

  it('every unreleased edition lists each failing gate by label in the visible row text', () => {
    const unreleased = withGate.filter((m) => !m.gate!.release);
    for (const m of unreleased) {
      const keys = unmetGates(m.gate!.gates);
      expect(keys.length, `${m.name} is unreleased but every gate is ok`).toBeGreaterThan(0);
      const text = unmetLabel(m.gate!.gates);
      for (const k of keys) expect(text).toContain(GATE_LABELS[k] ?? k);
      expect(html).toContain(`data-unmet-gates="${keys.join(',')}"`);
      expect(html).toContain(`>${text}<`);
    }
  });

  it('labels one, several and no failing gates with no "+N more" and no tooltip', () => {
    expect(unmetLabel({ facts: { ok: false }, shape: { ok: true } })).toBe(`not yet: ${GATE_LABELS.facts}`);
    expect(unmetLabel({ facts: { ok: false }, shape: { ok: false } })).toBe(`not yet: ${GATE_LABELS.facts}, ${GATE_LABELS.shape}`);
    expect(unmetLabel({ facts: { ok: true } })).toBe('not yet released');
    expect(html).not.toMatch(/\+\d+ more/);
    expect(html).not.toMatch(/data-unmet-gates="[^"]*" title=/);
  });
});

/** Above the Progression table sits a "last measured" note; when the newest gate run is older than STALE_AFTER_DAYS
 *  it says so plainly, so a visitor does not mistake stale benchmark data for a current run. */
describe('Benchmarks staleness note above Progression', () => {
  const latestIso = newest.gate!.created_at!;
  const latestDate = latestIso.slice(0, 10);

  it('renders a stale banner when the newest gate is older than the threshold', () => {
    const now = new Date(Date.parse(latestIso) + (STALE_AFTER_DAYS + 30) * 86_400_000);
    const html = renderToStaticMarkup(<Benchmarks now={now} />);
    const note = html.match(/<p data-last-updated="stale"[^>]*>([^<]*)<\/p>/);
    expect(note, 'stale note missing').not.toBeNull();
    expect(note![1]).toContain(`Last measured ${latestDate}`);
    expect(note![1]).toContain(`${STALE_AFTER_DAYS + 30} days ago`);
    expect(html.indexOf(note![0])).toBeLessThan(html.indexOf('<table'));
  });

  it('renders only a plain date when the newest gate is recent', () => {
    const now = new Date(Date.parse(latestIso) + 5 * 86_400_000);
    const html = renderToStaticMarkup(<Benchmarks now={now} />);
    expect(html).not.toContain('data-last-updated="stale"');
    expect(html).toMatch(new RegExp(`<p data-last-updated="fresh"[^>]*>Last measured ${latestDate}\\.</p>`));
    expect(html).not.toContain('days ago');
  });

  it('computes the note from the date alone and tolerates a missing date', () => {
    const now = new Date('2026-12-01T00:00:00Z');
    expect(lastUpdatedNote('2026-09-15T06:19:17+00:00', now)?.stale).toBe(false);
    expect(lastUpdatedNote('2026-06-01T00:00:00Z', now)?.stale).toBe(true);
    expect(lastUpdatedNote(null, now)).toBeNull();
    expect(lastUpdatedNote('garbage', now)).toBeNull();
  });
});

/** A judge panel whose mean is not yet computed says "not measured yet" - the same wording Models/Offerings and the
 *  progression table use - instead of a bare dash the reader has to interpret. */
describe('GateCard null panel/judge mean', () => {
  const base = withGate[0];
  const m = {
    ...base,
    panel: { round: null, mean: null, means: {}, judges: [{ judge: 'judge-x', mean: null, means: {} }] },
  } as unknown as typeof base;
  const html = renderToStaticMarkup(<GateCard m={m} />);

  it('renders NOT_MEASURED for the panel round, panel mean and each judge mean, never a bare dash', () => {
    expect(html).toContain(`round ${NOT_MEASURED} ·`);
    expect(html).toContain(`mean ${NOT_MEASURED} / 5`);
    expect(html).toContain(`>${NOT_MEASURED}</div>`);
    expect(html).not.toMatch(/round – ·/);
    expect(html).not.toMatch(/mean – \/ 5/);
    expect(html).not.toContain('>–</div>');
  });
});
