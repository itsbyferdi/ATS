/**
 * Changes the text of a CV back into a structure. Then writes the CV in a form that a
 * program can read: one column, usual headings, dates in a readable form and contact
 * data as usual text.
 *
 * This process uses rules of thumb, and it says so. It obeys one rule at all times: it
 * discards nothing. Each block that it cannot put in a section goes into `unparsed`, and
 * the program writes that block below "Additional information". A CV tool that removes a
 * job without a message is worse than a tool that selects the incorrect heading.
 */
import { extractFields } from './fields.js';
import { SECTION_PATTERNS } from './lexicon.js';
import { findDateRanges, flatten } from './text.js';
import type { ExtractedFields } from './types.js';

const BULLET_RE = /^\s*([•·▪●○◦*‣⁃−–—-]|\d+[.)])\s+/;

export type SectionKind = 'summary' | 'skills' | 'experience' | 'education' | 'other';

export interface CvEntry {
  /** "Product Designer". This is the part that recruiters search for. */
  role: string;
  /** "Acme Corporation", if a comma divides it from the job title. */
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
   * Text in the header that is not an email address, a telephone number, a location or a
   * link. Examples: "Open to relocation to Singapore" and a note about permission to
   * work. A contact line that uses only the extracted fields discards this text.
   */
  contactExtra: string[];
  sections: CvSection[];
  /** Blocks that the program could not put in a section. It writes them, always. */
  unparsed: string[];
  fields: ExtractedFields;
  /** True if the job history comes from the dates, not from the headings. */
  salvaged: boolean;
}

/** The headings that a program looks for. The rebuilder writes these headings. */
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
 * Puts the text into blocks. A CV with empty lines between the paragraphs gives the
 * blocks directly. A CV from a PDF gives many single lines, thus the function joins each
 * continuation line to the block above it.
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
      // A block of this length is no longer one paragraph. More joins make the full CV
      // into one block that nobody can read.
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

/** Divides "Singapore (Remote) | October 2023 - Present" into two parts. */
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

  // The function cannot read the range. The start date is a placeholder, or the format
  // is unknown. Use the separator and keep the text without changes.
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
 * A line below a job title that has the location and the dates. The function must know
 * the difference between this line and a job title. If the dates do not parse, because
 * of a placeholder or an unusual format, the function reads the block as a new job.
 */
function looksLikeMeta(block: string): boolean {
  if (block.split(/\s+/).length > 14) return false;
  return /[|·•]/.test(block) || /\b(19|20)\d{2}\b/.test(block) || /present|current/i.test(block);
}

/** Divides "Product Designer, Acme Corporation" into the job title and the company. */
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

    // The line immediately after a job title, before the items, has the location and
    // the dates of that job. This is true also if the dates are a placeholder.
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
 * The last method, for a file with no headings.
 *
 * A damaged layout destroys the headings first. A side column through the middle of the
 * page changes "EDUCATION" into "E   ducation". Dates stay correct much more frequently,
 * and a date range is almost always the start of a job. Thus the function divides the
 * text at each date, and each part becomes one job.
 *
 * The function is strict. If the parts do not look like jobs, it returns nothing and the
 * caller gives an accurate report. A structure that the function invents is worse than a
 * statement that there is no structure.
 */
function salvageByDates(text: string): CvEntry[] {
  const ranges = findDateRanges(text);
  if (ranges.length < 2) return [];

  // A short part that ends with a comma and has no job word is a location, not a job.
  const looksLikePlace = (s: string) =>
    s.length <= 40 &&
    /[,(]/.test(s) &&
    !/\b(designer|engineer|manager|developer|analyst|director|officer|lead|nurse|teacher|consultant|specialist|coordinator|assistant|accountant|technician|administrator)\b/i.test(s);

  const entries: CvEntry[] = [];
  for (let i = 0; i < ranges.length; i++) {
    const r = ranges[i];

    /*
     * Before the date there is usually the job title on the same line. As an alternative,
     * there is the location on the same line and the job title on the line above. Use of
     * the same line at all times gave jobs with the name "Jakarta,", which is a location
     * in the position of a job title.
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
   * Two corrections for the same problem. A damaged file with two columns mixes the side
   * column into the text. Thus a division can occur at an incorrect word and make a job
   * with the name "Tools".
   *
   * Two jobs with the same date range are one job that the function found two times.
   * Keep the job with the better job title. A job title that is a full paragraph shows
   * an incorrect division. A single word with no items below it is text from the side
   * column.
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

  // If the file has no headings, the header must stay small. A header of a fixed size
  // removes the full body of a CV that did not parse, and nobody sees the problem.
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
   * Keep the header text that the new contact line does not contain. Keep only the short
   * parts that look like contact data.
   *
   * This code lost full paragraphs in two ways. It discarded a block if the block
   * contained a known value at any position. Thus a block with one half of the CV
   * disappeared because it contained the name of the city. It also wrote no long header
   * blocks. Now each part that is not clearly contact data goes to `unparsed`, and the
   * program always writes `unparsed`.
   */
  const known = [fields.email, fields.phone, fields.location, fields.linkedin, fields.portfolio]
    .filter(Boolean)
    .map((v) => flatten(String(v)));

  const contactExtra: string[] = [];
  for (const block of contact) {
    for (const raw of block.split(/\s*[|·•]\s*/)) {
      const segment = raw.trim();
      if (segment.length < 4) continue;

      // This part is too long for contact data. It is content, and the program keeps
      // all content.
      if (segment.length > 70 || segment.split(/\s+/).length > 12) {
        unparsed.push(segment);
        continue;
      }
      const f = flatten(segment);
      if (!f) continue;
      if (/^(portfolio|linkedin|email|phone|mobile|website|web)\b:?$/i.test(segment)) continue;
      // Remove a part only if the part is a known value. Do not remove a part that
      // contains a known value.
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
   * The file has no headings, thus all the text went to `unparsed`. Before the program
   * stops, it tries to use the dates. The program writes all the text that this method
   * does not use. Thus the method can add structure, but it cannot remove content.
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

      // This method read the full document, thus the text that it used is also in
      // `unparsed`. Two copies of the text gave a CV with each item two times.
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
 * All three templates use one column and the same usual headings, because these two
 * things make a file readable. The templates are different in their order and their
 * density. These two things change what a person reads first.
 */
export type TemplateId = 'classic' | 'compact' | 'skills-first';

export interface Template {
  id: TemplateId;
  name: string;
  blurb: string;
  order: SectionKind[];
  headline: boolean;
  summary: boolean;
  /** Puts the skills on one line to save space. */
  inlineSkills: boolean;
}

export const TEMPLATES: Template[] = [
  {
    id: 'classic',
    name: 'Classic',
    blurb: 'Summary, experience, education and skills. Most recruiters expect this order. It is the safest choice.',
    order: ['summary', 'experience', 'education', 'skills', 'other'],
    headline: true,
    summary: true,
    inlineSkills: false,
  },
  {
    id: 'compact',
    name: 'Compact',
    blurb: 'No summary, and the skills go on one line. Thus more of your work goes on the first page. Use this if you have many jobs.',
    order: ['experience', 'skills', 'education', 'other'],
    headline: true,
    summary: false,
    inlineSkills: true,
  },
  {
    id: 'skills-first',
    name: 'Skills first',
    blurb: 'The skills go above your job history. Use this if you change field, or if the advert asks for specific tools.',
    order: ['summary', 'skills', 'experience', 'education', 'other'],
    headline: true,
    summary: true,
    inlineSkills: false,
  },
];

export const templateById = (id: TemplateId): Template =>
  TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];

/** The new contact line. It contains the fields that the program found. */
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
 * The primary form of the CV. A hiring program gets this text after it opens the file.
 * The program gives a score to this text, thus the score applies to the content and not
 * to the file format.
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

/** Use this format to edit the CV. Send the DOCX or the PDF file, not this file. */
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
 * `clean`: the program found the structure and put all the text in a section. Use it.
 * `partial`: the program could not organise some text, but it discarded nothing. Show
 * this result with a warning. A refusal gives the user nothing.
 * `unusable`: the file has too little text to use.
 */
export type RebuildQuality = 'clean' | 'partial' | 'unusable';

export interface Rebuild {
  doc: CvDocument;
  /** The new CV as usual text. A hiring program gets this after it opens the file. */
  text: string;
  /** The quantity of words in the source file that are not in the new file. */
  wordsLost: number;
  quality: RebuildQuality;
  /** True for `clean` and `partial`. The program shows all but `unusable`. */
  usable: boolean;
  /** The problems, in simple words. This list is empty for a clean result. */
  problems: string[];
}

const wordsIn = (s: string) => flatten(s).split(' ').filter(Boolean).length;

/**
 * All the text that the parser kept, for any template. A measurement against one
 * template counts the summary that Compact removes as lost data. Compact removes the
 * summary on purpose. Thus that measurement refuses a correct result.
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
 * Makes the CV again, then examines the result. It counts the words before and after.
 *
 * The parser uses rules of thumb. If the text layer of a CV is already damaged, the
 * parser can fail: it cannot identify the headings, the items have no markers and a side
 * column goes through the middle. A "corrected" CV that lost three jobs does real damage
 * to the user. Thus the program does not show a result that lost more than one tenth of
 * the words. For these files, the correct advice is to correct the source file first.
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
   * The program refuses only a file with almost no readable text. The old rule refused
   * each file that lost one tenth of its words. Thus the program refused a damaged but
   * complete CV although it kept each word. The user got only instructions to correct
   * the file, and no result.
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

/** The program uses this format for the preview on the screen and for the PDF. */
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
