import { useState } from 'react';
import { useTheme } from './theme';

/** Pendant-lamp theme toggle from lamplitlabs.com: light mode = lamp on. Pull the cord to switch. */
export function LampToggle() {
  const [dark, setDark] = useTheme();
  const [pulling, setPulling] = useState(false);
  const lit = !dark;
  const pull = () => {
    setPulling(true);
    setDark(!dark);
    setTimeout(() => setPulling(false), 500);
  };
  return (
    <button
      type="button"
      onClick={pull}
      className="group relative flex h-10 w-9 items-start justify-center overflow-visible text-foreground"
      aria-label={lit ? 'Turn off the light' : 'Turn on the light'}
      title={lit ? 'Turn off the light' : 'Turn on the light'}
      data-theme={dark ? 'dark' : 'light'}
    >
      <svg viewBox="0 0 36 40" className={`h-10 w-9 transition-all duration-500 ${lit ? 'lamp-glow' : ''}`} fill="none" aria-hidden="true">
        <line x1="18" y1="0" x2="18" y2="5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M13.5 15 L8 36 H28 L22.5 15 Z" fill="hsl(40, 92%, 60%)" opacity={lit ? 0.35 : 0} className="transition-opacity duration-500" />
        <path d="M10.5 12.5 a7.5 7.5 0 0 1 15 0 v1 a1 1 0 0 1 -1 1 h-13 a1 1 0 0 1 -1 -1 Z" fill="currentColor" />
        <circle cx="18" cy="16.5" r="2.4" fill={lit ? 'hsl(40, 92%, 60%)' : 'currentColor'} opacity={lit ? 1 : 0.3} className="transition-all duration-500" />
      </svg>
      <div className={`absolute left-[24px] top-[14px] transition-transform duration-300 ${pulling ? 'translate-y-1.5' : 'group-hover:translate-y-1'}`}>
        <svg width="8" height="22" viewBox="0 0 8 22" aria-hidden="true">
          <path d="M4 0 Q3 6 4 11 Q5 15 4 18" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.4" />
          <circle cx="4" cy="19" r="2.2" fill="currentColor" opacity="0.35" />
        </svg>
      </div>
    </button>
  );
}
