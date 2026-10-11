import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Reveal, useReveal } from './Reveal';
import { reducedMotion } from './Illustrations';

/**
 * The instrument-panel vocabulary of the site: numbered section heads, mono labels, live datums that count up
 * when they scroll into view, and status chips. Every page composes these so the three pages read as one lab.
 */

/** `01 / Where it runs` - a mono index and label with a hairline running out to the right. */
export function Index({ n, children, className = '' }: { n: string; children: ReactNode; className?: string }) {
  return (
    <div className={`mono-label flex items-center gap-3 text-primary ${className}`}>
      <span className="tnum">{n}</span>
      <span className="h-px w-6 bg-primary/50" aria-hidden="true" />
      <span className="text-muted-foreground">{children}</span>
    </div>
  );
}

/**
 * Editorial section head: the index and eyebrow in a narrow left column, the title and lead to the right, a rule
 * above. Centred variant for the closing sections.
 */
export function SectionHead({ n, eyebrow, title, lead, id, align = 'left', aside }: { n: string; eyebrow: string; title: ReactNode; lead?: ReactNode; id?: string; align?: 'left' | 'center'; aside?: ReactNode }) {
  if (align === 'center') {
    return (
      <Reveal className="mb-14 text-center" id={id}>
        <Index n={n} className="justify-center">
          {eyebrow}
        </Index>
        <h2 className="font-display mt-5 text-balance text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">{title}</h2>
        {lead ? <p className="mx-auto mt-5 max-w-2xl text-balance text-base text-muted-foreground sm:text-lg">{lead}</p> : null}
      </Reveal>
    );
  }
  return (
    <Reveal className="mb-14 border-t border-border pt-8" id={id}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,14rem)_1fr]">
        <Index n={n} className="self-start lg:mt-3">
          {eyebrow}
        </Index>
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <h2 className="font-display text-balance text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">{title}</h2>
            {lead ? <p className="mt-5 max-w-2xl text-balance text-base text-muted-foreground sm:text-lg">{lead}</p> : null}
          </div>
          {aside ? <div className="lg:pb-1">{aside}</div> : null}
        </div>
      </div>
    </Reveal>
  );
}

/** Live status chip: a pulsing dot and a mono line. */
export function Status({ ok = true, children, className = '' }: { ok?: boolean; children: ReactNode; className?: string }) {
  return (
    <span className={`mono-label inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1.5 text-muted-foreground backdrop-blur ${className}`}>
      <span className={`status-dot ${ok ? '' : 'pending'}`} aria-hidden="true" />
      {children}
    </span>
  );
}

/** Eases a number from 0 to `target` once `on` becomes true; reduced motion jumps straight to the target. */
export function useCountUp(target: number, on: boolean, duration = 1400): number {
  const [value, setValue] = useState(() => (reducedMotion() ? target : 0));
  const done = useRef(false);
  useEffect(() => {
    if (!on || done.current) return;
    done.current = true;
    if (reducedMotion() || duration <= 0) {
      setValue(target);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setValue(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [on, target, duration]);
  return value;
}

type DatumProps = {
  k: string;
  /** the number the display counts up to; omit for a text-only datum */
  value?: number;
  /** turns the live number into text (default: rounded integer) */
  format?: (v: number) => string;
  /** shown instead of a number */
  text?: string;
  sub?: ReactNode;
  ok?: boolean;
  className?: string;
};

/** A measured value in the lab's house style: mono key, big display numeral, small note. */
export function Datum({ k, value, format = (v) => Math.round(v).toString(), text, sub, ok, className = '' }: DatumProps) {
  const { ref, visible } = useReveal<HTMLDivElement>(0.4);
  const live = useCountUp(value ?? 0, visible);
  const tone = ok === true ? 'text-success' : ok === false ? 'text-warning' : '';
  return (
    <div ref={ref} className={`min-w-0 ${className}`}>
      <div className="mono-label text-muted-foreground">{k}</div>
      <div className={`datum-value mt-2 text-3xl font-semibold leading-none sm:text-4xl ${tone}`}>{text ?? format(live)}</div>
      {sub ? <div className="mt-2 text-xs leading-relaxed text-muted-foreground">{sub}</div> : null}
    </div>
  );
}

/** A thin measured bar with an optional gate tick; `ok` false paints it amber-orange. */
export function Gauge({ value, threshold, ok, className = '' }: { value: number; threshold?: number; ok?: boolean; className?: string }) {
  const { ref, visible } = useReveal<HTMLDivElement>(0.3);
  const width = visible ? Math.max(1.5, value * 100) : 0;
  return (
    <div ref={ref} className={`relative h-1.5 w-full overflow-visible rounded-full bg-muted ${className}`}>
      <div className={`h-full rounded-full transition-[width] duration-1000 ease-out ${ok === false ? 'bg-warning' : 'bg-primary shadow-[0_0_10px_color-mix(in_srgb,var(--color-glow)_55%,transparent)]'}`} style={{ width: `${width}%` }} />
      {threshold != null ? <div className="absolute -inset-y-1 w-px bg-foreground/60" style={{ left: `${threshold * 100}%` }} title={`gate ${Math.round(threshold * 100)}%`} /> : null}
    </div>
  );
}

/** Mono key over a plain value: the spec-sheet cell. */
export function Spec({ k, v, sub, icon }: { k: string; v: ReactNode; sub?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="mono-label flex items-center gap-1.5 text-muted-foreground">
        {icon ? <span className="text-primary">{icon}</span> : null}
        {k}
      </dt>
      <dd className="mt-1.5 text-sm font-medium [overflow-wrap:anywhere]">{v}</dd>
      {sub ? <dd className="mt-0.5 text-xs text-muted-foreground [overflow-wrap:anywhere]">{sub}</dd> : null}
    </div>
  );
}

/** Small mono tag (`latest`, `q8`, `passed`). */
export function Tag({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'primary' | 'success' | 'warning' }) {
  const tones = {
    muted: 'border-border text-muted-foreground',
    primary: 'border-primary/30 bg-primary/10 text-primary',
    success: 'border-success/30 bg-success/10 text-success',
    warning: 'border-warning/30 bg-warning/10 text-warning',
  } as const;
  return <span className={`mono-label rounded-md border px-2 py-1 ${tones[tone]}`}>{children}</span>;
}
