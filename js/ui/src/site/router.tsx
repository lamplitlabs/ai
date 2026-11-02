import { useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent } from 'react';

/**
 * A history-API router the size of this file: the site has four pages and no nested routes, so a dependency would
 * be more code than this. `useRoute()` re-renders on navigation; `Link` intercepts plain same-origin clicks.
 */
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
if (typeof window !== 'undefined') window.addEventListener('popstate', emit);

/** Pathname without a trailing slash (`/models/` and `/models` are the same page). */
export function normalizePath(pathname: string): string {
  const p = pathname.replace(/\/+$/, '');
  return p === '' ? '/' : p;
}

export function currentPath(): string {
  return typeof window === 'undefined' ? '/' : normalizePath(window.location.pathname);
}

export function navigate(to: string, { replace = false }: { replace?: boolean } = {}) {
  const url = new URL(to, window.location.href);
  if (url.href === window.location.href) return;
  window.history[replace ? 'replaceState' : 'pushState'](null, '', url);
  emit();
  if (url.hash) document.getElementById(url.hash.slice(1))?.scrollIntoView();
  else window.scrollTo({ top: 0 });
}

export function useRoute(): string {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    currentPath,
    () => '/',
  );
}

/** True when a click should stay in the app (left button, no modifier keys, same origin). */
export function isLocalClick(
  e: { button: number; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean; defaultPrevented: boolean },
  href: string,
  origin: string,
): boolean {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
  try {
    return new URL(href, origin).origin === origin;
  } catch {
    return false;
  }
}

export function Link({ to, onClick, ...rest }: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { to: string }) {
  return (
    <a
      href={to}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(e);
        if (rest.target && rest.target !== '_self') return;
        if (!isLocalClick(e, to, window.location.origin)) return;
        e.preventDefault();
        navigate(to);
      }}
      {...rest}
    />
  );
}
