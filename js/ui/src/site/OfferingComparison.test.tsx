import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { OfferingComparison } from './Offerings';
import { Landing } from './pages/Landing';
import { measuredPct, selfHostCommand, showcaseModels } from './data';

describe('the offerings comparison table puts every edition\'s measured numbers from site.json in one view', () => {
  const html = renderToStaticMarkup(<OfferingComparison models={showcaseModels} />);

  it('has one row per showcased edition with its size and facts score', () => {
    for (const m of showcaseModels) {
      expect(html).toContain(`data-testid="compare-${m.name}"`);
      expect(html).toContain(`${m.params_b}B`);
      expect(html).toContain(measuredPct(m.gate?.gates.facts?.actual, 1));
    }
  });

  it('links each row to the edition\'s pull command (or the mail CTA when weights are private)', () => {
    for (const m of showcaseModels) {
      const pull = selfHostCommand(m);
      if (pull) expect(html).toContain(`title="${pull.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"`);
      expect(html).toContain(`href="/models#${m.name}"`);
    }
    expect(html).not.toContain('/ 5');
  });

  it('renders on the landing page above the offering cards', () => {
    const page = renderToStaticMarkup(<Landing />);
    const table = page.indexOf('data-testid="offering-comparison"');
    expect(table).toBeGreaterThan(0);
    expect(table).toBeLessThan(page.indexOf(`id="${showcaseModels[0].name}"`) === -1 ? page.length : page.indexOf(`id="${showcaseModels[0].name}"`));
  });
});
