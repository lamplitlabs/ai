import { ArrowRight, ArrowUpRight, Cpu, Globe, KeyRound, Mail, Wrench } from 'lucide-react';
import { commissionMailto } from './data';
import { Link } from './router';
import { TryLink } from './TryLink';
import { CopyButton } from './CopyButton';
import { Gauge, Spec, Tag } from './lab';
import { defaultDtype, EDITION_LABELS, gb, mailtoFor, measuredPct, modelCta, NOT_MEASURED, requestBody, runsIn, runsInDetail, selfHostCommand, shortDate, weightsAvailability, weightsSpec, type SiteModel } from './data';
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
  const cta = modelCta(m);
  const { publicWeights } = cta;
  const pull = selfHostCommand(m);
  const primary = cta.kind === 'try' ? (
    <TryLink href={cta.href} className={primaryCta}>
      Try it
    </TryLink>
  ) : cta.kind === 'hub' ? (
    <a href={cta.href} target="_blank" rel="noopener noreferrer" className={primaryCta}>
      <ArrowUpRight className="size-4" aria-hidden="true" /> Weights on Hugging Face
    </a>
  ) : (
    <a href={cta.href} className={primaryCta} data-testid="request-edition">
      <Mail className="size-4" aria-hidden="true" /> Request this edition
    </a>
  );
  return (
    <article className={`glass glass-lift card-glow corner-marks flex h-full flex-col rounded-3xl p-6 sm:p-8 ${featured ? 'glow-border' : ''}`} aria-labelledby={`offer-${m.name}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Tag tone="primary">{EDITION_LABELS[m.edition]}</Tag>
        {g ? <Tag tone={g.release ? 'success' : 'warning'}>{g.release ? 'release gate passed' : 'gate not passed'}</Tag> : null}
        <Tag>{weightsAvailability(m, publicWeights)}</Tag>
        <span className="mono-label ml-auto hidden text-muted-foreground sm:inline">{m.label}</span>
      </div>
      <h3 id={`offer-${m.name}`} className="font-display mt-5 text-2xl font-semibold tracking-tight sm:text-3xl">
        {m.line} <span className="text-lamp">· {m.edition}</span>
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{m.pitch}</p>

      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-border pt-6 sm:grid-cols-3">
        <Spec icon={<Cpu className="size-3.5" />} k="size" v={`${m.params_b}B`} sub={`base ${m.base_model.split('/').pop()}`} />
        <Spec icon={<Globe className="size-3.5" />} k="runs in" v={runsIn(m)} sub={runsInDetail(m)} />
        <Spec icon={<KeyRound className="size-3.5" />} k="weights" v={publicWeights ? 'yours to download' : 'yours on request'} sub={weightsSpec(m, publicWeights)} />
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
              <div className={`datum-value mt-1.5 text-2xl font-semibold leading-none ${facts?.ok ? 'text-success' : 'text-warning'}`}>{measuredPct(facts?.actual, 1)}</div>
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

      {pull ? (
        <div className="mt-6 flex items-center justify-between gap-2" data-testid="offer-pull">
          <code className="mono-label truncate text-xs text-muted-foreground" title={pull}>
            {pull}
          </code>
          <CopyButton text={pull} label={`Copy the pull command for ${m.label}`} />
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-3 pt-1">
        {primary}
        {!publicWeights && cta.kind !== 'mail' ? (
          /* A browser-only edition whose weights are not public: ask for them from the landing, as /models allows. */
          <a href={mailtoFor(m)} className={secondaryCta} data-testid="request-edition">
            <Mail className="size-4" aria-hidden="true" /> Request this edition
          </a>
        ) : null}
        {!publicWeights ? (
          /* The same request as the mailto, for a visitor whose browser has no mail handler: copy it and paste it anywhere. */
          <CopyButton text={requestBody(m)} label="Copy the request" />
        ) : null}
        <Link to={`/models#${m.name}`} className={secondaryCta}>
          Datasheet
        </Link>
        {cta.secondaryHub ? (
          <a href={cta.secondaryHub} target="_blank" rel="noopener noreferrer" className="mono-label ml-auto inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground">
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
          <a href={commissionMailto()} className={primaryCta}>
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

/**
 * The offerings' measured numbers side by side, so a visitor choosing between editions compares them in one view
 * instead of scrolling between cards. Every cell comes from `site.json` through the same helpers the cards use; an
 * unmeasured value says so in words (`NOT_MEASURED`), never a bare dash. The last column links to the edition's
 * pull command on its datasheet when the weights are public, or to the mail CTA when they are not.
 */
export function OfferingComparison({ models: ms }: { models: SiteModel[] }) {
  if (ms.length < 2) return null;
  const th = 'mono-label px-3 py-2 text-left font-normal text-muted-foreground first:pl-0 last:pr-0';
  const td = 'tnum px-3 py-3 align-top first:pl-0 last:pr-0';
  return (
    <div className="glass corner-marks mb-4 overflow-x-auto rounded-3xl p-6 sm:p-8" data-testid="offering-comparison">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="compare-offerings" className="font-display text-lg font-semibold tracking-tight">
          Side by side
        </h3>
        <span className="mono-label text-muted-foreground">measured numbers · newest version of each edition</span>
      </div>
      <table className="mt-4 w-full min-w-[40rem] border-collapse text-sm" aria-labelledby="compare-offerings">
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className={th}>edition</th>
            <th scope="col" className={th}>size</th>
            <th scope="col" className={th}>runs in</th>
            <th scope="col" className={th}>facts</th>
            <th scope="col" className={th}>release gates</th>
            <th scope="col" className={th}>download</th>
            <th scope="col" className={th}>measured</th>
            <th scope="col" className={th}>get it</th>
          </tr>
        </thead>
        <tbody>
          {ms.map((m) => {
            const g = m.gate;
            const facts = g?.gates.facts;
            const gates = g ? Object.values(g.gates) : [];
            const passed = gates.filter((x) => x.ok).length;
            const pull = selfHostCommand(m);
            const size = defaultDtype(m);
            return (
              <tr key={m.name} className="border-b border-border/60 last:border-b-0" data-testid={`compare-${m.name}`}>
                <th scope="row" className={`${td} text-left font-medium`}>
                  <Link to={`/models#${m.name}`} className="hover:underline">
                    {m.line} <span className="text-lamp">· {m.edition}</span>
                  </Link>
                  <div className="mono-label mt-1 font-normal text-muted-foreground">{m.label}</div>
                </th>
                <td className={td}>{m.params_b}B</td>
                <td className={td}>{runsIn(m)}</td>
                <td className={`${td} font-semibold ${facts?.ok ? 'text-success' : facts ? 'text-warning' : ''}`}>{measuredPct(facts?.actual, 1)}</td>
                <td className={`${td} ${g ? (g.release ? 'text-success' : 'text-warning') : ''}`}>{g ? `${passed} / ${gates.length}` : NOT_MEASURED}</td>
                <td className={td}>{size ? gb(size.size_mb) : NOT_MEASURED}</td>
                <td className={`${td} text-muted-foreground`}>{g?.created_at ? shortDate(g.created_at) : NOT_MEASURED}</td>
                <td className={td}>
                  {pull ? (
                    <Link to={`/models#${m.name}`} className="inline-flex items-center gap-1 text-primary hover:underline" title={pull}>
                      pull command <ArrowRight className="size-3" aria-hidden="true" />
                    </Link>
                  ) : (
                    <a href={modelCta(m).href} className="inline-flex items-center gap-1 text-primary hover:underline">
                      ask by mail <ArrowRight className="size-3" aria-hidden="true" />
                    </a>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
