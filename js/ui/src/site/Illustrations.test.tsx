import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { FakeNode, installFakeDom } from './testDom';
import { HeroVisual, reducedMotion } from './Illustrations';

/**
 * <HeroVisual> is the first thing a visitor sees on the Landing page. It animates seven light "particles" along the
 * distillation beam with CSS, and must leave them out entirely for users who asked for reduced motion - otherwise
 * the hero keeps moving for exactly the people who said it should not. vitest runs in node here (no jsdom /
 * @testing-library in the lockfile, dependencies are Tier 2), so - as in Reveal.test.tsx and lab.test.tsx - the
 * shared DOM stand-in lets the real React tree mount and a hand-written matchMedia stands in for the browser.
 */

const doc = installFakeDom();

let prefersReduced = false;
let root: Root | null = null;
let container: FakeNode;

beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = globalThis as any;
  g.matchMedia = (q: string) => ({ matches: q.includes('prefers-reduced-motion') && prefersReduced });
});

beforeEach(() => {
  prefersReduced = false;
});

afterEach(() => {
  if (root) act(() => root!.unmount());
  root = null;
});

function mount() {
  container = new FakeNode('div', doc);
  root = createRoot(container as unknown as Element);
  act(() => root!.render(<HeroVisual />));
  const el = container.children[0];
  if (!el) throw new Error('HeroVisual rendered nothing');
  return el;
}

const classes = (el: FakeNode) => el.className.split(/\s+/).filter(Boolean);
const particlesIn = (el: FakeNode) => el.findAll((n) => n.nodeName === 'CIRCLE' && classes(n).includes('particle'));

describe('reducedMotion()', () => {
  it('mirrors the prefers-reduced-motion media query', () => {
    expect(reducedMotion()).toBe(false);
    prefersReduced = true;
    expect(reducedMotion()).toBe(true);
  });
});

describe('HeroVisual (the landing hero animates only for users who did not ask for reduced motion)', () => {
  it('renders the illustration, hidden from assistive tech, with the beam and the six runtime labels', () => {
    const el = mount();
    expect(el.nodeName).toBe('DIV');
    expect(el.attrs['aria-hidden']).toBe('true');
    expect(el.find((n) => n.nodeName === 'SVG')).not.toBeNull();
    expect(el.text).toContain('large model · their cloud');
    expect(el.text).toContain('your model · your machine');
    const labels = el.findAll((n) => n.nodeName === 'LI').map((n) => n.text);
    expect(labels).toEqual(['browser', 'laptop', 'on-prem', 'private cloud', 'your app', 'edge · IoT']);
  });

  it('draws seven staggered particles along the beam when motion is allowed', () => {
    const el = mount();
    const particles = particlesIn(el);
    expect(particles).toHaveLength(7);
    // each particle starts a little later than the previous one, so the beam reads as flowing
    expect(particles.map((p) => parseFloat(String(p.style.animationDelay)))).toEqual([0, 1, 2, 3, 4, 5, 6].map((i) => expect.closeTo(i * 0.3, 5)));
  });

  it('omits the particles entirely when prefers-reduced-motion is set, but still renders the rest', () => {
    prefersReduced = true;
    const el = mount();
    expect(particlesIn(el)).toHaveLength(0);
    expect(el.find((n) => n.nodeName === 'SVG')).not.toBeNull();
    expect(el.findAll((n) => n.nodeName === 'LI')).toHaveLength(6);
  });
});
