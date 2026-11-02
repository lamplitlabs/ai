import { useSyncExternalStore } from 'react';

/**
 * One light/dark setting for the whole site (`<html class="dark">`), stored under `lamplit.theme` - the site's only
 * localStorage key (ADR-001). Without a stored value the system preference decides.
 */
const KEY = 'lamplit.theme';
const listeners = new Set<() => void>();

function initial(): boolean {
  if (typeof window === 'undefined') return false;
  // `?theme=dark|light` previews one theme without saving it (screenshots, js/check-site.mjs)
  const forced = new URLSearchParams(window.location.search).get('theme');
  if (forced === 'dark' || forced === 'light') return forced === 'dark';
  const stored = localStorage.getItem(KEY);
  if (stored === 'dark' || stored === 'light') return stored === 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

let dark = initial();
if (typeof document !== 'undefined') document.documentElement.classList.toggle('dark', dark);

export function isDark() {
  return dark;
}

export function setDark(next: boolean) {
  if (next === dark) return;
  dark = next;
  localStorage.setItem(KEY, next ? 'dark' : 'light');
  document.documentElement.classList.toggle('dark', next);
  listeners.forEach((l) => l());
}

export function useTheme(): [boolean, (next: boolean) => void] {
  const value = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    isDark,
    () => false,
  );
  return [value, setDark];
}
