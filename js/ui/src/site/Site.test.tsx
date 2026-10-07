import { describe, expect, it } from 'vitest';
import { descriptionFor, robotsFor, titleFor } from './Site';

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

describe('meta description follows the route', () => {
  it('describes the offerings on every known route', () => {
    for (const path of ['/', '/models', '/benchmarks', '/try']) expect(descriptionFor(path)).toMatch(/host yourself/);
  });
  it('tells a visitor on a stale or mistyped link that the page is missing instead of repeating the home pitch', () => {
    for (const path of ['/does-not-exist', '/models/typo', '/404']) {
      expect(descriptionFor(path)).toMatch(/does not exist/);
      expect(descriptionFor(path)).not.toBe(descriptionFor('/'));
    }
  });
});

describe('robots meta follows the route', () => {
  it('leaves every known route indexable', () => {
    for (const path of ['/', '/models', '/benchmarks', '/try']) expect(robotsFor(path)).toBeNull();
  });
  it('marks a mistyped URL noindex so a crawler sees the missing page despite the SPA rewrite answering 200', () => {
    for (const path of ['/does-not-exist', '/models/typo', '/404']) expect(robotsFor(path)).toBe('noindex');
  });
});
