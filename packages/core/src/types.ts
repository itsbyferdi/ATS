export type CheckStatus = 'pass' | 'partial' | 'fail';

export type CategoryName =
  | 'Parse Safety'
  | 'Contact'
  | 'Structure'
  | 'Impact Language'
  | 'Job Match';

export const CATEGORY_ORDER: CategoryName[] = [
  'Parse Safety',
  'Contact',
  'Structure',
  'Impact Language',
  'Job Match',
];

/** Points available per category. Job Match is dropped when no job description is supplied. */
export const CATEGORY_MAX: Record<CategoryName, number> = {
  'Parse Safety': 25,
  Contact: 15,
  Structure: 20,
  'Impact Language': 15,
  'Job Match': 25,
};

export interface Check {
  /** Stable id, e.g. "A1". Used by tests and by the UI as a React key. */
  id: string;
  category: CategoryName;
  label: string;
  /** Points available. */
  max: number;
  /** Points awarded, always 0..max. */
  score: number;
  status: CheckStatus;
  /** What the test measured, in plain words. Always present. */
  detail: string;
  /** How to fix it. Present only when score < max. */
  fix?: string;
}

export interface YearMonth {
  year: number;
  month: number;
  isPresent: boolean;
}

export interface DateRange {
  raw: string;
  start: YearMonth;
  end: YearMonth;
  /** Character offset in the source text, so document order is preserved. */
  index: number;
}

export interface ExtractedFields {
  name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  linkedin: string | null;
  portfolio: string | null;
  dateRanges: DateRange[];
  wordCount: number;
  bulletCount: number;
}

export interface Keyword {
  term: string;
  /** Relative importance derived from the job description. */
  weight: number;
  fromLexicon: boolean;
  matched: boolean;
  /** True when the user struck this term out; excluded from scoring. */
  muted: boolean;
}

export interface CategoryScore {
  name: CategoryName;
  score: number;
  max: number;
  /** False for Job Match when no job description was supplied. */
  applicable: boolean;
}

export type BandKey = 'strong' | 'nearly' | 'needs-work' | 'high-risk';

export interface Band {
  key: BandKey;
  label: string;
  advice: string;
  /** Inclusive lower bound. */
  min: number;
}

/** Numbers measured by whichever engine read the file. */
export interface ExtractionDiagnostics {
  engine: string;
  pages: number;
  textRuns: number;
  drawingOps: number;
  characters: number;
  /**
   * PDFs only. How many Type 3 fonts the file uses. ISO 32000 lets a Type 3 font
   * define each letter as a small drawing program, and nothing requires it to say
   * which character that drawing represents. Design tools export these, and that is
   * why the letters look fine and read as nothing.
   */
  type3Fonts?: number;
  /**
   * PDFs only. True when the file carries a structure tree. ISO 14289 (PDF/UA) makes
   * that tree the place a PDF states its reading order. Without one, every parser has
   * to guess the order from where the glyphs sit on the page.
   */
  tagged?: boolean;
}

export interface EngineResult {
  engine: string;
  ok: boolean;
  text: string;
  diagnostics: ExtractionDiagnostics;
  error?: string;
}

/**
 * Two ways a file can fail before any rubric applies.
 *
 * `no-text-layer` — every engine drew the page and got no characters back.
 * `engine-split`  — one engine read the file and another read nothing. You cannot
 *                   choose which parser an employer runs, so a file that is blank to
 *                   one of them is not safe to send.
 */
export type HardFailureKind = 'no-text-layer' | 'engine-split';

export interface HardFailure {
  kind: HardFailureKind;
  diagnostics: ExtractionDiagnostics;
  /** Every engine that ran, so the UI can show who read what. */
  engines: ExtractionDiagnostics[];
  headline: string;
  explanation: string;
  fix: string;
}

export interface ScoreReport {
  /** 0..100, rescaled when Job Match is not applicable. */
  score: number;
  points: number;
  max: number;
  band: Band;
  categories: CategoryScore[];
  checks: Check[];
  fields: ExtractedFields;
  keywords: Keyword[];
  jobTitle: string | null;
  hasJobDescription: boolean;
  /** Failed checks with a fix, ordered by points recoverable. */
  priorityFixes: Check[];
  text: string;
  hardFailure?: HardFailure;
}

export interface ScoreInput {
  text: string;
  jobDescription?: string;
  /** Terms the user struck out because the scanner picked up boilerplate. */
  mutedKeywords?: string[];
  /** Supply when the text came from a PDF, so a zero-text file can hard-fail. */
  diagnostics?: ExtractionDiagnostics;
  /**
   * Every engine that read the file, not just the winning one. Without this a second
   * engine that salvages text hides the fact that the first engine read nothing.
   */
  engines?: ExtractionDiagnostics[];
}
