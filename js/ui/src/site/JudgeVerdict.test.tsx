import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { OfferingCard } from './Offerings';
import { Landing } from './pages/Landing';
import { ModelCard } from './pages/Models';
import { flagship, showcaseModels } from './data';

const verdict = /would ship|satisfied at|of \d+ judges|panel pending|not judged/;

describe('the judges are a published score, not a ship/no-ship gate; the hero strip names no base model', () => {
  for (const m of showcaseModels.filter((m) => m.gate)) {
    const g = m.gate!;
    const gates = Object.values(g.gates);
    const passed = gates.filter((x) => x.ok).length;
    it(`${m.name}: datasheet and offering card show the release-gate count and no judge verdict`, () => {
      for (const html of [renderToStaticMarkup(<ModelCard m={m} featured />), renderToStaticMarkup(<OfferingCard m={m} />)]) {
        expect(html).toContain('release gates');
        expect(html).toContain(`${passed} / ${gates.length}`);
        expect(html).not.toMatch(verdict);
        expect(html).not.toContain('/ 5');
      }
    });
  }

  it('the hero measurement strip has four datums: no parameter count, no base model, no judge panel', () => {
    const html = renderToStaticMarkup(<Landing />);
    const strip = html.slice(html.indexOf('aria-label="Measured today'), html.indexOf('read the numbers'));
    expect(strip.length).toBeGreaterThan(0);
    for (const k of ['facts checked', 'release gates', 'export fidelity', 'download']) expect(strip).toContain(`>${k}<`);
    for (const k of ['parameters', 'judge panel', 'base ', flagship!.base_model.split('/').pop()!]) expect(strip).not.toContain(k);
    expect(strip).not.toMatch(verdict);
    expect(strip).not.toContain('/ 5');
  });
});
