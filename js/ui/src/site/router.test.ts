import { describe, expect, it } from 'vitest';
import { isLocalClick, normalizePath } from './router';

const plain = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, defaultPrevented: false };
const origin = 'https://ai.lamplitlabs.com';

describe('router helpers', () => {
  it('normalises trailing slashes', () => {
    expect(normalizePath('/')).toBe('/');
    expect(normalizePath('')).toBe('/');
    expect(normalizePath('/models/')).toBe('/models');
    expect(normalizePath('/try')).toBe('/try');
  });
  it('keeps plain same-origin clicks in the app', () => {
    expect(isLocalClick(plain, '/models', origin)).toBe(true);
    expect(isLocalClick(plain, `${origin}/benchmarks#some-model-v1`, origin)).toBe(true);
  });
  it('lets modifier clicks, external links and handled events through to the browser', () => {
    expect(isLocalClick({ ...plain, metaKey: true }, '/models', origin)).toBe(false);
    expect(isLocalClick({ ...plain, button: 1 }, '/models', origin)).toBe(false);
    expect(isLocalClick({ ...plain, defaultPrevented: true }, '/models', origin)).toBe(false);
    expect(isLocalClick(plain, 'https://www.lamplitlabs.com/', origin)).toBe(false);
    expect(isLocalClick(plain, 'mailto:hello@lamplitlabs.com', origin)).toBe(false);
  });
});
