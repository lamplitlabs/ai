import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { OfferingCard } from './Offerings';
import { ModelCard } from './pages/Models';
import { EDITION_LABELS, hubRepoUrl, showcaseModels } from './data';

const publicRows = showcaseModels.filter((m) => m.hub.public && m.hub.repo);
const mailto = 'href="mailto:';

describe('public weights link to their Hugging Face repository (an edition is never "on request" once it is public)', () => {
  it('has at least one public edition per weights kind on offer', () => {
    expect(publicRows.some((m) => m.weights === 'onnx')).toBe(true);
    expect(publicRows.some((m) => m.weights === 'pytorch')).toBe(true);
  });
  for (const m of publicRows) {
    const url = hubRepoUrl(m.hub.repo!);
    it(`${m.name}: datasheet and offering card link ${url} in a new tab, never a mailto`, () => {
      for (const html of [renderToStaticMarkup(<ModelCard m={m} featured />), renderToStaticMarkup(<OfferingCard m={m} />)]) {
        expect(html).toContain(`href="${url}"`);
        expect(html).toContain('rel="noopener noreferrer"');
        expect(html).not.toContain(mailto);
        expect(html).toContain(EDITION_LABELS[m.edition]);
        expect(html).not.toMatch(/pro edition|on request/);
      }
    });
    if (m.weights === 'pytorch') {
      it(`${m.name}: the Hub link is the primary call and the weights size is shown`, () => {
        const html = renderToStaticMarkup(<ModelCard m={m} featured />);
        expect(html).toContain('Weights on Hugging Face');
        expect(m.weights_mb).toBeGreaterThan(1000);
        expect(html).toContain(`${(m.weights_mb! / 1000).toFixed(1)} GB`);
      });
    }
  }
  it('an edition that is not public is asked for by mail and named by its edition, not "pro"', () => {
    const m = { ...publicRows[0], browser: false, weights: 'pytorch' as const, dtypes: [], hub: { repo: null, public: false }, weights_mb: null };
    const html = renderToStaticMarkup(<ModelCard m={m} featured={false} />);
    expect(html).toContain(mailto);
    expect(html).toContain('on request');
    expect(html).not.toContain('huggingface.co');
  });
});
