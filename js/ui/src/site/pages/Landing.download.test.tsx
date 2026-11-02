import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

// The flagship is a module constant, so swap in a copy with no dtypes before Landing imports it.
vi.mock('../data', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../data')>();
  return { ...actual, flagship: actual.flagship ? { ...actual.flagship, dtypes: [] } : actual.flagship };
});

import { Landing } from './Landing';
import { NOT_MEASURED } from '../data';

/** Same contract as the other Datums: a model with no measured download size says NOT_MEASURED, never a bare dash. */
describe('Landing download Datum', () => {
  it(`says "${NOT_MEASURED}" when the flagship has no dtypes`, () => {
    const html = renderToStaticMarkup(<Landing />);
    const i = html.indexOf('download');
    expect(i).toBeGreaterThan(-1);
    const strip = html.slice(i, i + 600);
    expect(strip).toContain(NOT_MEASURED);
    expect(strip).not.toMatch(/>\s*[–—-]\s*</);
  });
});
