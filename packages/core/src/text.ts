import { SECTION_PATTERNS, SYNONYM_GROUPS } from './lexicon.js';
import type { DateRange, YearMonth } from './types.js';

/** Makes the text lower-case. Replaces the quotation marks and dashes of a word processor. */
export const normalise = (s: string): string =>
  (s ?? '')
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-');

/** Normalised, punctuation-stripped, single-spaced. The form every match runs against. */
export const flatten = (s: string): string =>
  normalise(s)
    .replace(/[^a-z0-9+#./\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Finds a full term in text that is already flat. A term of more than one word must
 * match as a phrase. A single word can have a plural or a verb ending. Thus
 * "prototyping" is a match for "prototype".
 */
export function hasTerm(flatHaystack: string, term: string): boolean {
  const t = normalise(term).trim();
  if (!t) return false;
  const padded = ` ${flatHaystack.trim()} `;
  if (/[^a-z0-9]/.test(t)) return padded.includes(` ${t} `);
  return new RegExp(`(^|[^a-z0-9])${escapeRe(t)}(s|es|ing|ed)?([^a-z0-9]|$)`).test(padded);
}

/** hasTerm, widened by the synonym groups. */
export function termPresent(flatHaystack: string, term: string): boolean {
  if (hasTerm(flatHaystack, term)) return true;
  const t = normalise(term).trim();
  const group = SYNONYM_GROUPS.find((g) => g.includes(t));
  return group ? group.some((alt) => hasTerm(flatHaystack, alt)) : false;
}

const MONTH_ABBR = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const MONTHS =
  'jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december';
const POINT = `(?:${MONTHS})\\.?\\s*,?\\s*(?:19|20)\\d{2}|(?:0?[1-9]|1[0-2])\\/(?:19|20)\\d{2}|(?:19|20)\\d{2}`;

export const dateRangeRegex = (): RegExp =>
  new RegExp(`(${POINT})\\s*(?:-|–|—|to|until)\\s*(${POINT}|present|current|now|ongoing)`, 'gi');

export function parseDatePoint(raw: string): YearMonth | null {
  const s = normalise(raw).trim();
  if (/present|current|now|ongoing/.test(s)) return { year: 9999, month: 12, isPresent: true };

  let m = s.match(/^(\w+)\.?\s*,?\s*((?:19|20)\d{2})$/);
  if (m) {
    const idx = MONTH_ABBR.indexOf(m[1].slice(0, 3));
    if (idx >= 0) return { year: Number(m[2]), month: idx + 1, isPresent: false };
  }
  m = s.match(/^(\d{1,2})\/((?:19|20)\d{2})$/);
  if (m) return { year: Number(m[2]), month: Number(m[1]), isPresent: false };
  m = s.match(/^((?:19|20)\d{2})$/);
  if (m) return { year: Number(m[1]), month: 1, isPresent: false };
  return null;
}

/** The quantity of months from year zero. You can compare these values quickly. */
export const toMonths = (d: YearMonth): number => d.year * 12 + d.month;

export function findDateRanges(text: string): DateRange[] {
  const out: DateRange[] = [];
  const re = dateRangeRegex();
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const start = parseDatePoint(m[1]);
    const end = parseDatePoint(m[2]);
    if (start && end) out.push({ raw: m[0], start, end, index: m.index });
  }
  return out;
}

/** The marker at the start of a list item, in every form a person writes it. */
export const BULLET_RE = /^\s*([•·▪●○◦*‣⁃−-]|\d+[.)])\s*/;

export interface Lines {
  /** The lines that have content. The function removes the spaces at the end. */
  raw: string[];
  /** The text of each item. The function removes the marker. */
  bullets: string[];
  /**
   * The statements. If the item markers are not in the text, the function joins the
   * continuation lines. A line that starts with a lower-case letter is a continuation of
   * the line above it.
   */
  body: string[];
}

export function splitLines(text: string): Lines {
  const raw = text
    .split('\n')
    .map((l) => l.replace(/\s+$/, ''))
    .filter((l) => l.trim() !== '');

  const bullets = raw
    .filter((l) => BULLET_RE.test(l))
    .map((l) => l.replace(BULLET_RE, '').trim())
    .filter((l) => l.length > 12);

  const merged: string[] = [];
  for (const line of raw) {
    const s = line.trim();
    if (merged.length && /^[a-z(&]/.test(s)) merged[merged.length - 1] += ` ${s}`;
    else merged.push(s);
  }

  const body =
    bullets.length >= 4
      ? bullets
      : merged.filter((l) => l.split(/\s+/).length >= 6 && !SECTION_PATTERNS.experience.test(l));

  return { raw, bullets, body };
}
