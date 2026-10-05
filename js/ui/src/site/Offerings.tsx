import { ArrowRight, ArrowUpRight, Cpu, Globe, KeyRound, Mail, Wrench } from 'lucide-react';
import { CONTACT } from './SiteLayout';
import { Link } from './router';
import { TryLink } from './TryLink';
import { Gauge, Spec, Tag } from './lab';
import { EDITION_LABELS, gb, hubRepoUrl, pct, runsIn, runsInDetail, shortDate, tryUrl, type SiteModel } from './data';
import { primaryCta, secondaryCta } from './cta';

/**
 * One offering: an edition of a model line as something you can take home today - what it is, where it runs, how its
 * weights are had, and the measurement that stands behind it. Every number comes from `site.json`; the card links to
 * the edition's datasheet (/models) and its full report (/benchmarks). The browser edition is tried on the Space; an
 * edition with public weights and nothing to try leads to its Hugging Face repository; weights not yet public are
 * asked for by mail.
 */
export function OfferingCard({ m, featured = false }: { m: SiteModel; featured?: boolean }) {
  const g = m.gate;
  const facts = g?.gates.facts;
  const gates = g ? Object.values(g.gates) : [];
  const passed = gates.filter((x) => x.ok).length;
  const size = m.dtypes[0];
  const hubUrl = m.hub.public && m.hub.repo ? hubRepoUrl(m.hub.repo) : null;
  const publicWeights = hubUrl != null;
  const tryHref = tryUrl(m);
  const primary = m.browser && tryHref ? (
    <TryLink href={tryHref} className={primaryCta}>
      Try it
    </TryLink>
  ) : hubUrl ? (
    <a href={hubUrl} target="_blank" rel="noopener noreferrer" className={primaryCta}>
      <ArrowUpRight className="size-4" aria-hidden="true" /> Weights on Hugging Face
    </a>
  ) : (
    <a href={`mailto:${CONTACT}?subject=${encodeURIComponent(`${m.line} - ${EDITION_LABELS[m.edition]} (${m.label})`)}`} className={primaryCta}>
      <Mail className="size-4" aria-hidden="true" /> Ask for the weights
    </a>
  );
  return (
    <article className={`glass glass-lift card-glow corner-marks flex h-full flex-col rounded-3xl p-6 sm:p-8 ${featured ? 'glow-border' : ''}`} aria-labelledby={`offer-${m.name}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Tag tone="primary">{EDITION_LABELS[m.edition]}</Tag>
        {g ? <Tag tone={g.release ? 'success' : 'warning'}>{g.release ? 'release gate passed' : 'gate not passed'}</Tag> : null}
        <Tag>{publicWeights ? `public weights${m.hub.revision ? ` · ${m.hub.revision}` : ''}` : 'weights on request'}</Tag>
        <span className="mono-label ml-auto hidden text-muted-foreground sm:inline">{m.label}</span>
      </div>
      <h3 id={`offer-${m.name}`} className="font-display mt-5 text-2xl font-semibold tracking-tight sm:text-3xl">
        {m.line} <span className="text-lamp">· {m.edition}</span>
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{m.pitch}</p>

      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-border pt-6 sm:grid-cols-3">
        <Spec icon={<Cpu className="size-3.5" />} k="size" v={`${m.params_b}B`} sub={`base ${m.base_model.split('/').pop()}`} />
        <Spec icon={<Globe className="size-3.5" />} k="runs in" v={runsIn(m)} sub={runsInDetail(m)} />
        <Spec icon={<KeyRound className="size-3.5" />} k="weights" v={publicWeights ? 'yours to download' : 'yours on request'} sub={publicWeights ? (size ? `${size.dtype} · ${gb(size.size_mb)} · ${m.licence.split(' (')[0]}` : m.weights_mb ? `bf16 · ${gb(m.weights_mb)} · ${m.licence.split(' (')[0]}` : m.licence.split(' (')[0]) : `${m.weights === 'pytorch' ? 'merged bf16' : 'export'} · ${m.licence.split(' (')[0]}`} />
      </dl>

      {g ? (
        <div className="mt-6 rounded-2xl border border-border bg-background/50 p-4 sm:p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="mono-label text-muted-foreground">measured {shortDate(g.created_at)}</span>
            <span className="mono-label tnum text-muted-foreground">{g.suite_size} scenarios</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <div className="mono-label text-muted-foreground">facts</div>
              <div className={`datum-value mt-1.5 text-2xl font-semibold leading-none ${facts?.ok ? 'text-success' : 'text-warning'}`}>{pct(facts?.actual, 1)}</div>
              <Gauge className="mt-2" value={facts?.actual ?? 0} threshold={facts?.threshold} ok={facts?.ok} />
            </div>
            <div>
              <div className="mono-label text-muted-foreground">release gates</div>
              <div className={`datum-value mt-1.5 text-2xl font-semibold leading-none ${g.release ? 'text-success' : 'text-warning'}`}>
                {passed} / {gates.length}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">{g.release ? 'every gate passed' : `${gates.length - passed} not passed yet`}</div>
            </div>
            <div className="max-sm:hidden">
              <div className="mono-label text-muted-foreground">measured on</div>
              <div className="mt-1.5 text-sm font-medium leading-snug">{g.runtime === 'pytorch' ? 'the trained weights' : `the ${g.dtype ?? ''} export the browser runs`}</div>
              <div className="mt-1 text-xs text-muted-foreground">{g.runtime === 'pytorch' ? 'PyTorch · bf16 · no export' : 'transformers.js · ONNX'}</div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-3 pt-1">
        {primary}
        <Link to={`/models#${m.name}`} className={secondaryCta}>
          Datasheet
        </Link>
        {hubUrl && m.browser && tryHref ? (
          <a href={hubUrl} target="_blank" rel="noopener noreferrer" className="mono-label ml-auto inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground">
            weights on hugging face <ArrowUpRight className="size-3" aria-hidden="true" />
          </a>
        ) : (
          <Link to={`/benchmarks#${m.name}`} className="mono-label ml-auto inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground">
            full report <ArrowRight className="size-3" aria-hidden="true" />
          </Link>
        )}
      </div>
    </article>
  );
}

/** The lab's standing offer: the same six steps for a job of yours, with a measurement before a contract.
 *  `wide` lays it across a two-column grid (the landing's offerings), text left and the specs and call right. */
export function CommissionCard({ wide = false }: { wide?: boolean }) {
  return (
    <article className={`glass glass-lift corner-marks flex h-full flex-col rounded-3xl border-dashed p-6 sm:p-8 ${wide ? 'lg:col-span-2 lg:grid lg:grid-cols-[1.15fr_1fr] lg:items-start lg:gap-x-12' : ''}`} aria-labelledby="offer-commission">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Tag tone="primary">your model</Tag>
          <Tag>built to order</Tag>
        </div>
        <h3 id="offer-commission" className="font-display mt-5 text-2xl font-semibold tracking-tight sm:text-3xl">
          A model for <span className="text-lamp">your job</span>
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Tell us the task, where it has to run and what a right answer looks like. We define the job, gather verified knowledge, distil from a large teacher, train a small student, measure it against gates and an independent panel, and hand you the weights, the export for your runtime and the report - the same steps that built every model listed here.
        </p>
      </div>
      <div className={`flex flex-col ${wide ? 'lg:h-full' : ''}`}>
        <dl className={`mt-6 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-border pt-6 sm:grid-cols-3 ${wide ? 'lg:mt-0 lg:border-t-0 lg:pt-1' : ''}`}>
          <Spec icon={<Cpu className="size-3.5" />} k="size" v="0.5B - 8B" sub="sized to the job and the device" />
          <Spec icon={<Globe className="size-3.5" />} k="runs in" v="where your data is" sub="browser · laptop · on-prem · private cloud · edge" />
          <Spec icon={<Wrench className="size-3.5" />} k="you get" v="weights · export · report" sub="everything needed to run it without us" />
        </dl>
        <div className="mt-auto flex flex-wrap items-center gap-3 pt-7">
          <a href={`mailto:${CONTACT}?subject=${encodeURIComponent('A model for our job')}`} className={primaryCta}>
            <Mail className="size-4" aria-hidden="true" /> Start with a measurement
          </a>
          <Link to="/#how" className={secondaryCta}>
            How we build
          </Link>
        </div>
      </div>
    </article>
  );
}
