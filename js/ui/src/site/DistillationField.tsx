import { useEffect, useRef } from 'react';
import { Cloud, Globe, Laptop, Radio, Server, Smartphone } from 'lucide-react';
import { HeroVisual, reducedMotion } from './Illustrations';

/**
 * The hero of the lab: a large model in someone else's cloud (a diffuse cloud of particles on the left) is distilled
 * into a small one that sits lit on your own device (the core on the right). Particles accelerate and warm from grey
 * to amber as they converge - knowledge compressing into a file you own. Canvas 2D, ~300 particles, pauses when off
 * screen or in a hidden tab, bends around the cursor. Reduced motion falls back to the static SVG illustration.
 */

type Particle = { sx: number; sy: number; t: number; speed: number; amp: number; phase: number; freq: number; w: number; px: number; py: number };
type Hsl = [number, number, number];

const LOGO_L = 'M42 31 h10 a2 2 0 0 1 2 2 v24 h13 a2 2 0 0 1 2 2 v8 a2 2 0 0 1 -2 2 h-25 a2 2 0 0 1 -2 -2 v-34 a2 2 0 0 1 2 -2 Z';
const AMBER: Hsl = [38, 90, 52];
const GREY_DARK: Hsl = [40, 8, 60];
const GREY_LIGHT: Hsl = [30, 8, 40];

function parseHsl(v: string, fallback: Hsl): Hsl {
  const m = /hsl\(\s*([\d.]+)[\s,]+([\d.]+)%[\s,]+([\d.]+)%/.exec(v);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : fallback;
}
const hsla = ([h, s, l]: Hsl, a: number) => `hsla(${h.toFixed(0)}, ${s.toFixed(0)}%, ${l.toFixed(0)}%, ${a})`;
const mix = (a: Hsl, b: Hsl, t: number): Hsl => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const easeIn = (t: number) => t * t * (1.6 - 0.6 * t);

export function DistillationField({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const still = reducedMotion();
    const glyph = typeof Path2D !== 'undefined' ? new Path2D(LOGO_L) : null;

    let W = 0;
    let H = 0;
    let dpr = 1;
    let particles: Particle[] = [];
    let glow: Hsl = AMBER;
    let grey: Hsl = GREY_DARK;
    let dark = true;
    let ramp: string[] = [];
    let raf = 0;
    let running = false;
    let onScreen = true;
    let last = performance.now();
    let clock = 0;
    const mouse = { x: -1e9, y: -1e9 };

    const readColors = () => {
      const cs = getComputedStyle(canvas);
      dark = document.documentElement.classList.contains('dark');
      glow = parseHsl(cs.getPropertyValue('--color-glow'), AMBER);
      grey = parseHsl(cs.getPropertyValue('--color-muted-foreground'), dark ? GREY_DARK : GREY_LIGHT);
      // 16 colour stops from grey to amber: particles pick one by progress instead of allocating strings per frame
      ramp = Array.from({ length: 16 }, (_, i) => hsla(mix(grey, glow, Math.pow(i / 15, 0.8)), 1));
    };

    const spawn = (p: Particle) => {
      // a point inside the teacher disc, denser towards its centre
      const r = teacherR() * Math.sqrt(Math.random()) * 0.95;
      const a = Math.random() * Math.PI * 2;
      p.sx = teacherX() + Math.cos(a) * r;
      p.sy = midY() + Math.sin(a) * r * 0.92;
      p.t = 0;
      p.speed = 0.09 + Math.random() * 0.13;
      p.amp = (Math.random() - 0.5) * H * 0.16;
      p.phase = Math.random() * Math.PI * 2;
      p.freq = 2 + Math.random() * 3;
      p.w = 0.7 + Math.random() * 1.1;
      p.px = p.sx;
      p.py = p.sy;
    };
    const teacherX = () => W * 0.24;
    const teacherR = () => Math.min(H * 0.34, W * 0.19);
    const coreX = () => W * 0.77;
    const midY = () => H * 0.48;
    const unit = () => Math.min(H / 300, W / 560);

    const resize = () => {
      const box = canvas.getBoundingClientRect();
      if (!box.width || !box.height) return;
      W = box.width;
      H = box.height;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.max(160, Math.min(420, Math.round((W * H) / 640)));
      particles = Array.from({ length: n }, () => {
        const p = { sx: 0, sy: 0, t: 0, speed: 0, amp: 0, phase: 0, freq: 0, w: 1, px: 0, py: 0 };
        spawn(p);
        p.t = Math.random();
        return p;
      });
      if (still) draw(0);
    };

    const position = (p: Particle, t: number, out: { x: number; y: number }) => {
      const e = easeIn(t);
      const cx = coreX();
      const cy = midY();
      out.x = p.sx + (cx - p.sx) * e;
      out.y = p.sy + (cy - p.sy) * e + Math.sin(p.phase + t * p.freq) * p.amp * (1 - t) * t * 2;
      // the field bends around the cursor
      const dx = out.x - mouse.x;
      const dy = out.y - mouse.y;
      const d2 = dx * dx + dy * dy;
      const r = 70 * unit();
      if (d2 < r * r && d2 > 0.01) {
        const d = Math.sqrt(d2);
        const push = ((r - d) / r) * 22 * unit() * (1 - t);
        out.x += (dx / d) * push;
        out.y += (dy / d) * push;
      }
    };

    const pos = { x: 0, y: 0 };
    const draw = (dt: number) => {
      clock += dt;
      ctx.clearRect(0, 0, W, H);
      const u = unit();
      const tx = teacherX();
      const tr = teacherR();
      const cx = coreX();
      const cy = midY();
      const discR = 26 * u;

      // the large model: far away, dim, dashed - not yours
      const tg = ctx.createRadialGradient(tx - tr * 0.1, cy - tr * 0.15, tr * 0.1, tx, cy, tr);
      tg.addColorStop(0, hsla(grey, dark ? 0.22 : 0.16));
      tg.addColorStop(1, hsla(grey, 0.02));
      ctx.fillStyle = tg;
      ctx.beginPath();
      ctx.ellipse(tx, cy, tr, tr * 0.92, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = hsla(grey, 0.32);
      ctx.setLineDash([3 * u, 7 * u]);
      ctx.lineDashOffset = -clock * 6;
      ctx.beginPath();
      ctx.ellipse(tx, cy, tr, tr * 0.92, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      for (const k of [0.66, 0.38]) {
        ctx.strokeStyle = hsla(grey, 0.16);
        ctx.beginPath();
        ctx.ellipse(tx, cy, tr * k, tr * k * 0.92, clock * 0.05 * (k > 0.5 ? 1 : -1), 0, Math.PI * 2);
        ctx.stroke();
      }

      // the beam: the wedge the knowledge travels down
      const bg = ctx.createLinearGradient(tx + tr, cy, cx, cy);
      bg.addColorStop(0, hsla(grey, 0.05));
      bg.addColorStop(1, hsla(glow, 0.12));
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.moveTo(tx + tr * 0.75, cy - tr * 0.55);
      ctx.lineTo(cx, cy - discR * 0.55);
      ctx.lineTo(cx, cy + discR * 0.55);
      ctx.lineTo(tx + tr * 0.75, cy + tr * 0.55);
      ctx.closePath();
      ctx.fill();

      // the glow the core throws on everything
      const pulse = 0.85 + 0.15 * Math.sin(clock * 1.4);
      const gg = ctx.createRadialGradient(cx, cy, discR * 0.4, cx, cy, discR * 4.2 * pulse);
      gg.addColorStop(0, hsla(glow, dark ? 0.34 : 0.28));
      gg.addColorStop(0.5, hsla(glow, 0.07));
      gg.addColorStop(1, hsla(glow, 0));
      ctx.fillStyle = gg;
      ctx.fillRect(cx - discR * 5, cy - discR * 5, discR * 10, discR * 10);

      // particles: grey at the source, amber near the core, faster as they compress
      ctx.lineCap = 'round';
      for (const p of particles) {
        if (!still) {
          p.t += p.speed * dt * (0.6 + p.t * 1.8);
          if (p.t >= 1) spawn(p);
        }
        position(p, p.t, pos);
        const fade = Math.min(1, p.t / 0.1) * Math.min(1, (1 - p.t) / 0.07);
        ctx.globalAlpha = (0.25 + 0.75 * p.t) * fade * (dark ? 1 : 0.9);
        ctx.strokeStyle = ramp[Math.min(15, Math.floor(p.t * 16))] ?? ramp[15];
        ctx.lineWidth = p.w * u * (1.1 - p.t * 0.5);
        ctx.beginPath();
        ctx.moveTo(still ? pos.x - 1 : p.px, still ? pos.y : p.py);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        p.px = pos.x;
        p.py = pos.y;
      }
      ctx.globalAlpha = 1;

      // orbit ring around the core: the places the model can run
      ctx.strokeStyle = hsla(glow, 0.32);
      ctx.setLineDash([2 * u, 9 * u]);
      ctx.lineDashOffset = clock * 10;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, discR * 3.1, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = hsla(glow, 0.12);
      ctx.beginPath();
      ctx.arc(cx, cy, discR * 2.1, 0, Math.PI * 2);
      ctx.stroke();

      // the device: a dark slab, the amber disc, the negative-space L
      const slab = discR * 2.9;
      ctx.fillStyle = '#0a0a0f';
      roundRect(ctx, cx - slab / 2, cy - slab / 2, slab, slab, slab * 0.26);
      ctx.fill();
      ctx.strokeStyle = hsla(glow, 0.25);
      ctx.lineWidth = 1;
      roundRect(ctx, cx - slab / 2, cy - slab / 2, slab, slab, slab * 0.26);
      ctx.stroke();
      const dg = ctx.createRadialGradient(cx - discR * 0.25, cy - discR * 0.3, discR * 0.1, cx, cy, discR);
      dg.addColorStop(0, 'hsl(44, 95%, 64%)');
      dg.addColorStop(0.55, 'hsl(38, 90%, 56%)');
      dg.addColorStop(1, 'hsl(31, 92%, 47%)');
      ctx.shadowColor = hsla(glow, 0.7);
      ctx.shadowBlur = 24 * u * pulse;
      ctx.fillStyle = dg;
      ctx.beginPath();
      ctx.arc(cx, cy, discR, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      if (glyph) {
        const s = discR / 33;
        ctx.save();
        ctx.translate(cx - 50 * s, cy - 50 * s);
        ctx.scale(s, s);
        ctx.fillStyle = '#0a0a0f';
        ctx.fill(glyph);
        ctx.restore();
      }
    };

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      draw(dt);
      raf = running ? requestAnimationFrame(loop) : 0;
    };
    const start = () => {
      if (still || running || !onScreen || document.hidden) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    readColors();
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(
      (entries) => {
        onScreen = entries.some((e) => e.isIntersecting);
        if (onScreen) start();
        else stop();
      },
      { threshold: 0.05 },
    );
    io.observe(canvas);
    const mo = new MutationObserver(readColors);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', onVisibility);
    const onMove = (e: PointerEvent) => {
      const b = canvas.getBoundingClientRect();
      mouse.x = e.clientX - b.left;
      mouse.y = e.clientY - b.top;
    };
    const onLeave = () => {
      mouse.x = -1e9;
      mouse.y = -1e9;
    };
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerleave', onLeave);
    start();

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      mo.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return <canvas ref={ref} className={`block h-full w-full ${className}`} aria-hidden="true" />;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const RUNTIME_PINS = [
  { icon: Cloud, label: 'private cloud', style: { left: '55%', top: '9%' } },
  { icon: Globe, label: 'browser', style: { left: '84%', top: '13%' } },
  { icon: Laptop, label: 'laptop', style: { left: '90%', top: '48%' } },
  { icon: Server, label: 'on-prem', style: { left: '80%', top: '80%' } },
  { icon: Smartphone, label: 'your app', style: { left: '56%', top: '78%' } },
  { icon: Radio, label: 'edge · IoT', style: { left: '69%', top: '91%' } },
] as const;

/** The animated hero with its HTML annotations; the static SVG when the visitor prefers reduced motion. */
export function HeroLab() {
  if (reducedMotion()) return <HeroVisual />;
  return (
    <div className="mx-auto w-full max-w-xl select-none" aria-hidden="true">
      <div className="relative aspect-[560/400] sm:aspect-[560/380]">
        <DistillationField />
        {/* where it runs: pinned around the core */}
        <ul className="pointer-events-none absolute inset-0 text-[11px] font-medium text-muted-foreground">
          {RUNTIME_PINS.map((p, i) => (
            <li key={p.label} className={`absolute inline-flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-card/85 px-2.5 py-1 shadow-sm backdrop-blur ${i % 2 ? 'float-late' : 'float'}`} style={p.style}>
              <p.icon className="size-3.5 text-primary" />
              {p.label}
            </li>
          ))}
        </ul>
      </div>
      {/* axis labels: what the motion shows, left to right; stacked on narrow screens */}
      <div className="mono-label mt-1 flex items-center justify-between gap-4 px-[4%] text-muted-foreground max-sm:flex-col max-sm:items-center max-sm:gap-1 max-sm:text-center">
        <span>
          large model <span className="text-primary/60">·</span> their cloud
        </span>
        <span className="whitespace-nowrap text-primary">
          <span className="max-sm:hidden">→ </span>distilled into<span className="max-sm:hidden"> →</span>
        </span>
        <span className="text-foreground">
          your model <span className="text-primary">·</span> your machine
        </span>
      </div>
      <p className="mt-3 text-center text-sm leading-snug text-muted-foreground">
        The grey particles are what a large model knows, in someone else's cloud. Distillation compresses it into a small model - the lit
        core - that runs on your own device, where you choose.
      </p>
    </div>
  );
}
