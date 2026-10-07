import { describe, expect, it } from 'vitest';
import { titleFor } from './Site';

// vitest runs in the node environment (no DOM package is installed), so React effects never fire and the server
// renderer always snapshots the '/' route. `titleFor` is the only value the Site effect assigns to document.title,
// so the tab title for an unknown path is asserted through it.
describe('document.title follows the route', () => {
  it('names the home page on /', () => {
    expect(titleFor('/')).toMatch(/^Lamplit Labs AI/);
  });
  it('gives a mistyped URL a Not found title instead of the home page title', () => {
    for (const path of ['/does-not-exist', '/models/typo', '/404']) {
      expect(titleFor(path)).toBe('Not found - Lamplit Labs AI');
      expect(titleFor(path)).not.toBe(titleFor('/'));
    }
  });
});
