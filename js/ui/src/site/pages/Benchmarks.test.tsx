import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Benchmarks, benchmarksCsv, benchmarksCsvUrl, benchmarksJson, benchmarksJsonUrl, BENCHMARKS_CSV_FILENAME, BENCHMARKS_CSV_HEADER, BENCHMARKS_JSON_FILENAME, csvField, GateCard, gateAge, lastUpdatedNote, GATE_STALE_AFTER_DAYS, unmetGates, unmetLabel } from './Benchmarks';
import { GATE_DEFINITIONS, GATE_LABELS, models, NOT_MEASURED } from '../data';

const withGate = models.filter((m) => m.gate);
const newest = withGate.reduce((best, m) => ((m.gate!.created_at ?? '') > (best.gate!.created_at ?? '') ? m : best));

/** The Benchmarks header names the newest gated model - the one with the maximum gate.created_at - not whichever
 *  model happens to sit at index 0 of site.json's models list. */
describe('Benchmarks header picks the newest gate', () => {
  it('site.json has at least two gated models and index 0 is not the newest (so this test discriminates)', () => {
    expect(withGate.length).toBeGreaterThanOrEqual(2);
    expect(models[0].name).not.toBe(newest.name);
  });

  it('names the model with the maximum gate.created_at', () => {
    const html = renderToStaticMarkup(<Benchmarks />);
    const status = html.match(/(gate passed|gate not passed)/);
    expect(status, 'header status badge missing').not.toBeNull();
    const headerEnd = html.indexOf(status![0]);
    const header = html.slice(0, headerEnd);
    expect(header).toContain(`${newest.label} · `);
    const expectedStatus = newest.gate!.release ? 'gate passed' : 'gate not passed';
    expect(status![0]).toBe(expectedStatus);
    for (const m of withGate) {
      if (m.name !== newest.name) expect(header).not.toContain(`${m.label} · gate`);
    }
  });
});

/** Beside every gate name sits a methodology marker: a link with an accessible name and a title tooltip carrying the
 *  gate's definition, whose href points at a matching anchor in the methodology list on the same page. */
describe('Benchmarks gate methodology help', () => {
  const html = renderToStaticMarkup(<Benchmarks />);
  const gateKeys = [...new Set(withGate.flatMap((m) => Object.keys(m.gate!.gates)))];

  it('every rendered gate has a definition', () => {
    expect(gateKeys.length).toBeGreaterThan(0);
    for (const k of gateKeys) expect(GATE_DEFINITIONS[k], `no definition for gate ${k}`).toBeTruthy();
  });

  it('renders a reachable link with tooltip and accessible name for each gate, pointing at an anchor on the page', () => {
    for (const k of gateKeys) {
      const link = html.match(new RegExp(`<a[^>]*data-gate-help="${k}"[^>]*>`));
      expect(link, `methodology link missing for gate ${k}`).not.toBeNull();
      expect(link![0]).toContain(`href="#gate-${k}"`);
      expect(link![0]).toMatch(/title="[^"]+"/);
      expect(link![0]).toContain(`aria-label="What &quot;${GATE_LABELS[k] ?? k}&quot; measures:`);
      expect(html, `anchor #gate-${k} missing`).toContain(`id="gate-${k}"`);
    }
    expect(html).toContain('id="methodology"');
  });
});

/** The progression table's release cell names the unmet gate instead of a bare "not yet", so a reader learns which
 *  metric still has to pass. */
describe('Benchmarks release cell names the unmet gate', () => {
  const html = renderToStaticMarkup(<Benchmarks />);

  it('never renders a bare "not yet" tag', () => {
    expect(html).not.toMatch(/>not yet</);
  });

  it('every unreleased edition lists each failing gate by label in the visible row text', () => {
    const unreleased = withGate.filter((m) => !m.gate!.release);
    for (const m of unreleased) {
      const keys = unmetGates(m.gate!.gates);
      expect(keys.length, `${m.name} is unreleased but every gate is ok`).toBeGreaterThan(0);
      const text = unmetLabel(m.gate!.gates);
      for (const k of keys) expect(text).toContain(GATE_LABELS[k] ?? k);
      expect(html).toContain(`data-unmet-gates="${keys.join(',')}"`);
      expect(html).toContain(`>${text}<`);
    }
  });

  it('labels one, several and no failing gates with no "+N more" and no tooltip', () => {
    expect(unmetLabel({ facts: { ok: false }, shape: { ok: true } })).toBe(`not yet: ${GATE_LABELS.facts}`);
    expect(unmetLabel({ facts: { ok: false }, shape: { ok: false } })).toBe(`not yet: ${GATE_LABELS.facts}, ${GATE_LABELS.shape}`);
    expect(unmetLabel({ facts: { ok: true } })).toBe('not yet released');
    expect(html).not.toMatch(/\+\d+ more/);
    expect(html).not.toMatch(/data-unmet-gates="[^"]*" title=/);
  });
});

/** Above the Progression table sits a "last measured" note; when the newest gate run is older than GATE_STALE_AFTER_DAYS
 *  it says so plainly, so a visitor does not mistake stale benchmark data for a current run. */
describe('Benchmarks staleness note above Progression', () => {
  const latestIso = newest.gate!.created_at!;
  const latestDate = latestIso.slice(0, 10);

  it('renders a stale banner when the newest gate is older than the threshold', () => {
    const now = new Date(Date.parse(latestIso) + (GATE_STALE_AFTER_DAYS + 30) * 86_400_000);
    const html = renderToStaticMarkup(<Benchmarks now={now} />);
    const note = html.match(/<p data-last-updated="stale"[^>]*>([^<]*)<\/p>/);
    expect(note, 'stale note missing').not.toBeNull();
    expect(note![1]).toContain(`Last measured ${latestDate}`);
    expect(note![1]).toContain(`${GATE_STALE_AFTER_DAYS + 30} days ago`);
    expect(html.indexOf(note![0])).toBeLessThan(html.indexOf('<table'));
  });

  it('renders only a plain date when the newest gate is recent', () => {
    const now = new Date(Date.parse(latestIso) + 5 * 86_400_000);
    const html = renderToStaticMarkup(<Benchmarks now={now} />);
    expect(html).not.toContain('data-last-updated="stale"');
    expect(html).toMatch(new RegExp(`<p data-last-updated="fresh"[^>]*>Last measured ${latestDate}\\.</p>`));
    const note = html.match(/<p data-last-updated="fresh"[^>]*>([^<]*)<\/p>/);
    expect(note![1]).not.toContain('days ago');
  });

  it('computes the note from the date alone and tolerates a missing date', () => {
    const now = new Date('2026-12-01T00:00:00Z');
    expect(lastUpdatedNote('2026-09-15T06:19:17+00:00', now)?.stale).toBe(false);
    expect(lastUpdatedNote('2026-06-01T00:00:00Z', now)?.stale).toBe(true);
    expect(lastUpdatedNote(null, now)).toBeNull();
    expect(lastUpdatedNote('garbage', now)).toBeNull();
  });

  it('always agrees with the per-row age for the same gate and clock', () => {
    // The "Last measured ... N days ago" age only appears in the note's stale branch, so every case here is
    // older than GATE_STALE_AFTER_DAYS; a fresh note carries no count at all ("Last measured date.").
    const dayCount = (text: string): number | null => {
      if (text.includes('today')) return 0;
      const m = text.match(/(\d+) days? ago/);
      return m ? Number(m[1]) : null;
    };
    const cases = ['2026-06-01T00:00:00Z', '2026-08-15T00:00:00Z', '2026-08-20T12:30:00Z'];
    for (const iso of cases) {
      for (const clock of ['2026-12-01T00:00:00Z', '2026-12-01T23:59:59Z']) {
        const now = new Date(clock);
        const note = lastUpdatedNote(iso, now);
        if (!note) throw new Error(`note missing for ${iso}`);
        if (!note.stale) throw new Error(`expected a stale note for ${iso} at ${clock}`);
        const noteDays = dayCount(note.text);
        const age = gateAge(iso, now);
        if (age === null) throw new Error(`gateAge missing for ${iso} at ${clock}`);
        const rowDays = dayCount(age);
        if (noteDays === null || rowDays === null) throw new Error(`no day count parsed for ${iso} at ${clock}`);
        expect(noteDays, `stale note disagrees with gateAge for ${iso} at ${clock}`).toBe(rowDays);
      }
    }
  });
});

/** A judge panel whose mean is not yet computed says "not measured yet" - the same wording Models/Offerings and the
 *  progression table use - instead of a bare dash the reader has to interpret. */
describe('GateCard null panel/judge mean', () => {
  const base = withGate[0];
  const m = {
    ...base,
    panel: { round: null, mean: null, means: {}, judges: [{ judge: 'judge-x', mean: null, means: {} }] },
  } as unknown as typeof base;
  const html = renderToStaticMarkup(<GateCard m={m} />);

  it('renders NOT_MEASURED for the panel round, panel mean and each judge mean, never a bare dash', () => {
    expect(html).toContain(`round ${NOT_MEASURED} ·`);
    expect(html).toContain(`mean ${NOT_MEASURED} / 5`);
    expect(html).toContain(`>${NOT_MEASURED}</div>`);
    expect(html).not.toMatch(/round – ·/);
    expect(html).not.toMatch(/mean – \/ 5/);
    expect(html).not.toContain('>–</div>');
  });

  it('does not render a Gauge bar for an unmeasured judge, which would read as a real score of zero', () => {
    const judgeCard = html.slice(html.indexOf('judge-x'));
    expect(judgeCard).toContain(`>${NOT_MEASURED}</div>`);
    expect(judgeCard).not.toContain('rounded-full bg-muted');
    expect(judgeCard).not.toMatch(/style="width:/);
  });
});

/** A release gate without a measured value and without a note falls back to the shared NOT_MEASURED wording, the
 *  same phrase every other unmeasured datum on this page uses - never the bare literal "not measured". */
describe('GateCard unmeasured gate without a note', () => {
  const base = withGate[0];
  const [firstKey, firstGate] = Object.entries(base.gate!.gates)[0];
  const m = {
    ...base,
    gate: { ...base.gate!, gates: { ...base.gate!.gates, [firstKey]: { ...firstGate, actual: null, ok: false, note: undefined } } },
  } as unknown as typeof base;
  const html = renderToStaticMarkup(<GateCard m={m} />);

  it('renders NOT_MEASURED, not the literal "not measured"', () => {
    expect(html).toContain(`<span>${NOT_MEASURED}</span>`);
    expect(html).not.toContain('<span>not measured</span>');
  });
});

/** The Copy-as-CSV button next to the Progression heading puts the measured numbers on the clipboard, one row per
 *  gated edition (label, edition, params_b, facts, release gate, judge mean), so someone comparing models pastes
 *  them straight into a spreadsheet instead of retyping them. */
describe('Benchmarks Copy as CSV', () => {
  it('renders the button and copies the fixed header plus one row per gated model', () => {
    const html = renderToStaticMarkup(<Benchmarks />);
    expect(html).toContain('aria-label="Copy as CSV"');
    const lines = benchmarksCsv().split('\n');
    expect(lines[0]).toBe(BENCHMARKS_CSV_HEADER);
    expect(lines[0]).toBe('label,edition,params_b,facts,release,judge_mean');
    expect(lines.length).toBe(1 + withGate.length);
  });

  it('quotes a field containing a carriage return so it cannot split one pasted row into two', () => {
    expect(csvField('a\rb')).toBe('"a\rb"');
    expect(csvField('a\r\nb')).toBe('"a\r\nb"');
  });

  it("prefixes fields starting with =, +, - or @ with ' so Excel/Sheets shows text instead of running a formula", () => {
    expect(csvField('=1+1')).toBe("'=1+1");
    expect(csvField('+1')).toBe("'+1");
    expect(csvField('-1')).toBe("'-1");
    expect(csvField('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(csvField('=HYPERLINK("https://evil.example","x")')).toBe('"\'=HYPERLINK(""https://evil.example"",""x"")"');
    // A leading apostrophe needs no doubling (only double quotes are escaped in CSV); ordinary text is untouched.
    expect(csvField("'=1+1")).toBe("'=1+1");
    expect(csvField('qwen3-0.6b')).toBe('qwen3-0.6b');
  });
});

/** The visitor who wants the numbers as a file (to chart or diff, not to paste) gets a download link carrying the
 *  very text "Copy as CSV" puts on the clipboard, under a stable .csv filename so the OS files it as a spreadsheet. */
describe('Benchmarks Download CSV', () => {
  it('renders the link with a data: URL of benchmarksCsv() and a .csv filename', () => {
    const html = renderToStaticMarkup(<Benchmarks />);
    const link = html.match(/<a[^>]*aria-label="Download CSV"[^>]*>/);
    expect(link, 'a link labelled Download CSV is rendered').toBeTruthy();
    const tag = link![0];
    const href = tag.match(/href="([^"]*)"/)?.[1];
    expect(href?.startsWith('data:text/csv;charset=utf-8,')).toBe(true);
    expect(decodeURIComponent(href!.replace('data:text/csv;charset=utf-8,', ''))).toBe(benchmarksCsv());
    expect(tag).toContain(`download="${BENCHMARKS_CSV_FILENAME}"`);
    expect(BENCHMARKS_CSV_FILENAME).toMatch(/\.csv$/);
    // The helper the component uses builds exactly this URL on its own.
    expect(benchmarksCsvUrl()).toBe(href);
  });
});

/** The visitor who wants to script against the measured numbers - not paste them - gets the same chronological rows
 *  as JSON with typed values (rates as numbers, nulls for what was not measured), so no CSV display text has to be
 *  parsed back into data. */
describe('Benchmarks Download JSON', () => {
  it('renders the link with a data: URL that decodes back to benchmarksJson() and a .json filename', () => {
    const html = renderToStaticMarkup(<Benchmarks />);
    const link = html.match(/<a[^>]*aria-label="Download JSON"[^>]*>/);
    expect(link, 'a link labelled Download JSON is rendered').toBeTruthy();
    const tag = link![0];
    const href = tag.match(/href="([^"]*)"/)?.[1];
    expect(href?.startsWith('data:application/json;charset=utf-8,')).toBe(true);
    expect(decodeURIComponent(href!.replace('data:application/json;charset=utf-8,', ''))).toBe(benchmarksJson());
    expect(tag).toContain(`download="${BENCHMARKS_JSON_FILENAME}"`);
    expect(BENCHMARKS_JSON_FILENAME).toMatch(/\.json$/);
    // The helper the component uses builds exactly this URL on its own.
    expect(benchmarksJsonUrl()).toBe(href);
  });

  it('carries the same chronological rows as the CSV, with typed values and nulls for unmeasured numbers', () => {
    const rows = JSON.parse(benchmarksJson()) as Array<Record<string, unknown>>;
    expect(rows.length).toBe(withGate.length);
    const csvLines = benchmarksCsv().split('\n').slice(1);
    expect(csvLines.length).toBe(rows.length);
    for (const [i, row] of rows.entries()) {
      const m = withGate.find((x) => x.label === row.label);
      expect(m, `JSON row ${i} names a gated model`).toBeTruthy();
      // Same row order as the CSV export: chronological by gate date.
      expect(csvLines[i].startsWith(`${m!.label},`)).toBe(true);
      expect(row.edition).toBe(m!.edition);
      expect(row.params_b).toBe(m!.params_b);
      // Typed, not display text: the raw rate, a boolean, and a number or null.
      expect(row.facts).toBe(m!.gate!.gates.facts?.actual ?? null);
      expect(row.released).toBe(m!.gate!.release);
      expect(row.judge_mean).toBe(m!.panel?.mean ?? null);
      for (const k of ['facts', 'judge_mean']) {
        const v = row[k];
        expect(v === null || typeof v === 'number', `${k} is a number or null`).toBe(true);
      }
    }
  });
});
describe('Progression per-gate freshness', () => {
  it('renders "measured N days ago" for every gated row', () => {
    const now = new Date(Date.parse(newest.gate!.created_at!) + 12 * 86_400_000);
    const html = renderToStaticMarkup(<Benchmarks now={now} />);
    const ages = html.match(/<span data-gate-age[^>]*>([^<]*)<\/span>/g) ?? [];
    expect(ages.length).toBe(withGate.length);
    expect(html).toContain('>measured 12 days ago</span>');
    for (const m of withGate) {
      expect(html).toContain(`>${gateAge(m.gate!.created_at, now)}</span>`);
    }
  });

  it('counts whole days and tolerates a missing date', () => {
    const now = new Date('2026-10-11T12:00:00Z');
    expect(gateAge('2026-10-11T01:00:00Z', now)).toBe('measured today');
    expect(gateAge('2026-10-10T01:00:00Z', now)).toBe('measured 1 day ago');
    expect(gateAge('2026-09-11T01:00:00Z', now)).toBe('measured 30 days ago');
    expect(gateAge(null, now)).toBeNull();
    expect(gateAge('garbage', now)).toBeNull();
  });
});
