import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Benchmarks } from './Benchmarks';
import { models } from '../data';

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
