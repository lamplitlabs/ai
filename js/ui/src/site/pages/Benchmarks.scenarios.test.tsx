import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

// siteData is a module constant, so swap in a copy with scenarios: null before Benchmarks imports it.
vi.mock('../data', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../data')>();
  return { ...actual, siteData: { ...actual.siteData, suite: { ...actual.siteData.suite, scenarios: null } } };
});

import { Benchmarks } from './Benchmarks';
import { NOT_MEASURED } from '../data';

/** Same contract as the other Datums: an unmeasured scenario count says NOT_MEASURED, never a bare dash. */
describe('Benchmarks suite scenario count', () => {
  it(`says "${NOT_MEASURED}" when suite.scenarios is null`, () => {
    const html = renderToStaticMarkup(<Benchmarks />);
    const i = html.indexOf('fixed suite of');
    expect(i).toBeGreaterThan(-1);
    const strip = html.slice(i, i + 80);
    expect(strip).toContain(NOT_MEASURED);
    expect(strip).not.toMatch(/of\s*[–—-]\s*learner/);
  });
});
