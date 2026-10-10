import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Logo } from './Logo';

/**
 * The Lamplit Labs mark. vitest runs in node here (no jsdom / @testing-library in the lockfile, dependencies are
 * Tier 2), so - as in HubLink.test.tsx and TryLink.test.tsx - the tree is rendered to static markup and asserted
 * on as a string.
 */
const circleOf = (html: string) => html.match(/<circle[^>]*>/)?.[0] ?? '';
const gradientIdsOf = (html: string) => [...html.matchAll(/<radialGradient id="([^"]+)"/g)].map((m) => m[1]);

describe('Logo', () => {
  it('renders a decorative <svg> hidden from assistive tech', () => {
    const html = renderToStaticMarkup(<Logo />);
    expect(html.startsWith('<svg')).toBe(true);
    expect(html).toContain('aria-hidden="true"');
  });

  it('lights the disc fully by default and dims it to 0.55 when lit={false}', () => {
    expect(circleOf(renderToStaticMarkup(<Logo />))).toContain('opacity="1"');
    expect(circleOf(renderToStaticMarkup(<Logo lit />))).toContain('opacity="1"');
    expect(circleOf(renderToStaticMarkup(<Logo lit={false} />))).toContain('opacity="0.55"');
  });

  it('gives two instances distinct gradient ids and references its own gradient (duplicate <defs> ids never collide)', () => {
    const html = renderToStaticMarkup(
      <>
        <Logo />
        <Logo />
      </>,
    );
    const ids = gradientIdsOf(html);
    expect(ids).toHaveLength(2);
    expect(ids[0]).not.toBe(ids[1]);
    for (const id of ids) {
      expect(id).toMatch(/^logo-glow-[^:]+$/);
      expect(html).toContain(`fill="url(#${id})"`);
    }
  });
});
