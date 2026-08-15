/**
 * Turns the flat text of a CV back into structure, then writes it out in a shape a
 * parser can read: one column, standard headings, dates in a readable form, contact
 * details as plain text.
 *
 * The parsing here is heuristic and says so. The one rule it never breaks is that
 * nothing is thrown away — any block it cannot place lands in `unparsed` and is
 * written out under "Additional information". A CV tool that silently drops a job is
 * worse than one that guesses the heading wrong.
 */
import { extractFields } from './fields.js';
import { SECTION_PATTERNS } from './lexicon.js';
import { findDateRanges, flatten } from './text.js';
import type { ExtractedFields } from './types.js';

const BULLET_RE = /^\s*([•·▪●○◦*‣⁃−–—-]|\d+[.)])\s+/;

export type SectionKind = 'summary' | 'skills' | 'experience' | 'education' | 'other';

export interface CvEntry {
  /** "Product Designer" — the part recruiters search on. */
  role: string;
  /** "Acme Corporation", when a comma separated it from the role. */
  org: string | null;
  location: string | null;
  dates: string | null;
  bullets: string[];
}

export interface CvSection {
  kind: SectionKind;
  heading: string;
  paragraphs: string[];
  entries: CvEntry[];
}

export interface CvDocument {
  name: string | null;
  headline: string | null;
  contact: string[];
  /**
   * Anything in the header that is not an email, phone, location or link — "Open to
   * relocation to Singapore", a work-authorisation note. Rebuilding the contact line
   * from the extracted fields alone would drop these on the floor.
   */
  contactExtra: string[];
  sections: CvSection[];
  /** Blocks that could not be placed. Written out, never dropped. */
  unparsed: string[];
  fields: ExtractedFields;
  /** True when job history came from the date-anchored fallback, not from headings. */
  salvaged: boolean;
}

/** Headings a parser looks for, and the ones we write back. */
const CANONICAL: Record<SectionKind, string> = {
  summary: 'PROFESSIONAL SUMMARY',
  skills: 'SKILLS',
  experience: 'PROFESSIONAL EXPERIENCE',
  education: 'EDUCATION',
  other: '',
};

function isHeading(line: string): boolean {
  const t = line.replace(/[:\s]+$/, '').trim();
  if (!t || t.length > 46 || BULLET_RE.test(t)) return false;
  const letters = t.replace(/[^A-Za-z]/g, '');
  if (letters.length < 3) return false;
  if (letters === letters.toUpperCase()) return true;
  return Object.values(SECTION_PATTERNS).some((re) => re.test(t));
}

function classify(heading: string): SectionKind {
  const h = flatten(heading);
  if (/\b(summary|profile|objective|about)\b/.test(h)) return 'summary';
  if (/\b(skill|skills|competenc|expertise|toolkit|proficienc|tool|tools|technolog)/.test(h)) return 'skills';
  if (/\b(experience|employment|history)\b/.test(h)) return 'experience';
  if (/\b(education|academic|qualification)/.test(h)) return 'education';
  return 'other';
}

/**
 * Group the text into blocks. A CV exported with blank lines between paragraphs gives
 * them up directly; one extracted from a PDF arrives as a wall of single lines, so
 * wrapped lines are stitched back onto the block above.
 */
function toBlocks(text: string): string[] {
  const paragraphs = text.split(/\n[ \t]*\n/).filter((p) => p.trim());
  if (paragraphs.length >= 4) {
    return paragraphs
      .map((p) => p.split('\n').map((l) => l.trim()).filter(Boolean).join(' ').trim())
      .filter(Boolean);
  }

  const out: string[] = [];
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    const indented = /^[ \t]{2,}/.test(rawLine);
    const prev = out[out.length - 1];
    const wraps =
      prev &&
      // A block this long has stopped being one paragraph. Merging further is how a
      // whole CV ends up as a single unreadable blob.
      prev.length < 400 &&
      !BULLET_RE.test(line) &&
      !isHeading(line) &&
      (indented || /^[a-z(&,]/.test(line));
    if (wraps) out[out.length - 1] = `${prev} ${line}`;
    else out.push(line);
  }
  return out;
}

const stripBullet = (s: string) => s.replace(BULLET_RE, '').trim();

/** "Singapore (Remote) | October 2023 - Present" → the two halves. */
function splitMeta(block: string): { location: string | null; dates: string | null } {
  const range = findDateRanges(block)[0];
  if (range) {
    const dates = range.raw.trim();
    let location: string | null = block
      .replace(dates, '')
      .replace(/[|·•,–—-]\s*$/, '')
      .replace(/^\s*[|·•,]\s*/, '')
      .trim();
    if (!location || location.length > 60) location = null;
    return { location, dates };
  }

  // No range we can parse — a placeholder start date, or a format the matcher does not
  // know. Fall back to the separator and keep the text verbatim rather than lose it.
  const parts = block.split(/\s*[|·•]\s*/).map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const last = parts[parts.length - 1];
    if (/\d{4}|present|current/i.test(last)) {
      return { location: parts.slice(0, -1).join(' | ') || null, dates: last };
    }
  }
  return { location: null, dates: null };
}

/**
 * A line under a role that carries the place and the dates. Worth telling apart from a
 * role line, because when the dates fail to parse — a placeholder, an odd format — the
 * block would otherwise be read as a whole new job.
 */
function looksLikeMeta(block: string): boolean {
  if (block.split(/\s+/).length > 14) return false;
  return /[|·•]/.test(block) || /\b(19|20)\d{2}\b/.test(block) || /present|current/i.test(block);
}

/** "Product Designer, Acme Corporation" → role and organisation. */
function splitRole(block: string): { role: string; org: string | null } {
  const clean = block.replace(/\s*[|·•]\s*.*$/, '').trim();
  const comma = clean.indexOf(',');
  if (comma > 0 && comma < clean.length - 1) {
    return { role: clean.slice(0, comma).trim(), org: clean.slice(comma + 1).trim() };
  }
  return { role: clean, org: null };
}

function parseEntries(blocks: string[]): { entries: CvEntry[]; loose: string[] } {
  const entries: CvEntry[] = [];
  const loose: string[] = [];
  let current: CvEntry | null = null;

  for (const block of blocks) {
    if (BULLET_RE.test(block)) {
      if (current) current.bullets.push(stripBullet(block));
      else loose.push(stripBullet(block));
      continue;
    }

    // The line straight after a role line, before any bullets, is that role's place
    // and dates — even when the dates themselves are a placeholder.
    if (current && !current.dates && !current.bullets.length && looksLikeMeta(block)) {
      const { location, dates } = splitMeta(block);
      if (dates || location) {
        current.location = location;
        current.dates = dates;
        continue;
      }
    }

    const { role, org } = splitRole(block);
    const meta = findDateRanges(block).length ? splitMeta(block) : { location: null, dates: null };
    current = { role, org, location: meta.location, dates: meta.dates, bullets: [] };
    entries.push(current);
  }

  return { entries, loose };
}

/**
 * Last resort when no headings survived extraction.
 *
 * Headings are the first thing a mangled layout destroys — a sidebar stitched through
 * the middle leaves "E   ducation" where "EDUCATION" used to be. Date ranges survive
 * that far better, and a date range is almost always the start of a job. So the text is
 * cut at each date and each slice becomes an entry.
 *
 * Deliberately fussy: if the pieces it produces do not look like roles, it returns
 * nothing and lets the caller fall back to reporting honestly. Inventing structure would
 * be worse than admitting there is none.
 */
function salvageByDates(text: string): CvEntry[] {
  const ranges = findDateRanges(text);
  if (ranges.length < 2) return [];

  // A short fragment ending in a comma, with no job word in it, is a place not a job.
  const looksLikePlace = (s: string) =>
    s.length <= 40 &&
    /[,(]/.test(s) &&
    !/\b(designer|engineer|manager|developer|analyst|director|officer|lead|nurse|teacher|consultant|specialist|coordinator|assistant|accountant|technician|administrator)\b/i.test(s);

  const entries: CvEntry[] = [];
  for (let i = 0; i < ranges.length; i++) {
    const r = ranges[i];

    /*
     * The date is usually preceded either by the role on the same line, or by the place
     * on the same line with the role on the line above. Taking the same line blindly
     * produced entries called "Jakarta," — a location where the job title should be.
     */
    const priorLines = text
      .slice(Math.max(0, r.index - 320), r.index)
      .split(/\n/)
      .map((l) => l.replace(/\s{2,}/g, ' ').trim())
      .filter(Boolean);

    const sameLine = priorLines[priorLines.length - 1] ?? '';
    const lineAbove = priorLines[priorLines.length - 2] ?? '';
    const usePrevious = looksLikePlace(sameLine) && lineAbove.length > 0;
    const roleLine = usePrevious ? lineAbove : sameLine;
    const location = usePrevious ? sameLine.replace(/,\s*$/, '') : null;

    const bodyStart = r.index + r.raw.length;
    const bodyEnd = i + 1 < ranges.length ? ranges[i + 1].index : Math.min(text.length, bodyStart + 1400);

    const bullets = text
      .slice(bodyStart, bodyEnd)
      .split(/\n/)
      .map((l) => l.replace(/\s{2,}/g, ' ').trim())
      .filter((l) => l.split(/\s+/).length >= 5);

    if (!roleLine && !bullets.length) continue;
    const { role, org } = splitRole(roleLine || 'Role not recovered');
    entries.push({ role, org, location, dates: r.raw.trim(), bullets });
  }

  /*
   * Two clean-ups, both aimed at the same thing: a mangled two-column file interleaves
   * the sidebar, so the cut can land on a stray word and invent a job called "Tools".
   *
   * Entries sharing a date range are the same job seen twice — keep the one whose role
   * line actually reads like a role. A role line that is a whole paragraph means the cut
   * landed badly, and a bare single word with nothing under it is sidebar debris.
   */
  const roleish = (e: CvEntry) =>
    (e.org ? 2 : 0) + Math.min(e.role.split(/\s+/).length, 6) + (e.bullets.length ? 1 : 0);

  const byDate = new Map<string, CvEntry>();
  for (const e of entries) {
    const key = flatten(e.dates ?? '');
    const seen = byDate.get(key);
    if (!seen) {
      byDate.set(key, e);
      continue;
    }
    const better = roleish(e) > roleish(seen) ? e : seen;
    const other = better === e ? seen : e;
    better.bullets = [...better.bullets, ...other.bullets];
    better.location = better.location ?? other.location;
    byDate.set(key, better);
  }

  const sane = [...byDate.values()].filter(
    (e) => e.role.split(/\s+/).length <= 14 && (e.role.split(/\s+/).length > 1 || e.bullets.length > 0),
  );
  return sane.length >= 2 ? sane : [];
}

export function parseCv(text: string): CvDocument {
  const fields = extractFields(text);
  const blocks = toBlocks(text);

  // With no heading anywhere, the header must stay small. Slicing off a fixed chunk is
  // how a CV that failed to parse loses its entire body without anyone noticing.
  const firstHeading = blocks.findIndex(isHeading);
  const headerEnd = firstHeading === -1 ? Math.min(3, blocks.length) : firstHeading;
  const header = blocks.slice(0, headerEnd);
  const rest = blocks.slice(headerEnd);

  // The header holds the name, usually a headline, then contact lines. Anything in it
  // that is not a contact detail and not the name is treated as the headline.
  const name = fields.name ?? header[0]?.trim() ?? null;
  const contactish = (s: string) =>
    /@|\bhttps?:|linkedin\.com|\.com|\.io|\.dev|\.design|\.me\b|\+?\d[\d\s().-]{6,}/i.test(s);
  const headerRest = header.slice(1).filter((b) => b.trim() && b.trim() !== name);
  const headline = headerRest.find((b) => !contactish(b) && b.split(/\s+/).length <= 9) ?? null;
  const contact = headerRest.filter((b) => b !== headline);

  const sections: CvSection[] = [];
  const unparsed: string[] = [];

  /*
   * Keep header text the rebuilt contact line will not carry — but only the short,
   * contact-shaped pieces.
   *
   * Two ways this used to lose whole paragraphs. A block was dropped outright if it
   * merely *contained* a known value anywhere inside it, so on a badly-extracted file a
   * block holding half the CV vanished because the city name appeared in it. And long
   * header blocks were never written anywhere at all. Anything that is not plainly a
   * contact detail now falls through to `unparsed`, which is always rendered.
   */
  const known = [fields.email, fields.phone, fields.location, fields.linkedin, fields.portfolio]
    .filter(Boolean)
    .map((v) => flatten(String(v)));

  const contactExtra: string[] = [];
  for (const block of contact) {
    for (const raw of block.split(/\s*[|·•]\s*/)) {
      const segment = raw.trim();
      if (segment.length < 4) continue;

      // Too long to be a contact detail: it is content, and content is never discarded.
      if (segment.length > 70 || segment.split(/\s+/).length > 12) {
        unparsed.push(segment);
        continue;
      }
      const f = flatten(segment);
      if (!f) continue;
      if (/^(portfolio|linkedin|email|phone|mobile|website|web)\b:?$/i.test(segment)) continue;
      // Only skip a segment that *is* a known value, not one that merely mentions it.
      if (known.some((k) => k === f)) continue;
      contactExtra.push(segment);
    }
  }

  let open: CvSection | null = null;
  let pending: string[] = [];

  const closeSection = () => {
    if (!open) {
      unparsed.push(...pending);
      pending = [];
      return;
    }
    if (open.kind === 'experience' || open.kind === 'education') {
      const { entries, loose } = parseEntries(pending);
      open.entries = entries;
      open.paragraphs = loose;
    } else {
      open.paragraphs = pending.map((p) => (BULLET_RE.test(p) ? stripBullet(p) : p));
    }
    sections.push(open);
    pending = [];
  };

  for (const block of rest) {
    if (isHeading(block)) {
      closeSection();
      const heading = block.replace(/[:\s]+$/, '').trim();
      open = { kind: classify(heading), heading, paragraphs: [], entries: [] };
    } else {
      pending.push(block);
    }
  }
  closeSection();

  /*
   * No headings anywhere, so everything landed in `unparsed`. Before giving up on
   * structure, try anchoring on the dates instead. Whatever the salvage does not claim
   * still gets written out, so this can add structure but never remove content.
   */
  let salvaged = false;
  let remaining = unparsed;
  if (!sections.some((s) => s.kind === 'experience')) {
    const entries = salvageByDates(text);
    if (entries.length) {
      sections.push({
        kind: 'experience',
        heading: 'PROFESSIONAL EXPERIENCE',
        paragraphs: [],
        entries,
      });
      salvaged = true;

      // The salvage read the whole document, so anything it claimed is still sitting in
      // `unparsed` as well. Writing both out gave a CV with every bullet twice.
      const claimed = flatten(
        entries.flatMap((e) => [e.role, e.org ?? '', e.location ?? '', ...e.bullets]).join(' '),
      );
      remaining = unparsed.filter((block) => {
        const words = flatten(block).split(' ').filter((w) => w.length > 3);
        if (!words.length) return true;
        const seen = words.filter((w) => claimed.includes(w)).length;
        return seen / words.length < 0.8;
      });
    }
  }

  return { name, headline, contact, contactExtra, sections, unparsed: remaining, fields, salvaged };
}

/* ── templates ───────────────────────────────────────────────────────────────
 * All three are single-column and use the same standard headings, because that is
 * what makes a file readable. What differs is order and density — which is the part
 * that actually changes who reads what first.
 */
export type TemplateId = 'classic' | 'compact' | 'skills-first';

export interface Template {
  id: TemplateId;
  name: string;
  blurb: string;
  order: SectionKind[];
  headline: boolean;
  summary: boolean;
  /** Collapse the skills block onto one line to save space. */
  inlineSkills: boolean;
}

export const TEMPLATES: Template[] = [
  {
    id: 'classic',
    name: 'Classic',
    blurb: 'Summary, experience, education, skills. The order most recruiters expect, and the safest default.',
    order: ['summary', 'experience', 'education', 'skills', 'other'],
    headline: true,
    summary: true,
    inlineSkills: false,
  },
  {
    id: 'compact',
    name: 'Compact',
    blurb: 'No summary and skills on one line, so more of your actual work fits on the first page. Good when you have many roles.',
    order: ['experience', 'skills', 'education', 'other'],
    headline: true,
    summary: false,
    inlineSkills: true,
  },
  {
    id: 'skills-first',
    name: 'Skills first',
    blurb: 'Skills sit above your job history. Good for changing field, or when the posting leans hard on specific tools.',
    order: ['summary', 'skills', 'experience', 'education', 'other'],
    headline: true,
    summary: true,
    inlineSkills: false,
  },
];

export const templateById = (id: TemplateId): Template =>
  TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];

/** The contact line, rebuilt from the fields that were actually found. */
export function contactLine(doc: CvDocument): string {
  const f = doc.fields;
  return [f.email, f.phone, f.location, f.linkedin, f.portfolio].filter(Boolean).join(' | ');
}

function orderedSections(doc: CvDocument, t: Template): CvSection[] {
  const out: CvSection[] = [];
  for (const kind of t.order) {
    if (kind === 'summary' && !t.summary) continue;
    for (const s of doc.sections) {
      if (s.kind === kind && (s.paragraphs.length || s.entries.length)) out.push(s);
    }
  }
  return out;
}

const headingFor = (s: CvSection) => CANONICAL[s.kind] || s.heading.toUpperCase();

const entryLine = (e: CvEntry) => [e.role, e.org].filter(Boolean).join(', ');
const metaLine = (e: CvEntry) => [e.location, e.dates].filter(Boolean).join(' | ');

/**
 * The canonical view: what any ATS receives once the container is stripped away. This
 * is the text that gets scored, so the score reflects the file rather than the wrapper.
 */
export function renderText(doc: CvDocument, t: Template): string {
  const out: string[] = [];
  if (doc.name) out.push(doc.name, '');
  if (t.headline && doc.headline) out.push(doc.headline, '');

  const contact = contactLine(doc);
  if (contact) out.push(contact, '');
  if (doc.contactExtra.length) out.push(doc.contactExtra.join(' | '), '');

  for (const s of orderedSections(doc, t)) {
    out.push(headingFor(s), '');
    if (s.entries.length) {
      for (const e of s.entries) {
        out.push(entryLine(e));
        const meta = metaLine(e);
        if (meta) out.push(meta);
        out.push('');
        for (const b of e.bullets) out.push(`- ${b}`);
        if (e.bullets.length) out.push('');
      }
    }
    if (s.paragraphs.length) {
      if (t.inlineSkills && s.kind === 'skills') out.push(s.paragraphs.join('; '), '');
      else for (const p of s.paragraphs) out.push(p, '');
    }
  }

  if (doc.unparsed.length) {
    out.push('ADDITIONAL INFORMATION', '');
    for (const u of doc.unparsed) out.push(u, '');
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

/** For editing and version control. Send the DOCX or the PDF, not this. */
export function renderMarkdown(doc: CvDocument, t: Template): string {
  const out: string[] = [];
  if (doc.name) out.push(`# ${doc.name}`, '');
  if (t.headline && doc.headline) out.push(`**${doc.headline}**`, '');

  const contact = contactLine(doc);
  if (contact) out.push(contact, '');
  if (doc.contactExtra.length) out.push(doc.contactExtra.join(' | '), '');

  for (const s of orderedSections(doc, t)) {
    out.push(`## ${headingFor(s)}`, '');
    for (const e of s.entries) {
      out.push(`### ${entryLine(e)}`);
      const meta = metaLine(e);
      if (meta) out.push(`*${meta}*`);
      out.push('');
      for (const b of e.bullets) out.push(`- ${b}`);
      if (e.bullets.length) out.push('');
    }
    if (s.paragraphs.length) {
      if (t.inlineSkills && s.kind === 'skills') out.push(s.paragraphs.join('; '), '');
      else for (const p of s.paragraphs) out.push(p, '');
    }
  }

  if (doc.unparsed.length) {
    out.push('## ADDITIONAL INFORMATION', '');
    for (const u of doc.unparsed) out.push(u, '');
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

/* ── the safety check ────────────────────────────────────────────────────────*/

/**
 * `clean`   — structure found, everything placed. Use it.
 * `partial` — some of it could not be organised, but nothing was thrown away. Worth
 *             offering with a warning; a flat refusal helped nobody.
 * `unusable`— there was not enough text to work with at all.
 */
export type RebuildQuality = 'clean' | 'partial' | 'unusable';

export interface Rebuild {
  doc: CvDocument;
  /** The rebuilt CV as plain text — what an ATS receives once the file is opened. */
  text: string;
  /** Words in the original that did not survive the rebuild. */
  wordsLost: number;
  quality: RebuildQuality;
  /** True for `clean` and `partial`. Only `unusable` is withheld. */
  usable: boolean;
  /** What went wrong, in plain words. Empty when clean. */
  problems: string[];
}

const wordsIn = (s: string) => flatten(s).split(' ').filter(Boolean).length;

/**
 * Everything the parse held on to, regardless of which template is selected. Measuring
 * against a rendered template would count Compact dropping the summary — a deliberate
 * choice — as data loss, and refuse a perfectly good rebuild.
 */
function retainedWords(doc: CvDocument): number {
  const parts: (string | null)[] = [doc.name, doc.headline, contactLine(doc), ...doc.contactExtra];
  for (const s of doc.sections) {
    parts.push(s.heading, ...s.paragraphs);
    for (const e of s.entries) parts.push(e.role, e.org, e.location, e.dates, ...e.bullets);
  }
  parts.push(...doc.unparsed);
  return wordsIn(parts.filter(Boolean).join(' '));
}

/**
 * Rebuilds, then checks its own work by counting words in and words out.
 *
 * The parser is heuristic, and on a CV whose text layer is already broken it can fail
 * badly — headings unrecognisable, bullets with no markers, a sidebar stitched through
 * the middle. Handing someone a "cleaned up" CV that quietly lost three jobs would do
 * real damage, so a rebuild that drops more than a tenth of the words is refused rather
 * than shown. On those files the honest advice is to fix the source first.
 */
export function rebuildCv(source: string, t: Template): Rebuild {
  const doc = parseCv(source);
  const text = renderText(doc, t);

  const before = wordsIn(source);
  const wordsLost = Math.max(0, before - retainedWords(doc));
  const problems: string[] = [];

  const hasExperience = doc.sections.some((s) => s.kind === 'experience' && s.entries.length);
  const lostShare = before > 0 ? wordsLost / before : 0;

  if (doc.salvaged) {
    problems.push(
      'The section headings did not survive, so the job history was worked out from the dates instead. Check the roles and dates below line up with reality.',
    );
  } else if (!hasExperience) {
    problems.push('No job history could be read, so everything is kept together under "Additional information".');
  }
  if (!doc.sections.length) {
    problems.push('No section headings were found, so there was nothing to organise the CV around.');
  }
  if (lostShare > 0.05) {
    problems.push(
      `${wordsLost} of ${before} words could not be placed under a heading. They are still in the document, at the end.`,
    );
  }

  /*
   * Only a file with almost no recoverable text is withheld now. The old rule refused
   * anything that lost a tenth of its words, which meant a damaged-but-complete CV was
   * held back even though every word of it had been preserved — the user was told to go
   * away and fix the file, with nothing to show for it.
   */
  const quality: RebuildQuality =
    before < 40 || retainedWords(doc) < 40
      ? 'unusable'
      : problems.length === 0
        ? 'clean'
        : 'partial';

  if (quality === 'unusable') {
    problems.length = 0;
    problems.push('There is almost no readable text in this file, so there is nothing to rebuild from.');
  }

  return { doc, text, wordsLost, quality, usable: quality !== 'unusable', problems };
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Drives the on-screen preview and the print-to-PDF path. */
export function renderHtml(doc: CvDocument, t: Template): string {
  const out: string[] = [];
  if (doc.name) out.push(`<h1>${esc(doc.name)}</h1>`);
  if (t.headline && doc.headline) out.push(`<p class="cv-headline">${esc(doc.headline)}</p>`);

  const contact = contactLine(doc);
  if (contact) out.push(`<p class="cv-contact">${esc(contact)}</p>`);
  if (doc.contactExtra.length)
    out.push(`<p class="cv-contact">${esc(doc.contactExtra.join(' | '))}</p>`);

  for (const s of orderedSections(doc, t)) {
    out.push(`<h2>${esc(headingFor(s))}</h2>`);
    for (const e of s.entries) {
      out.push(`<h3>${esc(entryLine(e))}</h3>`);
      const meta = metaLine(e);
      if (meta) out.push(`<p class="cv-meta">${esc(meta)}</p>`);
      if (e.bullets.length) {
        out.push('<ul>');
        for (const b of e.bullets) out.push(`<li>${esc(b)}</li>`);
        out.push('</ul>');
      }
    }
    if (s.paragraphs.length) {
      if (t.inlineSkills && s.kind === 'skills') out.push(`<p>${esc(s.paragraphs.join('; '))}</p>`);
      else for (const p of s.paragraphs) out.push(`<p>${esc(p)}</p>`);
    }
  }

  if (doc.unparsed.length) {
    out.push('<h2>ADDITIONAL INFORMATION</h2>');
    for (const u of doc.unparsed) out.push(`<p>${esc(u)}</p>`);
  }

  return out.join('\n');
}
