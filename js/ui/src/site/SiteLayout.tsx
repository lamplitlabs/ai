import { useEffect, useState, type ReactNode } from 'react';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { Logo } from './Logo';
import { LampToggle } from './LampToggle';
import { Link, useRoute } from './router';
import { TryLink } from './TryLink';
import { CONTACT, flagship, shortDate, siteData, tryLabel } from './data';

export const MAIN_SITE = 'https://www.lamplitlabs.com/';
export { CONTACT };
const container = 'mx-auto w-full max-w-6xl px-5 sm:px-8';

// the site's own pages; every "try" is an external link to the model's Space (TryLink). /models keeps its path (links
// and the site check use it) and is presented as the offerings page (ADR-001).
const NAV = [
  { to: '/', label: 'Home' },
  { to: '/models', label: 'Offerings' },
  { to: '/benchmarks', label: 'Benchmarks' },
];

/** How far down the document the reader is, 0..1, written to `--progress` for the hairline under the header. */
function useScrollProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return progress;
}

export function SiteHeader() {
  const route = useRoute();
  const [open, setOpen] = useState(false);
  const progress = useScrollProgress();
  const scrolled = progress > 0.005;
  useEffect(() => setOpen(false), [route]);
  const m = flagship;
  const version = m?.label.match(/v\d+$/)?.[0] ?? m?.name;
  return (
    <header className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${scrolled || open ? 'border-b border-border bg-background/80 backdrop-blur-md' : 'border-b border-transparent'}`}>
      <div className={`${container} flex h-14 items-center justify-between`}>
        <Link to="/" className="flex items-center gap-2.5" aria-label="Lamplit Labs AI - home">
          <Logo className="size-7" />
          <span className="font-display text-lg font-semibold tracking-tight">
            Lamplit Labs <span className="text-primary">AI</span>
          </span>
          <span className="mono-label ml-2 hidden rounded border border-border px-1.5 py-0.5 text-muted-foreground lg:inline">lab</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} aria-current={route === n.to ? 'page' : undefined} className={`nav-link rounded-md px-3 py-1.5 text-sm transition-colors hover:text-foreground ${route === n.to ? 'text-foreground' : 'text-muted-foreground'}`}>
              {n.label}
            </Link>
          ))}
          <TryLink className="nav-link inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground" />
          <a href={MAIN_SITE} className="ml-1 inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
            lamplitlabs.com <ArrowUpRight className="size-3.5" />
          </a>
          {m ? (
            <Link to="/models" className="mono-label ml-2 hidden items-center gap-2 rounded-full border border-border px-3 py-1.5 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground lg:inline-flex" title={`${m.label} · exported ${shortDate(m.exported_at)}`}>
              <span className={`status-dot ${m.gate?.release ? '' : 'pending'}`} aria-hidden="true" />
              {version} · {m.gate?.release ? 'gate passed' : 'in progress'}
            </Link>
          ) : null}
          <div className="ml-2 border-l border-border pl-2">
            <LampToggle />
          </div>
        </nav>
        <div className="flex items-center gap-1 md:hidden">
          <LampToggle />
          <button type="button" className="rounded-md p-2 text-muted-foreground hover:text-foreground" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      <div className="scroll-progress" style={{ '--progress': progress } as React.CSSProperties} aria-hidden="true" />
      {open ? (
        <nav className="border-t border-border bg-background/95 px-5 py-3 md:hidden animate-in" aria-label="Main">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className={`block rounded-md px-3 py-2 text-sm ${route === n.to ? 'bg-accent text-foreground' : 'text-muted-foreground'}`}>
              {n.label}
            </Link>
          ))}
          <TryLink className="flex items-center gap-1 rounded-md px-3 py-2 text-sm text-muted-foreground" />
          <a href={MAIN_SITE} className="block rounded-md px-3 py-2 text-sm text-muted-foreground">
            lamplitlabs.com ↗
          </a>
        </nav>
      ) : null}
    </header>
  );
}

function FooterColumn({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mono-label mb-4 text-primary">{label}</h3>
      {children}
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card/30">
      <div className={`${container} grid gap-10 py-16 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]`}>
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <Logo className="size-7" />
            <span className="font-display text-lg font-semibold tracking-tight">
              Lamplit Labs <span className="text-primary">AI</span>
            </span>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">Small, practical software that illuminates the path forward. The AI side builds small models you can hold in your own hands - ready-made editions you can take home today, or one built for your job.</p>
          <a href={`mailto:${CONTACT}?subject=${encodeURIComponent('Hello from lamplitlabs.com')}`} className="mono-label inline-flex items-center gap-2 normal-case tracking-normal text-muted-foreground transition-colors hover:text-foreground">
            {CONTACT}
          </a>
        </div>
        <FooterColumn label="ai">
          <ul className="space-y-2.5 text-sm text-muted-foreground">
            <li>
              <Link to="/models" className="transition-colors hover:text-foreground">
                Offerings
              </Link>
            </li>
            <li>
              <Link to="/benchmarks" className="transition-colors hover:text-foreground">
                Benchmarks
              </Link>
            </li>
            <li>
              <TryLink className="inline-flex items-center gap-1 transition-colors hover:text-foreground">{tryLabel()} on Hugging Face</TryLink>
            </li>
            <li>
              <Link to="/#how" className="transition-colors hover:text-foreground">
                How we build
              </Link>
            </li>
          </ul>
        </FooterColumn>
        <FooterColumn label="lamplit labs">
          <ul className="space-y-2.5 text-sm text-muted-foreground">
            <li>
              <a href={MAIN_SITE} className="transition-colors hover:text-foreground">
                lamplitlabs.com
              </a>
            </li>
            <li>
              <a href={`${MAIN_SITE}#products`} className="transition-colors hover:text-foreground">
                Products
              </a>
            </li>
            <li>
              <a href={`mailto:${CONTACT}?subject=${encodeURIComponent('Hello from lamplitlabs.com')}`} className="transition-colors hover:text-foreground">
                Contact
              </a>
            </li>
          </ul>
        </FooterColumn>
        <FooterColumn label="this site">
          <ul className="space-y-2.5 text-sm text-muted-foreground">
            <li>No cookies, no analytics, no accounts.</li>
            <li>The browser edition runs on your machine; nothing you type is sent anywhere.</li>
            <li>Every number here comes from a published measurement.</li>
          </ul>
        </FooterColumn>
      </div>
      <div className="border-t border-border">
        <div className={`${container} mono-label flex flex-col gap-2 py-5 text-muted-foreground/80 sm:flex-row sm:items-center sm:justify-between`}>
          <span>© {new Date().getFullYear()} lamplit labs</span>
          <span className="tnum">data generated {siteData.generated_at.slice(0, 16).replace('T', ' ')} utc</span>
          <span>practical tools for real problems.</span>
        </div>
      </div>
    </footer>
  );
}

export function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="lab-grain flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
