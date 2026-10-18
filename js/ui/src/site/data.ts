import site from '@/data/site.json';

/** `site.json` is generated outside this repo (ADR-001's data contract) from the training runs; refresh it after every training round. */
export interface GateCheck {
  threshold: number;
  /** null when the check could not measure (e.g. no verify report for the export gate) - `note` says why */
  actual: number | null;
  ok: boolean;
  note?: string;
}
export interface CategoryRates {
  n: number;
  /** absent for categories with nothing checkable (free dialogue) */
  facts?: number;
  ok: number;
  not_truncated: number;
  length_budget: number;
}
export interface GateSummary {
  suite_size: number;
  release: boolean;
  /** what answered: `transformersjs` (the export the browser runs) or `pytorch` (the trained weights, no export) */
  runtime: string | null;
  dtype: string | null;
  max_new_tokens: number | null;
  created_at: string | null;
  gates: Record<string, GateCheck>;
  rates: Record<string, number>;
  by_category: Record<string, CategoryRates>;
}
export interface JudgeVerdict {
  judge: string;
  mean: number | null;
  means: Record<string, number>;
  satisfied: boolean;
  severe_errors: number | null;
}
export interface PanelSummary {
  round: number | null;
  mean: number | null;
  means: Record<string, number>;
  satisfied: number;
  required: number;
  judges: JudgeVerdict[];
}
export interface DtypeSize {
  dtype: string;
  size_mb: number;
  chunks: number;
  max_chunk_mb: number;
  wasm: boolean;
}
export interface Measured {
  machine: string;
  dtype: string;
  tok_s: string;
  load_network_s: number | null;
  load_cache_s: number | null;
}
/** editions of a line, named by size class (ADR-018 in the model repository): `browser` fits a browser, `medium` needs a GPU */
export type Edition = 'browser' | 'medium';
export interface SiteModel {
  name: string;
  label: string;
  /** the product this row is an edition of, by name; editions of one line are grouped on the site */
  line: string;
  edition: Edition;
  /** `onnx`: an export the browser runs; `pytorch`: merged trained weights for a GPU, measured by the PyTorch gate */
  weights: 'onnx' | 'pytorch';
  /** the one-line offer */
  pitch: string;
  purpose: string;
  showcase: boolean;
  base_model: string;
  params_b: number;
  /** memory a GPU or workstation needs for the weights, when the line is not a download */
  memory_gb: number | null;
  /** size of the trained weights a visitor downloads (safetensors shards), for a line without an export; null when unknown */
  weights_mb: number | null;
  licence: string;
  /** null for a line without an export */
  exported_at: string | null;
  /** when its gate ran */
  measured_at: string | null;
  opset: number | null;
  runtime: { onnxruntime: string | null; transformers: string | null };
  grounding: boolean;
  dtypes: DtypeSize[];
  browser: boolean;
  /** some dtype also fits ORT's 32-bit WASM heap (the producer's rule: under 2,100 MB with the shared files) */
  wasm: boolean;
  export_agreement: Record<string, number> | null;
  gate: GateSummary | null;
  panel: PanelSummary | null;
  measured: Measured[];
  /**
   * the Hub repo the weights live in; `revision` (a release tag) once public;
   * `space` the Hugging Face Space that runs the model - the site links there instead of shipping a runtime (ADR-001)
   */
  hub: { repo: string | null; public: boolean; revision?: string; space?: string };
  /** the prompt the model was trained under (from its export manifest); a demo sends exactly this */
  system_prompt: string | null;
}
export interface SiteData {
  generated_at: string;
  suite: { scenarios: number | null; judge_scale: string; judge_satisfied_at: number };
  models: SiteModel[];
}

export const siteData = site as unknown as SiteData;
export const models = siteData.models;
export const showcaseModels = models.filter((m) => m.showcase);
/** The model the site leads with: newest showcase model that runs in a browser. */
export const flagship = showcaseModels.find((m) => m.browser) ?? showcaseModels[0];
/** The product lines on offer, each with its showcase editions in curated order (browser first). */
export const lines = [...new Set(showcaseModels.map((m) => m.line))].map((line) => ({ line, editions: showcaseModels.filter((m) => m.line === line) }));
/** The newest measurement on the site. */
export const latestMeasuredAt = showcaseModels.map((m) => m.measured_at ?? '').sort().at(-1) || null;

export const EDITION_LABELS: Record<Edition, string> = { browser: 'browser edition', medium: 'medium edition' };
/** Where an edition runs, from its weights: a browser export or a GPU-sized checkpoint. */
export const runsIn = (m: SiteModel) => (m.weights === 'pytorch' ? 'GPU server · workstation' : m.browser ? 'browser · desktop · server' : 'desktop · server');
export const runsInDetail = (m: SiteModel) => (m.weights === 'pytorch' ? `${m.memory_gb ? `about ${m.memory_gb} GB of memory` : 'a GPU'} · PyTorch` : m.browser ? (m.wasm ? 'WebGPU / WASM' : 'WebGPU (Chrome, Edge)') : 'ONNX Runtime (desktop · server)');
export const weightsFormat = (m: SiteModel) => (m.weights === 'pytorch' ? 'safetensors' : 'ONNX');
export const weightsDetail = (m: SiteModel) => (m.weights === 'pytorch' ? 'merged weights · bf16' : `opset ${m.opset ?? NOT_MEASURED} · ORT ${m.runtime.onnxruntime ?? NOT_MEASURED}`);
/** The licence name without its parenthetical ("Apache-2.0 (inherited from X)" -> "Apache-2.0"); a licence with no parenthetical is returned whole. */
export const licenceName = (m: SiteModel) => m.licence.split(' (')[0].trim() || m.licence;
/** The weights-availability tag shown on /models and the offerings list: one copy so it cannot drift. */
export const weightsAvailability = (m: SiteModel, publicWeights: boolean) => (publicWeights ? `public weights${m.hub.revision ? ` · ${m.hub.revision}` : ''}` : `weights on request · ${CONTACT}`);
/** The weights spec line of an offering card: dtype · size · licence for public weights, format · licence otherwise. */
/** The export a visitor downloads by default: the smallest measured dtype (ties broken by dtype name), so the card's size is the one they actually fetch. */
export const defaultDtype = (m: Pick<SiteModel, 'dtypes'>): DtypeSize | undefined =>
  [...m.dtypes].sort((a, b) => a.size_mb - b.size_mb || a.dtype.localeCompare(b.dtype))[0];
export function weightsSpec(m: SiteModel, publicWeights: boolean): string {
  const licence = licenceName(m);
  if (!publicWeights) return `${m.weights === 'pytorch' ? 'merged bf16' : 'export'} · ${licence}`;
  const size = defaultDtype(m);
  if (size) return `${size.dtype} · ${gb(size.size_mb)} · ${licence}`;
  if (m.weights_mb) return `bf16 · ${gb(m.weights_mb)} · ${licence}`;
  return `size unmeasured · ${licence}`;
}
/** How the gate answered: the export the browser runs, or the trained weights themselves. */
export const measuredOn = (g: GateSummary) => (g.runtime === 'pytorch' ? 'trained weights · bf16' : g.dtype ? `${g.dtype} export` : 'export');

/** Where the hosted pieces live; the site data itself carries ids, never hosts (a test asserts it). */
export const HUB_HOST = 'https://huggingface.co';
export const SITE_URL = 'https://ai.lamplitlabs.com/';
export const hubRepoUrl = (repo: string) => `${HUB_HOST}/${repo}`;
export const spaceUrl = (space: string) => `${HUB_HOST}/spaces/${space}`;
/** Where a model can be tried: its Hugging Face Space, or null - the site ships no runtime of its own (ADR-001). */
export const tryUrl = (m: SiteModel | undefined) => (m?.hub.space ? spaceUrl(m.hub.space) : null);
/** Where to ask for weights or a model; one address for every mailto on the site. */
export const CONTACT = 'hello@lamplitlabs.com';
/** The Hub repo page of a model's weights, or null while they are not public. */
export const hubUrl = (m: SiteModel) => (m.hub.public && m.hub.repo ? hubRepoUrl(m.hub.repo) : null);
/**
 * The one primary call to action a model card shows, the same rule on /models and the offerings list (510cf0a):
 * a browser model with a Space gets `try`; otherwise public weights get `hub`; otherwise `mail` asks for them.
 * `secondaryHub` is the Hub link shown next to a `try` CTA.
 */
export interface ModelCta {
  kind: 'try' | 'hub' | 'mail';
  href: string;
  hubUrl: string | null;
  tryHref: string | null;
  publicWeights: boolean;
  secondaryHub: string | null;
}
/** The site's general contact link (header and footer): one subject so the two can't drift apart. */
export const contactMailto = () => `mailto:${CONTACT}?subject=${encodeURIComponent('Hello from lamplitlabs.com')}`;
/** The commission offer's mailto ("A model for your job"): subject plus a prefilled body so the draft opens with the job already named, not blank. */
/** The body of the commission mail; also offered as copyable text for a visitor whose browser has no mail handler. */
export const commissionBody = () => "We have a job for a small model - here's the task, where it needs to run, and what a right answer looks like:";
export const commissionMailto = () => `mailto:${CONTACT}?subject=${encodeURIComponent('A model for our job')}&body=${encodeURIComponent(commissionBody())}`;
const requestSubject = (m: SiteModel) => `${m.line} - ${EDITION_LABELS[m.edition]} (${m.label})`;
/**
 * The body of a "Request this edition" mail: names the edition and the numbers it was measured on, so the request
 * arrives with the context the visitor saw on the card (which edition, which gate result) and nothing to retype.
 * Also shown as copyable text in the non-public note for a visitor whose browser has no mail handler.
 */
export const requestBody = (m: SiteModel) => {
  const g = m.gate;
  const facts = g?.gates.facts;
  const numbers = g
    ? `Measured ${shortDate(g.created_at)} on ${g.suite_size} scenarios (${measuredOn(g)}): facts against the reference ${pct(facts?.actual, 1)} (gate ${pct(facts?.threshold)}), release gate ${g.release ? 'passed' : 'not passed yet'}.`
    : 'No measured numbers are published for this edition yet.';
  return `I'm interested in ${requestSubject(m)} (${m.name}, ${m.params_b}B parameters) - can you tell me about self-hosting it?\n\n${numbers}`;
};
export const mailtoFor = (m: SiteModel) => `mailto:${CONTACT}?subject=${encodeURIComponent(requestSubject(m))}&body=${encodeURIComponent(requestBody(m))}`;
/**
 * The one-line command that pulls a model's public weights to a machine of your own - the actionable next step for a
 * visitor evaluating self-hosting, beside the Hub link. Pins the edition's revision when the data names one; null
 * while the weights are not public (there is nothing to download yet - the mailto CTA stands in).
 */
export const selfHostCommand = (m: SiteModel) => {
  if (!m.hub.public || !m.hub.repo) return null;
  const rev = m.hub.revision ? ` --revision ${m.hub.revision}` : '';
  return `huggingface-cli download ${m.hub.repo}${rev} --local-dir ./${m.name}`;
};
export function modelCta(m: SiteModel): ModelCta {
  const hub = hubUrl(m);
  const tryHref = tryUrl(m);
  const canTry = m.browser && tryHref != null;
  const kind: ModelCta['kind'] = canTry ? 'try' : hub ? 'hub' : 'mail';
  const href = kind === 'try' ? (tryHref as string) : kind === 'hub' ? (hub as string) : mailtoFor(m);
  return { kind, href, hubUrl: hub, tryHref, publicWeights: hub != null, secondaryHub: canTry && hub ? hub : null };
}
/**
 * The label of a "try" link, from the line's name ("Try the <line>"). With no model on offer (pass `null`; `undefined`
 * falls back to the flagship) the copy names the destination rather than promising a demo it cannot deliver.
 */
export const tryLabel = (m: SiteModel | null | undefined = flagship) => (m ? `Try the ${m.line}` : 'See the model');

export const GATE_LABELS: Record<string, string> = {
  no_loop: 'never loops',
  not_truncated: 'finishes its answer',
  no_ai_talk: 'no assistant talk',
  language_follows: 'answers in the asked language',
  facts: 'facts checked against the reference',
  shape: 'right shape for the task',
  lexicon: 'cited genders and plurals match the lexicon',
  export: 'export matches the trained weights',
};

/** What each release gate measures, in one sentence, for the methodology tooltips beside the gate names. */
export const GATE_DEFINITIONS: Record<string, string> = {
  no_loop: 'The answer never falls into a repeating loop of the same words or sentences.',
  not_truncated: 'The answer reaches a proper ending instead of being cut off at the token limit.',
  no_ai_talk: 'The answer stays in role and does not talk about being an AI assistant.',
  language_follows: 'The answer is written in the language the scenario asked for.',
  facts: 'The checkable statements in the answer match the reference for the scenario; the gate is the share of scenarios where they all do.',
  shape: 'The answer has the form the task asked for - a list, a correction, a short explanation - rather than something else.',
  lexicon: 'Every gender and plural the answer cites agrees with the project lexicon.',
  export: 'The export the browser runs gives the same answers as the trained weights it was made from.',
};

export const CATEGORY_LABELS: Record<string, string> = {
  'adjective-declension': 'Adjective endings',
  'c1-connectors': 'Two-part connectors (C1)',
  'c1-transform': 'Sentence transformation (C1)',
  clock: 'Telling the time',
  contractions: 'Contractions',
  correction: 'Correcting a learner',
  dates: 'Dates',
  dialogue: 'Dialogue practice',
  'exam-facts': 'Exam facts (telc / Goethe)',
  'false-friends': 'False friends',
  'gender-plural': 'Noun gender and plural',
  'grammar-explain': 'Explaining a grammar point',
  'irregular-verbs': 'Irregular verbs',
  'letter-formal': 'Formal letter',
  'letter-informal': 'Informal letter',
  numbers: 'Numbers',
  ordinals: 'Ordinal numbers',
  'preposition-case': 'Cases after prepositions',
  prices: 'Prices',
  roleplay: 'Role-play in German',
  'scenario-brief': 'Briefing before a situation',
  translation: 'Translation',
  'verb-prepositions': 'Verbs with prepositions',
  'vocab-list': 'Vocabulary lists',
};
export const categoryLabel = (k: string) => CATEGORY_LABELS[k] ?? k.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

/** Categories with a facts rate, best first. */
export const factCategories = (g: GateSummary) => Object.entries(g.by_category).filter((e): e is [string, CategoryRates & { facts: number }] => e[1].facts != null).sort((a, b) => b[1].facts - a[1].facts);

export const pct = (x: number | null | undefined, digits = 0) => (x == null ? NOT_MEASURED : `${(x * 100).toFixed(digits)}%`);
/** What a card shows in place of a number nobody measured yet. One phrase for every field, so no card falls back to a bare dash
 *  that a visitor cannot tell from a failed check (the Models/Offerings tests assert cards never render `–` for a null metric). */
export const NOT_MEASURED = 'not measured yet';
/** Format a measured value, or say it is not measured; the single source for every "measured vs unmeasured" field on a card. */
export const measured = <T,>(x: T | null | undefined, format: (v: T) => string): string => (x == null ? NOT_MEASURED : format(x));
export const measuredPct = (x: number | null | undefined, digits = 0) => measured(x, (v) => pct(v, digits));
export const gb = (mb: number) => (mb >= 1000 ? `${(mb / 1000).toFixed(1)} GB` : `${Math.round(mb)} MB`);
/** Days a measurement data set has been generated for; the site shows a warning past STALE_AFTER_DAYS so a visitor can tell old numbers from current ones. */
export const STALE_AFTER_DAYS = 14;
export const dataAgeDays = (generatedAt: string, now: Date = new Date()) => Math.max(0, Math.floor((now.getTime() - new Date(generatedAt).getTime()) / 86_400_000));
export const shortDate = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : '–');
