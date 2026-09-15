import { Cpu, FileDown, Globe, Mail, Scale, Server, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { CommissionCard } from '../Offerings';
import { Reveal } from '../Reveal';
import { CONTACT } from '../SiteLayout';
import { Link } from '../router';
import { TryLink } from '../TryLink';
import { Gauge, Index, Spec, Status, Tag } from '../lab';
import { categoryLabel, EDITION_LABELS, factCategories, gb, lines, measuredOn, models, pct, runsIn, runsInDetail, shortDate, showcaseModels, tryUrl, weightsDetail, weightsFormat, type SiteModel } from '../data';
import { container, primaryCta, secondaryCta } from '../cta';

/** The page head shared by /models and /benchmarks: index, eyebrow, a large title, the lead, an optional status chip. */
export function PageIntro({ n, eyebrow, title, lead, aside }: { n: string; eyebrow: string; title: ReactNode; lead: ReactNode; aside?: ReactNode }) {
  return (
    <section className="hero-lamplight lab-grid relative overflow-hidden pt-14">
      <div className={`${container} grid gap-8 pb-14 pt-16 sm:pt-20 lg:grid-cols-[minmax(0,14rem)_1fr] lg:pb-20`}>
        <Index n={n} className="hero-entrance-1 self-start lg:mt-4">
          {eyebrow}
        </Index>
        <div>
          <h1 className="hero-entrance-2 font-display text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">{title}</h1>
          <p className="hero-entrance-3 mt-6 max-w-2xl text-balance text-base text-muted-foreground sm:text-lg">{lead}</p>
          {aside ? <div className="hero-entrance-4 mt-7 flex flex-wrap gap-2">{aside}</div> : null}
        </div>
      </div>
      <div className="horizon" />
    </section>
  );
}

function Number({ k, v, sub, ok, value, threshold }: { k: string; v: string; sub: string; ok?: boolean; value?: number; threshold?: number }) {
  return (
    <div>
      <div className="mono-label text-muted-foreground">{k}</div>
      <div className={`datum-value mt-2 text-3xl font-semibold leading-none ${ok === true ? 'text-success' : ok === false ? 'text-warning' : ''}`}>{v}</div>
      <div className="mt-2 text-xs leading-relaxed text-muted-foreground">{sub}</div>
      {value != null ? <Gauge className="mt-3" value={value} threshold={threshold} ok={ok} /> : null}
    </div>
  );
}

/** The datasheet of one edition. An ONNX edition is a download you try in the browser; a PyTorch edition is a
 *  GPU-sized checkpoint whose weights are asked for - it has no quantised export, so no export-fidelity number. */
function ModelCard({ m, featured }: { m: SiteModel; featured: boolean }) {
  const g = m.gate;
  const facts = g?.gates.facts;
  const size = m.dtypes[0];
  const cats = g ? factCategories(g) : [];
  const strongest = cats[0];
  const weakest = cats[cats.length - 1];
  const gates = g ? Object.values(g.gates) : [];
  const passed = gates.filter((x) => x.ok).length;
  const publicWeights = Boolean(m.hub.public && m.hub.repo);
  return (
    <article className={`glass card-glow corner-marks scroll-mt-20 rounded-3xl p-6 sm:p-8 lg:p-10 ${featured ? 'glow-border' : ''}`} id={m.name}>
      <div className="flex flex-wrap items-center gap-2">
        <Tag tone="primary">{EDITION_LABELS[m.edition]}</Tag>
        {g ? <Tag tone={g.release ? 'success' : 'warning'}>{g.release ? 'release gate passed' : 'in progress · gate not passed'}</Tag> : null}
        {size ? (
          <Tag>
            {size.dtype} · {gb(size.size_mb)}
          </Tag>
        ) : (
          <Tag>{weightsDetail(m)}</Tag>
        )}
        <Tag>{publicWeights ? `public weights${m.hub.revision ? ` · release ${m.hub.revision}` : ''}` : 'weights on request'}</Tag>
        <span className="mono-label ml-auto hidden text-muted-foreground sm:inline">{m.exported_at ? `exported ${shortDate(m.exported_at)}` : `measured ${shortDate(m.measured_at)}`}</span>
      </div>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-2xl">
          <div className="mono-label text-primary">
            {m.line} · {m.edition}
          </div>
          <h2 className="font-display mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{m.label}</h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{m.purpose}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {m.browser ? (
            <TryLink href={tryUrl(m)} className={primaryCta}>
              Try
            </TryLink>
          ) : (
            <a href={`mailto:${CONTACT}?subject=${encodeURIComponent(`${m.line} - ${EDITION_LABELS[m.edition]} (${m.label})`)}`} className={primaryCta}>
              <Mail className="size-4" aria-hidden="true" /> Ask for the weights
            </a>
          )}
          <Link to={`/benchmarks#${m.name}`} className={secondaryCta}>
            Benchmarks
          </Link>
        </div>
      </div>

      <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-6 border-t border-border pt-8 sm:grid-cols-3 lg:grid-cols-6">
        <Spec icon={<Cpu className="size-3.5" />} k="size" v={`${m.params_b}B parameters`} sub={`base ${m.base_model.split('/').pop()}`} />
        <Spec icon={<FileDown className="size-3.5" />} k={m.weights === 'pytorch' ? 'weights' : 'download'} v={size ? gb(size.size_mb) : 'on request'} sub={size ? `${size.dtype} · ${size.chunks > 1 ? `${size.chunks} files` : 'one file'}` : 'delivered as a Hugging Face repository or as files'} />
        <Spec icon={<Globe className="size-3.5" />} k="runs in" v={runsIn(m)} sub={runsInDetail(m)} />
        <Spec icon={<Server className="size-3.5" />} k="format" v={weightsFormat(m)} sub={weightsDetail(m)} />
        <Spec icon={<Scale className="size-3.5" />} k="licence" v={m.licence.split(' (')[0]} sub="inherited from the base" />
        <Spec icon={<Sparkles className="size-3.5" />} k="grounding" v={m.grounding ? 'verified reference' : 'none'} sub={m.grounding ? 'attached at run time' : 'answers from weights alone'} />
      </dl>

      {g ? (
        <div className="mt-8 rounded-2xl border border-border bg-background/50 p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <Index n="measured">{shortDate(g.created_at)}</Index>
            <span className="mono-label tnum text-muted-foreground">
              {passed}/{gates.length} gates · {g.suite_size} scenarios · {measuredOn(g)}
            </span>
          </div>
          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            <Number k="facts against the reference" v={pct(facts?.actual, 1)} sub={`gate ${pct(facts?.threshold)}`} ok={facts?.ok} value={facts?.actual ?? 0} threshold={facts?.threshold} />
            <Number k="independent judges" v={m.panel?.mean != null ? `${m.panel.mean.toFixed(2)} / 5` : 'not judged'} sub={m.panel ? `${m.panel.satisfied} of ${m.panel.required} would ship it · satisfied at 3.5` : 'panel pending'} ok={m.panel ? m.panel.satisfied >= m.panel.required : undefined} value={m.panel?.mean != null ? m.panel.mean / 5 : undefined} threshold={0.7} />
            {m.weights === 'pytorch' ? (
              <Number k="measured on" v="bf16 weights" sub="the trained weights themselves, in PyTorch - there is no quantised export to compare" />
            ) : (
              <Number k="export fidelity" v={m.export_agreement?.q8 != null ? pct(m.export_agreement.q8) : '–'} sub="quantised export agrees with the trained weights" ok={m.export_agreement?.q8 != null ? m.export_agreement.q8 >= 0.95 : undefined} value={m.export_agreement?.q8 ?? undefined} threshold={0.95} />
            )}
          </div>
          {strongest && weakest ? (
            <p className="mono-label mt-6 border-t border-border pt-4 text-muted-foreground">
              strongest {categoryLabel(strongest[0])} <span className="text-success">{pct(strongest[1].facts)}</span> · weakest {categoryLabel(weakest[0])} <span className="text-warning">{pct(weakest[1].facts)}</span>
              {m.grounding ? ' · grounded on a verified reference pack' : ''}
            </p>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export function Models() {
  const hidden = models.filter((m) => !m.showcase);
  const n = showcaseModels.length;
  return (
    <>
      <PageIntro
        n="offers"
        eyebrow="Offerings"
        title="Small models, one job each - yours to keep"
        lead={`Every model here was built with the same six steps and is published with the same measurements; each line is offered in editions for the place it has to run, and the same process builds one for a job of yours. A model that has not passed its release gate says so - we would rather you knew.`}
        aside={
          <Status ok>
            {n} {n === 1 ? 'model' : 'models'} · {lines.length} {lines.length === 1 ? 'line' : 'lines'} · newest version of each edition
          </Status>
        }
      />
      <section className={`${container} space-y-6 py-16 lg:py-20`}>
        {lines.map((l) => (
          <Reveal key={l.line}>
            <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
              <Index n="line">{l.line}</Index>
              <span className="mono-label text-muted-foreground">{l.editions.map((e) => EDITION_LABELS[e.edition]).join(' · ')}</span>
            </div>
            <div className="space-y-6">
              {l.editions.map((m, i) => (
                <ModelCard key={m.name} m={m} featured={i === 0} />
              ))}
            </div>
          </Reveal>
        ))}
        <Reveal>
          <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
            <Index n="order">A model of your own</Index>
            <span className="mono-label text-muted-foreground">a measurement before a contract</span>
          </div>
          <CommissionCard />
        </Reveal>
        <Reveal stagger className="grid gap-3 md:grid-cols-2">
          <div className="glass rounded-2xl p-6 sm:p-7">
            <div className="mono-label text-primary">reading the numbers</div>
            <h2 className="mt-3 font-semibold">How to read the numbers</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              <strong className="text-foreground">Facts</strong> is the share of answers whose checkable statements match the reference pack; the release gate asks for 85%. <strong className="text-foreground">Judges</strong> are independent frontier models from different vendors scoring every answer 1-5 on accuracy, helpfulness, language and format; a judge is satisfied at a mean of 3.5 with no severe error. <strong className="text-foreground">Export fidelity</strong> is how often the quantised file the browser runs gives the same answer as the trained weights; a pro edition is measured on those weights directly and has no such number.
            </p>
          </div>
          <div className="glass rounded-2xl p-6 sm:p-7">
            <div className="mono-label text-primary">weights and licences</div>
            <h2 className="mt-3 font-semibold">Weights and licences</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Each model inherits the licence of its open base. Apache-2.0 bases can be redistributed freely; research licences are shared with customers under their terms. A browser edition's weights are public on the Hugging Face Hub; a pro edition's are delivered on request as a Hugging Face repository or as files, together with the export the runtime loads and the report you see here.
              {hidden.length ? ` Earlier prototypes (${hidden.map((m) => m.label).join(', ')}) appear on the benchmarks page only.` : ''}
            </p>
          </div>
        </Reveal>
      </section>
    </>
  );
}
