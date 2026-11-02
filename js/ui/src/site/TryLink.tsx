import type { ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { flagship, tryLabel, tryUrl } from './data';

/**
 * Every "try" on the site opens the Hugging Face Space that runs the model (ADR-001: the site ships no runtime of its
 * own; each offering names where it can be tried). Renders nothing while no model names a Space.
 */
export function TryLink({ href = tryUrl(flagship), className, children }: { href?: string | null; className?: string; children?: ReactNode }) {
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children ?? tryLabel()} <ArrowUpRight className="size-4" aria-hidden="true" />
    </a>
  );
}
