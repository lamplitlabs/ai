import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Benchmarks } from './Benchmarks';
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
