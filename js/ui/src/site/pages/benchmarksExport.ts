import { measuredPct, models, type SiteModel } from '../data';

/** The default export list: the release-gated editions in chronological gate order, the same order the page's
 *  table shows them in - the exports and the page always agree without the caller passing a list. */
const chronological = models.filter((m) => m.gate).sort((a, b) => (a.gate!.created_at ?? '').localeCompare(b.gate!.created_at ?? ''));

/** RFC 4180 quoting, hardened for spreadsheet paste: a field that contains a comma, a quote, a newline or a
 *  carriage return is wrapped in quotes and its quotes doubled (a bare CR would split one row into two), and a
 *  field starting with = + - @ tab or CR is prefixed with ' so Excel/Sheets shows it as text instead of running
 *  it as a formula or reinterpreting the leading control character (CSV injection). */
export function csvField(s: string): string {
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** One typed row of the JSON export - and the single source of truth for both exports: `benchmarksJson()`
 *  serialises the rows as-is, and `benchmarksCsv()` formats each typed cell for the spreadsheet (adding a column
 *  means extending this interface and the two formatters, so the typed row and the display row cannot drift).
 *  `facts` stays the raw measured rate (or null, never the formatted "xx.x%" string or the NOT_MEASURED label),
 *  `released` is a boolean and `judge_mean` a number, so a visitor scripting against the numbers parses JSON
 *  instead of display text. */
interface BenchmarksJsonRow {
  label: string;
  edition: SiteModel['edition'];
  params_b: number;
  facts: number | null;
  released: boolean;
  judge_mean: number | null;
}

/** One typed row per release-gated edition, in gate order - the rows behind both benchmarksJson() and
 *  benchmarksCsv(). */
function benchmarksRows(list: SiteModel[]): BenchmarksJsonRow[] {
  return list.map((m) => ({
    label: m.label,
    edition: m.edition,
    params_b: m.params_b,
    facts: m.gate!.gates.facts?.actual ?? null,
    released: m.gate!.release,
    judge_mean: m.panel?.mean ?? null,
  }));
}

/** The CSV display form of one typed row field: nulls are blank cells, the facts rate is a percent with one
 *  decimal, the judge mean keeps two decimals, and text fields go through csvField() for quoting and
 *  formula-injection protection. */
function benchmarksCsvCells(row: BenchmarksJsonRow): string[] {
  return [
    csvField(row.label),
    csvField(row.edition),
    String(row.params_b),
    row.facts == null ? '' : measuredPct(row.facts, 1),
    row.released ? 'released' : 'not released',
    row.judge_mean == null ? '' : row.judge_mean.toFixed(2),
  ];
}

export const BENCHMARKS_CSV_HEADER = 'label,edition,params_b,facts,release,judge_mean';

/** One row per release-gated edition - label, edition, params_b, facts, release gate and judge mean, the typed
 *  benchmarksRows() fields in CSV display form - so someone comparing editions can paste the measured numbers
 *  straight into a spreadsheet instead of retyping them. */
export function benchmarksCsv(list: SiteModel[] = chronological): string {
  return [BENCHMARKS_CSV_HEADER, ...benchmarksRows(list).map((row) => benchmarksCsvCells(row).join(','))].join('\n');
}

/** Filename the Download CSV link saves the same measured numbers under. */
export const BENCHMARKS_CSV_FILENAME = 'lamplit-benchmarks.csv';

/** The CSV as a data: URL, so the download link works with no client-side blob dance (and renders server-side too).
 *  encodeURIComponent escapes every byte CSV can carry - newlines, quotes, commas - so the href stays one attribute. */
export function benchmarksCsvUrl(list: SiteModel[] = chronological): string {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(benchmarksCsv(list))}`;
}

/** The same chronological rows as benchmarksCsv(), as JSON with typed values: the visitor who wants to script
 *  against the measured numbers fetches rates, booleans and counts instead of re-parsing CSV display text. */
export function benchmarksJson(list: SiteModel[] = chronological): string {
  return JSON.stringify(benchmarksRows(list), null, 2);
}

/** Filename the Download JSON link saves the same measured numbers under. */
export const BENCHMARKS_JSON_FILENAME = 'lamplit-benchmarks.json';

/** The JSON as a data: URL, the same no-blob approach as benchmarksCsvUrl, for the Download JSON link beside it. */
export function benchmarksJsonUrl(list: SiteModel[] = chronological): string {
  return `data:application/json;charset=utf-8,${encodeURIComponent(benchmarksJson(list))}`;
}
