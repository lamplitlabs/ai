import { allCategories, categoryLabel, measuredPct, models, pct, type SiteModel } from '../data';

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
  /** The page's "By category" rows for this edition, in the page's order (allCategories: best all-checks rate
   *  first, ties by key): the raw all-checks rate `ok`, the raw `facts` rate or null where the category has
   *  nothing checkable, and the case count `n`. */
  categories: BenchmarksCategoryRow[];
}

/** One "By category" row of an edition, typed: what GateCard's By category list shows, as numbers. */
interface BenchmarksCategoryRow {
  key: string;
  label: string;
  n: number;
  ok: number;
  facts: number | null;
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
    categories: allCategories(m.gate!).map(([key, v]) => ({ key, label: categoryLabel(key), n: v.n, ok: v.ok, facts: v.facts ?? null })),
  }));
}

/** The category keys the CSV has columns for: every category any listed edition was measured on, sorted by key, so
 *  a column means the same category on every row (the page's per-edition best-first order cannot be a header). */
function csvCategoryKeys(rows: BenchmarksJsonRow[]): string[] {
  return [...new Set(rows.flatMap((r) => r.categories.map((c) => c.key)))].sort();
}

/** The three CSV columns of one category: case count, all-checks rate and facts rate. */
const CATEGORY_COLUMNS = ['n', 'ok', 'facts'] as const;

/** The CSV display form of one typed row field: nulls are blank cells, the facts rate is a percent with one
 *  decimal, the judge mean keeps two decimals, and text fields go through csvField() for quoting and
 *  formula-injection protection. */
function benchmarksCsvCells(row: BenchmarksJsonRow, categoryKeys: string[]): string[] {
  const byKey = new Map(row.categories.map((c) => [c.key, c]));
  return [
    csvField(row.label),
    csvField(row.edition),
    String(row.params_b),
    row.facts == null ? '' : measuredPct(row.facts, 1),
    row.released ? 'released' : 'not released',
    row.judge_mean == null ? '' : row.judge_mean.toFixed(2),
    // Each category's rates exactly as the page's By category list prints them (pct, whole percent); a category
    // this edition has no facts rate for, or was not measured on at all, is a blank cell.
    ...categoryKeys.flatMap((k) => {
      const c = byKey.get(k);
      return c ? [String(c.n), pct(c.ok), c.facts == null ? '' : pct(c.facts)] : ['', '', ''];
    }),
  ];
}

/** The fixed leading columns of the CSV header; the By category columns follow them (see benchmarksCsv). */
export const BENCHMARKS_CSV_HEADER = 'label,edition,params_b,facts,release,judge_mean';

/** The full CSV header for these rows: the fixed columns, then `category.<key>.n`, `.ok` and `.facts` for every
 *  category (sorted by key), each name through csvField() like any other field. */
function benchmarksCsvHeader(categoryKeys: string[]): string {
  return [BENCHMARKS_CSV_HEADER, ...categoryKeys.flatMap((k) => CATEGORY_COLUMNS.map((c) => csvField(`category.${k}.${c}`)))].join(',');
}

/** One row per release-gated edition - label, edition, params_b, facts, release gate and judge mean, then every
 *  category's case count, all-checks rate and facts rate, the typed benchmarksRows() fields in CSV display form -
 *  so someone comparing editions can paste the measured numbers straight into a spreadsheet instead of retyping
 *  them. */
export function benchmarksCsv(list: SiteModel[] = chronological): string {
  const rows = benchmarksRows(list);
  const keys = csvCategoryKeys(rows);
  return [benchmarksCsvHeader(keys), ...rows.map((row) => benchmarksCsvCells(row, keys).join(','))].join('\n');
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
