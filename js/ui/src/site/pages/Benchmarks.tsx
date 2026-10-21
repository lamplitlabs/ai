import { Check, Info, X } from 'lucide-react';
import { CopyButton } from '../CopyButton';
import { Reveal } from '../Reveal';
import { Gauge, Index, Status, Tag } from '../lab';
import { categoryLabel, dataAgeDays, EDITION_LABELS, factCategories, GATE_DEFINITIONS, GATE_LABELS, lines, measuredOn, measuredPct, models, NOT_MEASURED, pct, shortDate, siteData, type SiteModel } from '../data';
import { container } from '../cta';
import { PageIntro } from './Models';

const withGate = models.filter((m) => m.gate);
const chronological = [...withGate].sort((a, b) => (a.gate!.created_at ?? '').localeCompare(b.gate!.created_at ?? ''));
const latest = chronological.at(-1);

/** RFC 4180 quoting, hardened for spreadsheet paste: a field that contains a comma, a quote, a newline or a
 *  carriage return is wrapped in quotes and its quotes doubled (a bare CR would split one row into two), and a
 *  field starting with = + - or @ is prefixed with ' so Excel/Sheets shows it as text instead of running it as a
 *  formula (CSV injection). */
export function csvField(s: string): string {
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export const BENCHMARKS_CSV_HEADER = 'label,edition,params_b,facts,release,judge_mean';

/** One row per release-gated edition - label, edition, params_b, facts, release gate and judge mean - so someone
 *  comparing editions can paste the measured numbers straight into a spreadsheet instead of retyping them. */
export function benchmarksCsv(list: SiteModel[] = chronological): string {
  const rows = list.map((m) => {
    const g = m.gate!;
    const facts = g.gates.facts?.actual;
    const mean = m.panel?.mean;
    return [
      csvField(m.label),
      csvField(m.edition),
      String(m.params_b),
      facts == null ? '' : measuredPct(facts, 1),
      g.release ? 'released' : 'not released',
      mean == null ? '' : mean.toFixed(2),
    ].join(',');
  });
  return [BENCHMARKS_CSV_HEADER, ...rows].join('\n');
}

/** Shown in place of the Progression table when no model has a release-gate run yet. */
export const NO_RUNS_YET = 'No benchmark run has been published yet. Each edition is measured on the fixed suite before release, and its gates and judge scores will appear here.';

/** Days after which the newest gate run is called out as old above the Progression table.
 *  Distinct from `STALE_AFTER_DAYS` in ../data (14 days, the measurement data set age on the landing page). */
export const GATE_STALE_AFTER_DAYS = 90;

/** Whole days between the newest gate's `created_at` and `now`; null when no gate carries a parsable date. */
function daysSinceLatestGate(latestIso: string | null | undefined, now: Date): number | null {
  if (!latestIso) return null;
  const t = Date.parse(latestIso);
  if (Number.isNaN(t)) return null;
  return Math.floor((now.getTime() - t) / 86_400_000);
}

/** The "last updated" note shown above the Progression table: always names the newest run's date, and when that run
 *  is older than GATE_STALE_AFTER_DAYS says so plainly, so a visitor does not mistake stale benchmark data for current. */
export function lastUpdatedNote(latestIso: string | null | undefined, now: Date, staleAfterDays = GATE_STALE_AFTER_DAYS): { text: string; stale: boolean } | null {
  const days = daysSinceLatestGate(latestIso, now);
  if (days == null) return null;
  const date = shortDate(latestIso);
  if (days > staleAfterDays) {
    return { stale: true, text: `Last measured ${date}, ${days} days ago. These numbers describe the editions as they were then, not a newer run.` };
  }
  return { stale: false, text: `Last measured ${date}.` };
}

/** Keys of the gates that failed, in the order the gate file lists them. */
export function unmetGates(gates: Record<string, { ok: boolean }>): string[] {
  return Object.entries(gates).filter(([, c]) => !c.ok).map(([k]) => k);
}

/** The release cell's text when an edition is not released: every missing gate, by its label, as visible text, so a
 *  reader (including one on a touch device, where title tooltips are unreachable) learns what still has to pass
 *  without leaving the row. */
export function unmetLabel(gates: Record<string, { ok: boolean }>): string {
  const unmet = unmetGates(gates).map((k) => GATE_LABELS[k] ?? k);
  if (unmet.length === 0) return 'not yet released';
  return `not yet: ${unmet.join(', ')}`;
}

/** Relative age of one gate run for the Progression table: "measured today", "measured 1 day ago", "measured N days ago";
 *  null when the gate carries no parsable date. Built on the shared dataAgeDays so every age on the site counts the same. */
export function gateAge(createdAt: string | null | undefined, now: Date): string | null {
  if (!createdAt || Number.isNaN(Date.parse(createdAt))) return null;
  const days = dataAgeDays(createdAt, now);
  if (days === 0) return 'measured today';
  return `measured ${days} day${days === 1 ? '' : 's'} ago`;
}

function Progression({ now }: { now: Date }) {
  return (
    <div className="glass overflow-x-auto rounded-2xl">
      <table className="lab-table w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="px-5 py-3.5">model</th>
            <th className="px-5 py-3.5">edition</th>
            <th className="px-5 py-3.5">size</th>
            <th className="px-5 py-3.5">measured</th>
            <th className="px-5 py-3.5">facts</th>
            <th className="px-5 py-3.5">finishes</th>
            <th className="px-5 py-3.5">language</th>
            <th className="px-5 py-3.5">judges · 1-5</th>
            <th className="px-5 py-3.5">release</th>
          </tr>
        </thead>
        <tbody>
          {chronological.map((m) => {
            const g = m.gate!;
            return (
              <tr key={m.name} className="border-b border-border last:border-0">
                <td className="px-5 py-3.5 font-medium">
                  <a href={`#${m.name}`} className="transition-colors hover:text-primary">
                    {m.label}
                  </a>
                </td>
                <td className="px-5 py-3.5 text-muted-foreground">{m.edition}</td>
                <td className="px-5 py-3.5 text-muted-foreground">{m.params_b}B</td>
                <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">
                  {shortDate(g.created_at)}
                  {gateAge(g.created_at, now) ? <span data-gate-age className="mt-0.5 block text-[0.65rem] text-muted-foreground/80">{gateAge(g.created_at, now)}</span> : null}
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <span className="w-14 font-mono text-xs">{pct(g.gates.facts?.actual, 1)}</span>
                    <div className="w-24">
                      <Gauge value={g.gates.facts?.actual ?? 0} threshold={g.gates.facts?.threshold} ok={g.gates.facts?.ok} />
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5 font-mono text-xs">{pct(g.gates.not_truncated?.actual, 1)}</td>
                <td className="px-5 py-3.5 font-mono text-xs">{pct(g.gates.language_follows?.actual, 1)}</td>
                <td className="px-5 py-3.5 font-mono text-xs">{m.panel?.mean != null ? m.panel.mean.toFixed(2) : NOT_MEASURED}</td>
                <td className="px-5 py-3.5">
                  {g.release ? (
                    <Tag tone="success">passed</Tag>
                  ) : (
                    <Tag tone="warning">
                      <span data-unmet-gates={unmetGates(g.gates).join(',')}>{unmetLabel(g.gates)}</span>
                    </Tag>
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

/** A small methodology marker beside a gate name: a tooltip with the gate's definition and a link to the
 *  methodology list further down the page, so a reader can learn what the gate measures without leaving. */
function GateHelp({ k }: { k: string }) {
  const def = GATE_DEFINITIONS[k];
  if (!def) return null;
  const label = GATE_LABELS[k] ?? k;
  return (
    <a
      href={`#gate-${k}`}
      title={def}
      aria-label={`What "${label}" measures: ${def}`}
      data-gate-help={k}
      className="inline-flex text-muted-foreground/70 transition-colors hover:text-primary"
    >
      <Info className="size-3.5" aria-hidden="true" />
    </a>
  );
}

function Methodology() {
  return (
    <div id="methodology" className="glass scroll-mt-20 rounded-2xl p-6 sm:p-8">
      <Index n="gates">What each gate measures</Index>
      <dl className="mt-5 grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
        {Object.entries(GATE_DEFINITIONS).map(([k, def]) => (
          <div key={k} id={`gate-${k}`} className="scroll-mt-20">
            <dt className="font-medium">{GATE_LABELS[k] ?? k}</dt>
            <dd className="mt-1 leading-relaxed text-muted-foreground">{def}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function GateCard({ m }: { m: SiteModel }) {
  const g = m.gate!;
  const gates = Object.entries(g.gates);
  const passed = gates.filter(([, v]) => v.ok).length;
  return (
    <article id={m.name} className="glass corner-marks scroll-mt-20 rounded-3xl p-6 sm:p-8 lg:p-10">
      <div className="flex flex-wrap items-center gap-2">
        <Tag tone={g.release ? 'success' : 'warning'}>{g.release ? 'release gate passed' : 'gate not passed'}</Tag>
        <Tag>
          {passed}/{gates.length} gates
        </Tag>
        <Tag>{g.suite_size} scenarios</Tag>
        <Tag>{measuredOn(g)}</Tag>
        {g.max_new_tokens ? <Tag>{g.max_new_tokens} tokens max</Tag> : null}
        <span className="mono-label ml-auto hidden text-muted-foreground sm:inline">measured {shortDate(g.created_at)}</span>
      </div>
      <div className="mono-label mt-5 text-primary">
        {m.line} · {EDITION_LABELS[m.edition]}
      </div>
      <h2 className="font-display mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{m.label}</h2>
      <div className="mt-8 grid gap-10 lg:grid-cols-2">
        <div>
          <Index n="a">Release gates</Index>
          <ul className="mt-5 space-y-4">
            {gates.map(([k, v]) => (
              <li key={k} className="text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2">
                    {v.ok ? <Check className="size-4 text-success" /> : <X className="size-4 text-warning" />}
                    {GATE_LABELS[k] ?? k}
                    <GateHelp k={k} />
                  </span>
                  <span className="mono-label tnum text-muted-foreground">
                    {v.actual == null ? (
                      <span>{v.note ?? NOT_MEASURED}</span>
                    ) : (
                      <>
                        <span className="text-foreground">{pct(v.actual, 1)}</span> / gate {pct(v.threshold)}
                      </>
                    )}
                  </span>
                </div>
                <Gauge className="mt-2" value={v.actual ?? 0} threshold={v.threshold} ok={v.ok} />
              </li>
            ))}
          </ul>
        </div>
        <div>
          <Index n="b">Facts by category</Index>
          <ul className="mt-5 space-y-3">
            {factCategories(g).map(([k, v]) => (
              <li key={k} className="text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span>
                    {categoryLabel(k)} <span className="mono-label text-muted-foreground/70">· n={v.n}</span>
                  </span>
                  <span className="mono-label tnum text-foreground">{pct(v.facts)}</span>
                </div>
                <Gauge className="mt-1.5" value={v.facts} ok={v.facts >= (g.gates.facts?.threshold ?? 0.85)} />
              </li>
            ))}
          </ul>
        </div>
      </div>
      {m.panel ? (
        <div className="mt-10 border-t border-border pt-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <Index n="c">Independent judges</Index>
            <span className="mono-label tnum text-muted-foreground">
              round {m.panel.round ?? NOT_MEASURED} · {m.panel.judges.length} judges · mean {m.panel.mean != null ? m.panel.mean.toFixed(2) : NOT_MEASURED} / 5 · a signal beside the gates, not a gate
            </span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))]">
            {m.panel.judges.map((j) => (
              <div key={j.judge} className="@container rounded-2xl border border-border bg-background/50 p-5 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{j.judge}</span>
                  <span className="mono-label text-muted-foreground/70">mean / 5</span>
                </div>
                <div className="datum-value mt-4 text-3xl font-semibold leading-none">{j.mean != null ? j.mean.toFixed(2) : NOT_MEASURED}</div>
                {j.mean != null ? <Gauge className="mt-3" value={j.mean / 5} /> : null}
                <dl className="mt-4 grid gap-x-4 gap-y-1.5 text-xs text-muted-foreground @3xs:grid-cols-2">
                  {Object.entries(j.means).map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <dt className="mono-label">{k}</dt>
                      <dd className="tnum font-mono">{v.toFixed(2)}</dd>
                    </div>
                  ))}
                </dl>
                {j.severe_errors != null ? <div className="mono-label mt-4 text-muted-foreground/80">{j.severe_errors} severe errors flagged</div> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {m.measured.length ? (
        <div className="mt-10 border-t border-border pt-8">
          <Index n="d">Measured in a browser</Index>
          <ul className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            {m.measured.map((s) => (
              <li key={s.machine + s.dtype} className="rounded-xl border border-border bg-background/50 p-4">
                <div className="mono-label text-muted-foreground/80">
                  {s.machine} · {s.dtype}
                </div>
                <div className="mt-2 text-foreground">
                  <span className="datum-value text-2xl font-semibold">{s.tok_s}</span> <span className="text-xs text-muted-foreground">tokens/s</span>
                </div>
                <div className="mt-1 text-xs">
                  {s.load_network_s != null ? `first load ${s.load_network_s} s` : ''}
                  {s.load_network_s != null && s.load_cache_s != null ? ' · ' : ''}
                  {s.load_cache_s != null ? `from cache ${s.load_cache_s} s` : ''}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}

export function Benchmarks({ now = new Date() }: { now?: Date } = {}) {
  const gate = latest?.gate;
  const updated = lastUpdatedNote(gate?.created_at, now);
  return (
    <>
      <PageIntro
        n="bench"
        eyebrow="The measurements"
        title="Every number, including the ones we are not proud of"
        lead={`A fixed suite of ${siteData.suite.scenarios ?? NOT_MEASURED} learner scenarios runs against every edition - a browser edition on the export the browser runs, a larger edition on its trained weights - then independent frontier models score the answers ${siteData.suite.judge_scale}. Nothing is released before the gates pass; the judges' scores are published beside them.`}
        aside={
          <Status ok={gate?.release ?? false}>
            {latest?.label ?? 'no model'} · {gate?.release ? 'gate passed' : 'gate not passed'}
          </Status>
        }
      />
      <section className={`${container} space-y-10 py-16 lg:py-20`}>
        <Reveal>
          <Index n="01">Progression</Index>
          {latest ? (
            <div className="mt-3 flex justify-end">
              <CopyButton label="Copy as CSV" text={benchmarksCsv()} fallback />
            </div>
          ) : null}
          {updated ? (
            <p data-last-updated={updated.stale ? 'stale' : 'fresh'} className={`mt-4 text-sm ${updated.stale ? 'rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-foreground' : 'text-muted-foreground'}`}>
              {updated.text}
            </p>
          ) : null}
          <div className="mt-5">
            {latest ? (
              <Progression now={now} />
            ) : (
              <p data-benchmarks-empty className="glass rounded-2xl px-5 py-6 text-sm text-muted-foreground">
                {NO_RUNS_YET}
              </p>
            )}
          </div>
          <p className="mt-4 max-w-4xl text-sm leading-relaxed text-muted-foreground">
            {`We show the newest version of each edition, measured with one suite${lines.length ? ` (${lines.map((l) => `${l.line}: ${l.editions.map((e) => e.edition).join(' and ')}`).join('; ')})` : ''}; earlier rounds were retired with their exports and their reports stay in the project's decision records. `}
            {withGate.map((m) => `${m.label} (${m.edition}, ${m.params_b}B, ${measuredOn(m.gate!)}): facts ${pct(m.gate!.gates.facts?.actual, 1)}, ${m.gate!.release ? 'release gate met' : 'release gate not yet met'}${m.panel?.mean != null ? `, judges ${m.panel.mean.toFixed(2)} / 5` : ''}.`).join(' ')}
            {" The judges' scores are a signal beside the gates, not a gate of their own: each report shows them per judge, and the next round of every edition is measured the same way."}
          </p>
        </Reveal>
        <Reveal stagger className="grid gap-3 md:grid-cols-3">
          {[
            { n: 'gates', k: 'Gates', t: 'Deterministic checks on every answer: does it loop, does it finish, does it stay in the asked language, do its checkable statements match the reference, is the shape right for the task, does the export agree with the trained weights. An edition is released when every gate passes.' },
            { n: 'judges', k: 'Judges', t: 'Frontier models from different vendors score each answer 1-5 on accuracy, helpfulness, language and format, and flag severe errors. Each is shown on its own - we do not average the disagreement away - and the scores sit beside the gates as a signal, not as a release condition.' },
            { n: 'honesty', k: 'Honesty', t: 'Judges are models too and make mistakes; scores are a signal, not a certificate. Measurements come from one machine at a time and are labelled as such.' },
          ].map((c) => (
            <div key={c.k} className="glass glass-lift rounded-2xl p-6">
              <div className="mono-label text-primary">{c.n}</div>
              <h3 className="mt-3 font-semibold">{c.k}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.t}</p>
            </div>
          ))}
        </Reveal>
        <Reveal>
          <Methodology />
        </Reveal>
        {withGate.map((m, i) => (
          <Reveal key={m.name}>
            <Index n={`0${i + 2}`} className="mb-5">
              Report · {m.label}
            </Index>
            <GateCard m={m} />
          </Reveal>
        ))}
      </section>
    </>
  );
}
