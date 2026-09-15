import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TryLink } from './TryLink';
import { flagship, spaceUrl, tryLabel } from './data';

describe('TryLink (every "try" on the site opens the Hugging Face Space)', () => {
  it('links the flagship Space in a new tab without a referrer', () => {
    const html = renderToStaticMarkup(<TryLink />);
    expect(html).toContain(tryLabel());
    expect(flagship.hub.space).toBeTruthy();
    expect(html).toContain(`href="${spaceUrl(flagship.hub.space!)}"`);
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).not.toContain('href="/try');
  });
  it('renders nothing when the model names no Space', () => {
    expect(renderToStaticMarkup(<TryLink href={null} />)).toBe('');
  });
});
