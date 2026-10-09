import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

// models is a module constant, so swap in a copy where no model carries a gate before Benchmarks imports it.
vi.mock('../data', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../data')>();
  return { ...actual, models: actual.models.map((m) => ({ ...m, gate: undefined })) };
});

import { Benchmarks, NO_RUNS_YET } from './Benchmarks';

/** A freshly seeded site with no gate run shows a stated reason instead of an empty Progression table. */
describe('Benchmarks progression empty state', () => {
  it('says no run has been published when no model has a gate', () => {
    const html = renderToStaticMarkup(<Benchmarks />);
    expect(html).toContain(NO_RUNS_YET);
    expect(html).toContain('data-benchmarks-empty');
    expect(html).not.toContain('lab-table');
    expect(html).toContain('no model · gate not passed');
  });
});
