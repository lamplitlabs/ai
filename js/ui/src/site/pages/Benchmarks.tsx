import { Check, X } from 'lucide-react';
import { Reveal } from '../Reveal';
import { Gauge, Index, Status, Tag } from '../lab';
import { categoryLabel, EDITION_LABELS, factCategories, GATE_LABELS, lines, measuredOn, models, pct, shortDate, siteData, type SiteModel } from '../data';
import { container } from '../cta';
import { PageIntro } from './Models';

const withGate = models.filter((m) => m.gate);
const chronological = [...withGate].sort((a, b) => (a.gate!.created_at ?? '').localeCompare(b.gate!.created_at ?? ''));
const latest = withGate[0];

function Progression() {
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
            <th className="px-5 py-3.5">judges</th>
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
                <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">{shortDate(g.created_at)}</td>
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
                <td className="px-5 py-3.5 font-mono text-xs">{m.panel?.mean != null ? `${m.panel.mean.toFixed(2)} · ${m.panel.satisfied}/${m.panel.required}` : '–'}</td>
                <td className="px-5 py-3.5">{g.release ? <Tag tone="success">passed</Tag> : <Tag>not yet</Tag>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function GateCard({ m }: { m: SiteModel }) {
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
                  </span>
                  <span className="mono-label tnum text-muted-foreground">
                    {v.actual == null ? (
                      <span>{v.note ?? 'not measured'}</span>
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
            <Index n="c">Independent panel</Index>
            <span className="mono-label tnum text-muted-foreground">
              round {m.panel.round ?? '–'} · mean {m.panel.mean?.toFixed(2) ?? '–'} / 5 · {m.panel.satisfied} of {m.panel.required} satisfied
            </span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))]">
            {m.panel.judges.map((j) => (
              <div key={j.judge} className="@container rounded-2xl border border-border bg-background/50 p-5 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{j.judge}</span>
                  <Tag tone={j.satisfied ? 'success' : 'muted'}>{j.satisfied ? 'would ship' : 'not yet'}</Tag>
                </div>
                <div className={`datum-value mt-4 text-3xl font-semibold leading-none ${j.satisfied ? 'text-success' : ''}`}>{j.mean?.toFixed(2) ?? '–'}</div>
                <Gauge className="mt-3" value={(j.mean ?? 0) / 5} threshold={siteData.suite.judge_satisfied_at / 5} ok={j.satisfied} />
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

export function Benchmarks() {
  const gate = latest?.gate;
  return (
    <>
      <PageIntro
        n="bench"
        eyebrow="The measurements"
        title="Every number, including the ones we are not proud of"
        lead={`A fixed suite of ${siteData.suite.scenarios ?? '–'} learner scenarios runs against every edition - a browser edition on the export the browser runs, a larger edition on its trained weights - then independent frontier models score the answers ${siteData.suite.judge_scale}. Nothing is released before the gates pass and the panel agrees.`}
        aside={
          <>
            <Status ok={gate?.release ?? false}>
              {latest?.label ?? 'no model'} · {gate?.release ? 'gate passed' : 'gate not passed'}
            </Status>
            <Status ok={latest?.panel ? latest.panel.satisfied >= latest.panel.required : false}>panel {latest?.panel?.mean?.toFixed(2) ?? '–'} / 5 · bar {siteData.suite.judge_satisfied_at}</Status>
          </>
        }
      />
      <section className={`${container} space-y-10 py-16 lg:py-20`}>
        <Reveal>
          <Index n="01">Progression</Index>
          <div className="mt-5">
            <Progression />
          </div>
          <p className="mt-4 max-w-4xl text-sm leading-relaxed text-muted-foreground">
            {`We show the newest version of each edition, measured with one suite${lines.length ? ` (${lines.map((l) => `${l.line}: ${l.editions.map((e) => e.edition).join(' and ')}`).join('; ')})` : ''}; earlier rounds were retired with their exports and their reports stay in the project's decision records. `}
            {withGate.map((m) => `${m.label} (${m.edition}, ${m.params_b}B, ${measuredOn(m.gate!)}): facts ${pct(m.gate!.gates.facts?.actual, 1)}, ${m.gate!.release ? 'release gate met' : 'release gate not yet met'}${m.panel?.mean != null ? `, judges ${m.panel.mean.toFixed(2)} / 5 with ${m.panel.satisfied} of ${m.panel.required} satisfied` : ''}.`).join(' ')}
            {` The panel's bar is ${siteData.suite.judge_satisfied_at} / 5 per judge; `}
            {withGate.some((m) => m.panel && m.panel.satisfied >= m.panel.required) ? 'where it is met the edition is shipped; where it is not, the next round is measured the same way.' : 'no edition has met it yet, so the next round of each is measured the same way.'}
          </p>
        </Reveal>
        <Reveal stagger className="grid gap-3 md:grid-cols-3">
          {[
            { n: 'gates', k: 'Gates', t: 'Deterministic checks on every answer: does it loop, does it finish, does it stay in the asked language, do its checkable statements match the reference, is the shape right for the task, does the export agree with the trained weights.' },
            { n: 'judges', k: 'Judges', t: 'Frontier models from different vendors score each answer 1-5 on accuracy, helpfulness, language and format, and flag severe errors. Each has to be satisfied on its own; we do not average the disagreement away.' },
            { n: 'honesty', k: 'Honesty', t: 'Judges are models too and make mistakes; scores are a signal, not a certificate. Measurements come from one machine at a time and are labelled as such.' },
          ].map((c) => (
            <div key={c.k} className="glass glass-lift rounded-2xl p-6">
              <div className="mono-label text-primary">{c.n}</div>
              <h3 className="mt-3 font-semibold">{c.k}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.t}</p>
            </div>
          ))}
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
