import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Benchmarks, unmetGates, unmetLabel, unmetTitle } from './Benchmarks';
import { GATE_DEFINITIONS, GATE_LABELS, models } from '../data';

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

  it('every unreleased edition names its first failing gate by label', () => {
    const unreleased = withGate.filter((m) => !m.gate!.release);
    for (const m of unreleased) {
      const keys = unmetGates(m.gate!.gates);
      expect(keys.length, `${m.name} is unreleased but every gate is ok`).toBeGreaterThan(0);
      const text = unmetLabel(m.gate!.gates);
      expect(text).toContain(GATE_LABELS[keys[0]] ?? keys[0]);
      expect(html).toContain(`data-unmet-gates="${keys.join(',')}"`);
      expect(html).toContain(text.replace(/\+/g, '+'));
    }
  });

  it('labels one, several and no failing gates', () => {
    expect(unmetLabel({ facts: { ok: false }, shape: { ok: true } })).toBe(`not yet: ${GATE_LABELS.facts}`);
    expect(unmetLabel({ facts: { ok: false }, shape: { ok: false } })).toBe(`not yet: ${GATE_LABELS.facts} +1 more`);
    expect(unmetLabel({ facts: { ok: true } })).toBe('not yet released');
  });

  it('the tooltip lists every unmet gate label when more than one fails, and is absent otherwise', () => {
    expect(unmetTitle({ facts: { ok: false }, shape: { ok: false } })).toBe(`not yet: ${GATE_LABELS.facts}, ${GATE_LABELS.shape}`);
    expect(unmetTitle({ facts: { ok: false }, shape: { ok: true } })).toBeUndefined();
    expect(unmetTitle({ facts: { ok: true } })).toBeUndefined();
    for (const m of withGate.filter((x) => !x.gate!.release)) {
      const keys = unmetGates(m.gate!.gates);
      if (keys.length < 2) continue;
      const title = unmetTitle(m.gate!.gates)!;
      for (const k of keys) expect(title).toContain(GATE_LABELS[k] ?? k);
      expect(html).toContain(`title="${title}"`);
    }
  });
});
