import { ArrowRight, Check, Database, Gauge as GaugeIcon, KeyRound, Lock, PlugZap, Repeat, Scale, ShieldCheck, Unplug } from 'lucide-react';
import { HeroLab } from '../DistillationField';
import { ProcessAnimation, RUNTIMES } from '../Illustrations';
import { CommissionCard, OfferingCard, OfferingComparison } from '../Offerings';
import { Reveal } from '../Reveal';
import { CONTACT } from '../SiteLayout';
import { Link } from '../router';
import { TryLink } from '../TryLink';
import { Datum, Index, SectionHead, Status } from '../lab';
import { EDITION_LABELS, NOT_MEASURED, STALE_AFTER_DAYS, commissionMailto, dataAgeDays, flagship, latestMeasuredAt, lines, measured, pct, shortDate, showcaseModels, siteData } from '../data';
import { container, primaryCta, secondaryCta } from '../cta';

export { primaryCta };

/** `now` is injectable so tests can render a stale data set; the site always uses the real clock. */
export function Landing({ now }: { now?: Date } = {}) {
  const ageDays = dataAgeDays(siteData.generated_at, now);
  const stale = ageDays > STALE_AFTER_DAYS;
  const m = flagship;
  const g = m?.gate ?? null;
  const facts = g?.gates.facts;
  const gates = g ? Object.values(g.gates) : [];
  const passed = gates.filter((x) => x.ok).length;
  const size = m?.dtypes[0];
  const q8 = m?.export_agreement?.q8 ?? null;
  const offered = showcaseModels.length;
  const allGatesPassed = showcaseModels.every((x) => x.gate?.release);

  return (
    <>
      {/* hero */}
      <section className="hero-lamplight lab-grid relative overflow-hidden pt-14">
        <div className={`${container} grid items-center gap-12 pb-16 pt-14 sm:pt-20 lg:grid-cols-[1.05fr_1fr] lg:pb-24 lg:pt-24`}>
          <div className="text-center lg:text-left">
            <div className="hero-entrance-1 flex flex-wrap justify-center gap-2 lg:justify-start">
              {offered ? (
                <Status ok={allGatesPassed}>
                  sovereign ai · {offered} {offered === 1 ? 'model' : 'models'} on offer
                  <span className="max-sm:hidden"> · measured {shortDate(latestMeasuredAt)}</span>
                </Status>
              ) : (
                <Status>sovereign ai · built to measure</Status>
              )}
            </div>
            <h1 className="hero-entrance-2 font-display mt-7 text-balance text-[2.75rem] font-semibold leading-[1.02] tracking-tight sm:text-6xl lg:text-[4.4rem]">
              AI that runs <span className="text-lamp">where you are.</span>
            </h1>
            <p className="hero-entrance-3 mx-auto mt-7 max-w-xl text-balance text-lg leading-relaxed text-muted-foreground lg:mx-0">
              We build small, specialised models you host yourself - in a browser, on a laptop, on-prem, in your private cloud, inside your app or on the edge. Your data never leaves. The weights are yours.
            </p>
            <div className="hero-entrance-4 mt-9 flex flex-wrap justify-center gap-3 lg:justify-start">
              <a href="#offerings" className={primaryCta}>
                See what we offer <ArrowRight className="size-4" aria-hidden="true" />
              </a>
              <TryLink className={secondaryCta} />
            </div>
            {stale ? (
              <p data-testid="hero-data-age" className="hero-entrance-4 mx-auto mt-5 max-w-xl rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-foreground lg:mx-0">
                The numbers on this site were measured {ageDays} days ago ({shortDate(siteData.generated_at)}). They describe the editions as they were then, not a newer run.
              </p>
            ) : null}
            <p className="hero-entrance-4 mono-label mt-6 text-muted-foreground/80">take a model home today, or have one built for your job · no sign-up · the browser edition runs on your machine, hosted as a Hugging Face Space</p>
          </div>
          <div className="hero-entrance-3">
            <HeroLab />
          </div>
        </div>
        <div className="horizon" />
      </section>

      {/* the measurement strip: what the lab has measured about the model it ships today */}
      {m && g ? (
        <section className="border-b border-border bg-card/40" aria-label="Measured today - the edition every Try opens">
          <div className={container}>
            <Reveal stagger className="grid grid-cols-2 lg:grid-cols-4">
              <Datum className="border-b border-border py-7 pr-6 md:border-r lg:border-b-0" k="facts checked" value={(facts?.actual ?? 0) * 100} format={(v) => `${v.toFixed(1)}%`} sub={`against the reference · gate ${pct(facts?.threshold)} · ${g.suite_size} scenarios`} ok={facts?.ok} />
              <Datum className="border-b border-border py-7 pr-6 md:pl-6 lg:border-b-0 lg:border-r" k="release gates" value={passed} format={(v) => `${Math.round(v)} / ${gates.length}`} sub={g.release ? 'every gate passed' : 'not all gates passed yet'} ok={g.release} />
              <Datum className="border-border py-7 pr-6 md:border-r lg:pl-6" k="export fidelity" value={(q8 ?? 0) * 100} format={(v) => measured(q8, () => `${v.toFixed(1)}%`)} sub={q8 == null ? 'no fidelity number for this edition yet' : 'q8 file agrees with the trained weights'} ok={q8 != null ? q8 >= 0.95 : undefined} />
              <Datum className="py-7 md:pl-6" k="download" value={size ? size.size_mb / 1000 : 0} format={(v) => (size ? (size.size_mb >= 1000 ? `${v.toFixed(1)} GB` : `${Math.round(v * 1000)} MB`) : NOT_MEASURED)} sub={size ? `${size.dtype} · ${size.chunks > 1 ? `${size.chunks} files` : 'one file'} · ${m.browser ? 'runs in the browser' : 'desktop and server'}` : undefined} />
            </Reveal>
            <p className="mono-label flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border py-3 text-muted-foreground/80">
              <span>
                measured: {m.line} · {EDITION_LABELS[m.edition]} · {m.label}
              </span>
              <span className="hidden text-primary/60 sm:inline">·</span>
              <span>every number on this site is generated from a published measurement</span>
              <span className="hidden text-primary/60 sm:inline">·</span>
              <span
                className={stale ? 'text-primary' : undefined}
                data-testid="data-age"
                role={stale ? 'status' : undefined}
                aria-live={stale ? 'polite' : undefined}
              >
                data {siteData.generated_at.slice(0, 16).replace('T', ' ')} UTC{stale ? ` · ${ageDays} days old - may be stale` : ''}
              </span>
              <Link to="/benchmarks" className="ml-auto inline-flex items-center gap-1 text-primary hover:underline">
                read the numbers <ArrowRight className="size-3" />
              </Link>
            </p>
          </div>
        </section>
      ) : null}

      {/* 01 where it runs */}
      <section className="lab-grid lab-grid-lines">
        <div className={`${container} py-24 lg:py-32`}>
          <SectionHead n="01" eyebrow="Where it runs" title="One model, every place you work" lead="The browser is the demo. The same exported model runs wherever your data already lives - the runtime changes, the model does not." aside={<Status>one file · five runtimes</Status>} />
          <Reveal stagger className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {RUNTIMES.map((r, i) => (
              <div key={r.title} className="glass glass-lift corner-marks-hover card-glow rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <r.icon className="size-4.5" />
                  </span>
                  <span className="mono-label tnum text-muted-foreground/70">0{i + 1}</span>
                </div>
                <h3 className="mt-5 text-sm font-semibold">{r.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{r.text}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* 02 sovereign */}
      <section className="bg-muted/30">
        <div className={`${container} py-24 lg:py-32`}>
          <SectionHead
            n="02"
            eyebrow="Sovereign AI"
            title={
              <>
                Your model. Your machines. <span className="text-lamp">Your rules.</span>
              </>
            }
            lead="Sovereign means you hold the weights, you run them on hardware you control, and nobody else decides when the model changes, what it costs or who reads the traffic."
          />
          <Reveal stagger className="grid gap-3 md:grid-cols-2">
            {[
              { icon: Lock, title: 'Data stays home', text: 'Prompts, documents and answers never cross your perimeter. There is no third party to audit because there is no third party.' },
              { icon: KeyRound, title: 'You hold the weights', text: 'The model is a file you own, under the licence of its open base. Copy it, archive it, run it in ten years.' },
              { icon: Repeat, title: 'It changes when you say so', text: 'No silent model updates, no deprecations, no behaviour drift between Monday and Tuesday. A new version is a decision you take, measured against the old one.' },
              { icon: Unplug, title: 'No meter, no outage', text: 'Once it is on your machine there is no per-token bill, no rate limit and no status page to watch. It works offline, in a basement, on a ship.' },
            ].map((c, i) => (
              <div key={c.title} className="glass glass-lift card-glow flex gap-5 rounded-2xl p-6 sm:p-7">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                  <c.icon className="size-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-semibold">{c.title}</h3>
                    <span className="mono-label tnum text-muted-foreground/60">02.{i + 1}</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.text}</p>
                </div>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* 03 the honest comparison */}
      <section>
        <div className={`${container} py-24 lg:py-32`}>
          <SectionHead n="03" eyebrow="The honest comparison" title="What a cloud model costs you" lead="Frontier cloud models are remarkable, and for open-ended work they are the right tool. For a defined job inside your organisation, the bill has more lines than the invoice." />
          <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-10">
            <Reveal stagger className="divide-y divide-border rounded-2xl border border-border bg-card/40">
              {[
                { icon: Database, title: 'Your data becomes their input', text: 'Every prompt is a document leaving the building. Retention, training opt-outs and sub-processors are terms you read, not controls you hold.' },
                { icon: GaugeIcon, title: 'A meter on every word', text: 'Usage grows, the bill grows with it, and the price is set by someone else. A local model costs the same on its millionth answer as on its first.' },
                { icon: Repeat, title: 'The model changes under you', text: 'Versions are retired, behaviour shifts, yesterday\u2019s tested prompts give different answers today. Your validation is never finished.' },
                { icon: PlugZap, title: 'Latency, outages, dependence', text: 'Every answer is a round trip across the internet to a shared service. When it is slow or down, so is your product.' },
                { icon: Scale, title: 'Compliance by contract, not by design', text: 'Residency, sector rules and audits become a paperwork exercise about a system you cannot inspect. A model on your hardware is inside the perimeter you already certify.' },
              ].map((c, i) => (
                <div key={c.title} className="flex gap-5 p-5 sm:p-6">
                  <span className="mono-label tnum mt-1 w-8 shrink-0 text-warning/80">0{i + 1}</span>
                  <c.icon className="mt-0.5 size-5 shrink-0 text-warning" />
                  <div>
                    <h3 className="text-sm font-semibold">{c.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{c.text}</p>
                  </div>
                </div>
              ))}
            </Reveal>
            <Reveal className="space-y-4">
              <div className="glow-border corner-marks glass rounded-2xl p-6 sm:p-7">
                <h3 className="flex items-center gap-2 font-semibold">
                  <ShieldCheck className="size-5 text-primary" /> What a local model gives back
                </h3>
                <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
                  {['Answers in tens of milliseconds, on the device, with no network', 'A fixed cost: the hardware you already have', 'A version you tested is the version that runs', 'Behaviour you can measure, publish and defend', 'Works in places the cloud cannot reach'].map((t) => (
                    <li key={t} className="flex gap-3">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" /> {t}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="glass rounded-2xl p-6 sm:p-7">
                <h3 className="font-semibold">When the cloud is the right tool</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Open-ended questions, work that needs the breadth of the whole internet, knowledge that changes weekly, or a handful of requests a day with no data constraints. A small local model does one job well; it does not replace a frontier model at everything. We will tell you which one you need.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 04 how we build */}
      <section className="lab-grid lab-grid-lines bg-muted/30" id="how">
        <div className={`${container} py-24 lg:py-32`}>
          <SectionHead n="04" eyebrow="How we build" title="From a large model to one that fits in your hand" lead="Six steps, the same for every job. The large model teaches; a small one learns; independent judges say whether it is good enough. Nothing ships on a feeling." />
          <Reveal>
            <ProcessAnimation />
          </Reveal>
          <Reveal stagger className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              { k: 'you get', title: 'What you get', text: 'The weights, the export for your runtime, the benchmark report, the runbook. Everything needed to run it without us.' },
              { k: 'we publish', title: 'What we publish', text: 'Every gate rate and every judge verdict, including the failing ones. A model that is not ready says so on its page.' },
              { k: 'stays ours', title: 'What stays ours', text: 'The exact prompts, datasets and training recipe are the craft. The result is a file you own outright.' },
            ].map((c) => (
              <div key={c.title} className="glass glass-lift rounded-2xl p-6">
                <div className="mono-label text-primary">{c.k}</div>
                <h3 className="mt-3 font-semibold">{c.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.text}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* 05 offerings: every edition of every line, plus the standing offer */}
      <section id="offerings" className="scroll-mt-14">
        <div className={`${container} py-24 lg:py-32`}>
          <SectionHead
            n="05"
            eyebrow="Offerings"
            title="What you can take home today"
            lead={`${lines.map((l) => `${l.editions.length === 1 ? 'One edition' : `${l.editions.length === 2 ? 'Two' : l.editions.length} editions`} of the ${l.line}`).join('; ')} - built with this process, measured with these gates, judged by this panel - and the same process for a job of yours. Every card links to its datasheet and its full report.`}
            aside={<Status ok={allGatesPassed}>{offered} {offered === 1 ? 'model' : 'models'} · newest version of each edition</Status>}
          />
          <OfferingComparison models={showcaseModels} />
          <Reveal stagger className="grid gap-4 lg:grid-cols-2">
            {showcaseModels.map((x, i) => (
              <OfferingCard key={x.name} m={x} featured={i === 0} />
            ))}
            <CommissionCard wide />
          </Reveal>
          <p className="mono-label mt-6 text-muted-foreground/80">
            {pct(facts?.actual, 1)} facts against the reference and {passed}/{gates.length} gates on the {m?.edition ?? 'browser'} edition today · an edition that ships as trained weights is measured on those weights, not on a quantised export ·{' '}
            <Link to="/benchmarks" className="text-primary hover:underline">
              every report
            </Link>
          </p>
        </div>
      </section>

      {/* 06 contact */}
      <section className="hero-lamplight lab-grid border-t border-border">
        <div className={`${container} py-28 text-center lg:py-36`}>
          <Reveal>
            <Index n="06" className="justify-center">
              Work with the lab
            </Index>
            <h2 className="font-display mt-6 text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">Have a job for a model?</h2>
            <p className="mx-auto mt-6 max-w-xl text-balance text-lg text-muted-foreground">Tell us the task, where it has to run and what a right answer looks like. We will tell you whether a small model can do it - and show you the measurement before you commit.</p>
            <a href={commissionMailto()} className={`${primaryCta} mt-10`}>
              {CONTACT}
            </a>
            <p className="mono-label mt-6 text-muted-foreground/70">a measurement before a contract · always</p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
