import { useEffect, useState } from 'react';
import { Cpu, Gauge, GraduationCap, Laptop, Package, ScrollText, Server, Smartphone, Target, Cloud, Globe, Radio } from 'lucide-react';
import { useReveal } from './Reveal';

/** True when the user prefers reduced motion (re-evaluated per render; cheap). */
export function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Hero illustration: a large model in someone else's data centre is distilled, through a beam of light, into a small
 * model that sits on your own device, with the places it can run orbiting around it. CSS animation only.
 */
export function HeroVisual() {
  const still = reducedMotion();
  const particles = still ? [] : Array.from({ length: 7 }, (_, i) => i);
  return (
    <div className="relative mx-auto w-full max-w-xl select-none" aria-hidden="true">
      <svg viewBox="0 0 560 300" className="w-full" fill="none">
        <defs>
          <radialGradient id="hero-teacher" cx="45%" cy="40%" r="65%">
            <stop offset="0%" stopColor="var(--color-muted-foreground)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--color-muted-foreground)" stopOpacity="0.05" />
          </radialGradient>
          <radialGradient id="hero-student" cx="45%" cy="40%" r="70%">
            <stop offset="0%" stopColor="hsl(44, 95%, 64%)" />
            <stop offset="55%" stopColor="hsl(38, 90%, 56%)" />
            <stop offset="100%" stopColor="hsl(31, 92%, 47%)" />
          </radialGradient>
          <linearGradient id="hero-beam" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="var(--color-muted-foreground)" stopOpacity="0.15" />
            <stop offset="100%" stopColor="var(--color-glow)" stopOpacity="0.5" />
          </linearGradient>
        </defs>

        {/* the large model: far away, expensive, not yours */}
        <g className="text-muted-foreground">
          <circle cx="120" cy="150" r="92" fill="url(#hero-teacher)" stroke="currentColor" strokeOpacity="0.25" strokeDasharray="4 6" />
          <circle cx="120" cy="150" r="66" stroke="currentColor" strokeOpacity="0.18" />
          <circle cx="120" cy="150" r="40" stroke="currentColor" strokeOpacity="0.14" />
          <text x="120" y="290" textAnchor="middle" className="fill-muted-foreground text-[11px] font-medium uppercase tracking-[0.18em]">
            large model · their cloud
          </text>
        </g>

        {/* the beam: knowledge flows, the shape shrinks */}
        <path d="M214 118 L392 140 L392 160 L214 182 Z" fill="url(#hero-beam)" />
        <path d="M214 150 L392 150" stroke="var(--color-glow)" strokeOpacity="0.8" strokeWidth="2" className="flow-line" strokeLinecap="round" />
        <text x="303" y="290" textAnchor="middle" className="fill-primary text-[11px] font-medium uppercase tracking-[0.18em]">
          → distilled into →
        </text>
        {particles.map((i) => (
          <circle key={i} cx={230 + i * 24} cy={150 + ((i % 3) - 1) * 6} r="2" fill="var(--color-glow)" className="particle" style={{ animationDelay: `${i * 0.3}s` }} />
        ))}

        {/* the small model: yours, glowing, on your device */}
        <g>
          <g className="orbit" style={{ transformBox: 'fill-box' }}>
            <circle cx="440" cy="150" r="78" stroke="var(--color-glow)" strokeOpacity="0.25" strokeDasharray="2 8" />
          </g>
          <rect x="404" y="114" width="72" height="72" rx="18" fill="#0a0a0f" />
          <circle cx="440" cy="150" r="24" fill="url(#hero-student)" className="lamp-glow" />
          <path d="M434 138 h7 a1.5 1.5 0 0 1 1.5 1.5 v16 h9 a1.5 1.5 0 0 1 1.5 1.5 v5 a1.5 1.5 0 0 1 -1.5 1.5 h-17.5 a1.5 1.5 0 0 1 -1.5 -1.5 v-22.5 a1.5 1.5 0 0 1 1.5 -1.5 Z" fill="#0a0a0f" />
          <text x="440" y="290" textAnchor="middle" className="fill-foreground text-[11px] font-medium uppercase tracking-[0.18em]">
            your model · your machine
          </text>
        </g>
      </svg>

      {/* where it runs: pinned around the small model */}
      <ul className="pointer-events-none absolute inset-0 text-[11px] font-medium text-muted-foreground">
        <Orbiter style={{ right: '3%', top: '10%' }} icon={<Globe className="size-3.5" />} label="browser" />
        <Orbiter style={{ right: '-3%', top: '44%' }} icon={<Laptop className="size-3.5" />} label="laptop" />
        <Orbiter style={{ right: '4%', bottom: '24%' }} icon={<Server className="size-3.5" />} label="on-prem" />
        <Orbiter style={{ right: '31%', top: '8%' }} icon={<Cloud className="size-3.5" />} label="private cloud" />
        <Orbiter style={{ right: '32%', bottom: '24%' }} icon={<Smartphone className="size-3.5" />} label="your app" />
        <Orbiter style={{ right: '16%', bottom: '14%' }} icon={<Radio className="size-3.5" />} label="edge · IoT" />
      </ul>
    </div>
  );
}

function Orbiter({ icon, label, style }: { icon: React.ReactNode; label: string; style: React.CSSProperties }) {
  return (
    <li className="absolute inline-flex items-center gap-1 rounded-full border border-border bg-card/90 px-2 py-0.5 shadow-sm backdrop-blur" style={style}>
      <span className="text-primary">{icon}</span>
      {label}
    </li>
  );
}

export const RUNTIMES = [
  { icon: Globe, title: 'In the browser', text: 'WebGPU or WebAssembly. Nothing installed, nothing uploaded - the model downloads once and stays in the browser cache.' },
  { icon: Laptop, title: 'On a laptop or desktop', text: 'A native runtime on the machine that already has the data. Works on a train, on a plane, behind a firewall.' },
  { icon: Server, title: 'On-prem or private cloud', text: 'An inference endpoint inside your network, behind your identity provider, on the hardware you already own or rent.' },
  { icon: Smartphone, title: 'Inside your app', text: 'Shipped with your product as a file. Your users get the feature without an account at a third party.' },
  { icon: Radio, title: 'On the edge and IoT', text: 'Small enough for gateways, kiosks and industrial controllers where the round trip to a cloud is the problem.' },
];

const STAGES = [
  {
    key: 'define',
    icon: Target,
    title: 'Define the job',
    short: 'One narrow, measurable task.',
    long: 'A model that does one thing well is small, testable and honest about its limits. We write the job down as the checks it has to pass: what a right answer looks like, what is never allowed, which language, which shape.',
  },
  {
    key: 'knowledge',
    icon: ScrollText,
    title: 'Gather verified knowledge',
    short: 'Curated, checked sources - not the whole internet.',
    long: 'The facts the model must get right are collected and reviewed first, then attached to every training example and to every answer at run time. When the model speaks, it speaks from a reference we can point at.',
  },
  {
    key: 'teach',
    icon: GraduationCap,
    title: 'Learn from a large model',
    short: 'A big teacher writes the answers; each one is checked.',
    long: 'A large model produces worked answers for thousands of realistic prompts. The answers are checked against the reference and against the rules of the job before anything is learned from them - the teacher is a source, not an oracle.',
  },
  {
    key: 'train',
    icon: Cpu,
    title: 'Train a small student',
    short: '1-3 billion parameters that fit your hardware.',
    long: 'An open-weights base model a hundred times smaller than the teacher is fine-tuned on the checked answers. Hours on one rented GPU, not months on a fleet. The weights are yours when it finishes.',
  },
  {
    key: 'measure',
    icon: Gauge,
    title: 'Measure, then judge',
    short: 'Release gates plus independent judges.',
    long: 'A fixed suite of scenarios runs against the exported model: facts against the reference, no loops, finished answers, the right language. Then independent frontier models score every answer, and their scores are published beside the gates. Every number is published.',
  },
  {
    key: 'ship',
    icon: Package,
    title: 'Compress and ship',
    short: 'Quantised, packaged for browser, server or device.',
    long: 'The student is exported to an open runtime format and quantised so it fits where it has to run. You receive the weights, the export, the report and the runbook - and you decide when it changes.',
  },
];

/** The six stages of building a model, lighting up one after another while the block is on screen. */
export function ProcessAnimation() {
  const { ref, visible } = useReveal<HTMLDivElement>(0.3);
  const still = reducedMotion();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (!visible || still || paused) return;
    const t = setInterval(() => setActive((a) => (a + 1) % STAGES.length), 2600);
    return () => clearInterval(t);
  }, [visible, still, paused]);
  const stage = STAGES[active];
  const filled = still ? 1 : active / (STAGES.length - 1);
  return (
    <div ref={ref} className="glass corner-marks rounded-3xl p-5 sm:p-7 lg:p-8" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div className="mono-label flex items-center gap-3 text-muted-foreground">
          <span className="text-primary">pipeline</span>
          <span className="h-px w-6 bg-border" aria-hidden="true" />
          <span className="max-sm:hidden">define → knowledge → teach → train → measure → ship</span>
          <span className="sm:hidden">six stages</span>
        </div>
        <span className="mono-label tnum text-muted-foreground/70">{paused ? 'paused · hover to read' : still ? 'all stages' : 'auto-advancing · hover to pause'}</span>
      </div>
      <ol className="relative grid gap-4 sm:grid-cols-3 lg:grid-cols-6" aria-label="How a model is built">
        {/* the rail and the part of it already travelled */}
        <div className="pointer-events-none absolute inset-x-6 top-6 hidden h-px bg-border lg:block" aria-hidden="true">
          <div className="h-full bg-primary shadow-[0_0_10px_color-mix(in_srgb,var(--color-glow)_70%,transparent)] transition-[width] duration-700 ease-out" style={{ width: `${filled * 100}%` }} />
          <svg className="absolute inset-0 h-px w-full overflow-visible" viewBox="0 0 1200 2" preserveAspectRatio="none" aria-hidden="true">
            <line x1="0" y1="1" x2="1200" y2="1" stroke="var(--color-glow)" strokeWidth="2" className="flow-line" strokeOpacity={still ? 0 : 0.6} />
          </svg>
        </div>
        {STAGES.map((s, i) => {
          const Icon = s.icon;
          const on = still || i === active;
          const done = !still && i < active;
          return (
            <li key={s.key} className="stage relative" data-active={on || done}>
              <button type="button" onClick={() => setActive(i)} aria-pressed={i === active} className="group w-full text-left">
                <div className={`stage-dot relative z-10 mx-auto flex size-12 items-center justify-center rounded-xl border transition-all duration-500 lg:mx-0 ${on ? 'border-primary bg-primary text-primary-foreground' : done ? 'border-primary/50 bg-card text-primary' : 'border-border bg-card text-muted-foreground group-hover:border-primary/40'}`}>
                  <Icon className="size-5" />
                </div>
                <div className="mt-4 text-center lg:text-left">
                  <div className={`mono-label tnum transition-colors ${on ? 'text-primary' : 'text-muted-foreground/70'}`}>step 0{i + 1}</div>
                  <div className="mt-1.5 text-sm font-semibold">{s.title}</div>
                  <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.short}</div>
                </div>
              </button>
            </li>
          );
        })}
      </ol>
      <div className="mt-8 grid items-center gap-6 rounded-2xl border border-border bg-background/50 p-6 md:grid-cols-[1fr_1.4fr] md:p-8" aria-live="polite">
        <StageArt stage={stage.key} still={still} />
        <div key={stage.key} className="animate-in">
          <div className="flex items-center justify-between gap-4">
            <div className="mono-label tnum text-primary">
              step 0{active + 1} <span className="text-muted-foreground/70">/ 0{STAGES.length}</span>
            </div>
            <div className="segments w-28 grid-cols-6" aria-hidden="true">
              {STAGES.map((s, i) => (
                <i key={s.key} data-on={still || i <= active} />
              ))}
            </div>
          </div>
          <h3 className="font-display mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{stage.title}</h3>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">{stage.long}</p>
        </div>
      </div>
    </div>
  );
}

/** One small illustrative drawing per stage; deliberately abstract. */
function StageArt({ stage, still }: { stage: string; still: boolean }) {
  const dash = still ? undefined : 'flow-line';
  return (
    <svg viewBox="0 0 240 160" className="mx-auto w-full max-w-xs text-muted-foreground" fill="none" aria-hidden="true" key={stage}>
      {stage === 'define' ? (
        <g className="animate-in">
          <circle cx="120" cy="80" r="60" stroke="currentColor" strokeOpacity="0.25" />
          <circle cx="120" cy="80" r="40" stroke="currentColor" strokeOpacity="0.35" />
          <circle cx="120" cy="80" r="20" stroke="var(--color-glow)" strokeWidth="2" />
          <circle cx="120" cy="80" r="6" fill="var(--color-glow)" className="lamp-glow" />
          <path d="M40 30 L114 76" stroke="var(--color-glow)" strokeWidth="1.5" className={dash} />
        </g>
      ) : stage === 'knowledge' ? (
        <g className="animate-in">
          {[0, 1, 2].map((i) => (
            <g key={i} transform={`translate(${52 + i * 14} ${34 + i * 12})`}>
              <rect width="96" height="72" rx="8" fill="var(--color-background)" stroke="currentColor" strokeOpacity="0.35" />
              <path d="M14 20 h68 M14 34 h52 M14 48 h60" stroke="currentColor" strokeOpacity="0.35" strokeWidth="3" strokeLinecap="round" />
            </g>
          ))}
          <circle cx="188" cy="40" r="16" fill="var(--color-glow)" className="lamp-glow" />
          <path d="M180 40 l6 6 l11 -12" stroke="#0a0a0f" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      ) : stage === 'teach' ? (
        <g className="animate-in">
          <circle cx="62" cy="80" r="46" stroke="currentColor" strokeOpacity="0.3" strokeDasharray="4 6" />
          <circle cx="62" cy="80" r="28" stroke="currentColor" strokeOpacity="0.25" />
          <path d="M112 80 H178" stroke="var(--color-glow)" strokeWidth="2" className={dash} strokeLinecap="round" />
          <rect x="178" y="62" width="36" height="36" rx="10" fill="#0a0a0f" />
          <circle cx="196" cy="80" r="11" fill="var(--color-glow)" className="lamp-glow" />
        </g>
      ) : stage === 'train' ? (
        <g className="animate-in">
          <path d="M24 130 H216" stroke="currentColor" strokeOpacity="0.3" />
          <path d="M24 130 V24" stroke="currentColor" strokeOpacity="0.3" />
          <path d="M28 40 C 60 40, 70 90, 100 100 S 160 116, 212 120" stroke="var(--color-glow)" strokeWidth="2.5" strokeLinecap="round" className={still ? undefined : 'draw-path'} />
          <text x="34" y="30" className="fill-current text-[10px]">
            loss
          </text>
          <text x="184" y="146" className="fill-current text-[10px]">
            steps
          </text>
        </g>
      ) : stage === 'measure' ? (
        <g className="animate-in">
          {[0, 1, 2, 3].map((i) => (
            <g key={i} transform={`translate(40 ${28 + i * 28})`}>
              <rect width="160" height="18" rx="6" fill="var(--color-background)" stroke="currentColor" strokeOpacity="0.3" />
              <rect width={[152, 140, 96, 156][i]} height="18" rx="6" fill={i === 2 ? 'currentColor' : 'var(--color-glow)'} fillOpacity={i === 2 ? 0.35 : 0.85} />
            </g>
          ))}
          <path d="M214 34 l5 5 l9 -10 M214 62 l5 5 l9 -10 M214 118 l5 5 l9 -10" stroke="var(--color-glow)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M215 86 l12 12 M227 86 l-12 12" stroke="currentColor" strokeOpacity="0.6" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      ) : (
        <g className="animate-in">
          <rect x="94" y="56" width="52" height="52" rx="14" fill="#0a0a0f" />
          <circle cx="120" cy="82" r="17" fill="var(--color-glow)" className="lamp-glow" />
          <path d="M94 82 H40 M146 82 H200 M120 56 V16 M120 108 V148" stroke="var(--color-glow)" strokeWidth="1.5" className={dash} strokeLinecap="round" />
          <rect x="14" y="66" width="26" height="32" rx="5" stroke="currentColor" strokeOpacity="0.5" />
          <rect x="200" y="70" width="28" height="24" rx="5" stroke="currentColor" strokeOpacity="0.5" />
          <rect x="106" y="2" width="28" height="14" rx="4" stroke="currentColor" strokeOpacity="0.5" />
          <rect x="108" y="146" width="24" height="12" rx="3" stroke="currentColor" strokeOpacity="0.5" />
        </g>
      )}
    </svg>
  );
}
