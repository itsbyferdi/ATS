/**
 * Reads a pasted CV into the document that the editor writes.
 *
 * A Figma frame is not a document. It is a set of text layers, and the clipboard gives
 * their words with almost no structure around them. This file puts the structure back:
 * it finds the name, the contact line, the headings, the jobs, the dates and the items,
 * and it states which parts it had to guess.
 *
 * The guesses matter more than the parsing. A person pastes a CV once and then trusts
 * what they see, thus every rule that could be wrong reports itself in `notes` and the
 * interface prints those notes beside the result.
 *
 * Nothing here touches the DOM. Each rule is a function of text, thus each rule is
 * testable.
 */
import { newId, type CvDoc, type CvEntry, type CvRow, type CvSection, type SectionKind } from './cv.js';
import { contactLabel } from './fields.js';
import { SECTION_PATTERNS } from './lexicon.js';
import { BULLET_RE, dateRangeRegex } from './text.js';

/** What a browser gives you on a paste. `html` is absent when the source had none. */
export interface PastedClipboard {
  text: string;
  html?: string;
}

export interface ImportResult {
  doc: CvDoc;
  /** True when the clipboard carried Figma's own payload beside the words. */
  fromFigma: boolean;
  /** The markers that gave the answer above, in the words of the interface. */
  evidence: string[];
  /** Where the reader guessed, and what it could not place. Show these to the person. */
  notes: string[];
  /** The quantity of lines of text that arrived. */
  lineCount: number;
}

/*
 * Figma writes its own payload beside the words when you copy a layer. The payload is
 * base64 inside an HTML comment, and it holds the scene itself, thus these markers are
 * proof that the text came from Figma and not from a text editor.
 *
 * Four markers and not one. Figma has changed the shape of this payload before, and a
 * reader that depends on one string reports "not from Figma" the day it changes. Any one
 * marker is sufficient. The last is the base64 form of "fig-kiwi", the name of the
 * format that Figma uses inside the buffer.
 */
const FIGMA_SIGNS: { re: RegExp; says: string }[] = [
  { re: /\(figmeta\)/, says: 'the file header (figmeta)' },
  { re: /\(figma\)/i, says: 'the scene itself (figma)' },
  { re: /data-(?:buffer|metadata)\s*=/i, says: 'the data-buffer element' },
  { re: /ZmlnLWtpd2k/, says: 'the fig-kiwi mark' },
];

/** The Figma markers found in the HTML form of the clipboard. Empty means no proof. */
export function figmaEvidence(html: string | undefined): string[] {
  if (!html) return [];
  return FIGMA_SIGNS.filter((sign) => sign.re.test(html)).map((sign) => sign.says);
}

/*
 * Characters that a layout tool puts in text and a reader must not keep.
 *
 * The no-break space is the one that matters. Figma writes it wherever the layout must
 * not break, and it is not a space to a regular expression, thus "Jan 2023 - Present"
 * with no-break spaces finds no date range and the job loses its dates. The line and
 * paragraph separators are the other form of a line break in a text layer. The zero
 * width characters are invisible and break a keyword match for no visible reason.
 */
const normalise = (s: string): string =>
  s
    .replace(/\r\n?/g, '\n')
    // The line separator and the paragraph separator. A text layer uses one of them for
    // a break inside itself.
    .replace(/[\u2028\u2029]/g, '\n')
    // Zero width space, zero width non-joiner, zero width joiner, byte order mark.
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // The no-break space, the narrow one, the figure space and the tab.
    .replace(/[\u00A0\u202F\u2007\t]/g, ' ')
    .replace(/ {2,}/g, ' ');

/** One line of the paste, with what the source said about it. */
interface Line {
  text: string;
  /** The line was a list item, or it started with a bullet character. */
  bullet: boolean;
  /** The whole line was in a heavier weight. A heading in Figma usually is. */
  bold: boolean;
  /** An empty line came before this one. */
  gapBefore: boolean;
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

const decode = (s: string): string =>
  s.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (whole, body: string) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : Number(body.slice(1));
      return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : whole;
    }
    return ENTITIES[body.toLowerCase()] ?? whole;
  });

const BLOCK_TAG = /^(?:p|div|li|h[1-6]|tr|td|section|article|header|footer|ul|ol|table|blockquote|pre)$/i;
const BOLD_STYLE = /font-weight\s*:\s*(?:bold|semi-?bold|[6-9]00)/i;

/**
 * The HTML form of the clipboard, as lines.
 *
 * This form is worth reading before the plain text form, because it keeps two things
 * that plain text loses: where one block of text ends, and which words were bold. A
 * heading in a design tool is usually bold and rarely marked in any other way.
 *
 * The parser is small on purpose. It runs on a clipboard payload of a few kilobytes, in
 * `core`, which has no DOM, and the alternative is to trust a document written by
 * another program with the full power of an HTML parser behind it.
 */
function linesFromHtml(html: string): Line[] {
  // The Figma payload is base64 and holds no words. Remove the elements that carry it,
  // then every remaining comment, before any text is read.
  const body = html
    .replace(/<span[^>]*data-(?:buffer|metadata)=[\s\S]*?<\/span>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '');

  const lines: Line[] = [];
  let runs: { text: string; bold: boolean }[] = [];
  let bullet = false;
  const open: { name: string; bold: boolean }[] = [];

  const endLine = () => {
    const text = runs.map((r) => r.text).join('');
    const bold = runs.some((r) => r.text.trim() && r.bold) && runs.every((r) => !r.text.trim() || r.bold);
    // A text layer holds its own line breaks, thus one element can carry several lines.
    for (const part of normalise(text).split('\n')) {
      lines.push({ text: part.trim(), bullet, bold, gapBefore: false });
    }
    runs = [];
    bullet = false;
  };

  for (const token of body.match(/<[^>]*>|[^<]+/g) ?? []) {
    if (token[0] !== '<') {
      const text = decode(token);
      if (text) runs.push({ text, bold: open.some((el) => el.bold) });
      continue;
    }

    const name = (token.match(/^<\/?\s*([a-z0-9]+)/i)?.[1] ?? '').toLowerCase();
    if (!name) continue;

    if (name === 'br') {
      endLine();
      continue;
    }

    if (token.startsWith('</')) {
      for (let i = open.length - 1; i >= 0; i--) {
        if (open[i].name === name) {
          open.length = i;
          break;
        }
      }
      if (BLOCK_TAG.test(name)) endLine();
      continue;
    }

    if (BLOCK_TAG.test(name)) endLine();
    if (name === 'li') bullet = true;
    if (!token.endsWith('/>')) {
      open.push({ name, bold: name === 'b' || name === 'strong' || BOLD_STYLE.test(token) });
    }
  }
  endLine();

  return markGaps(lines);
}

/** The plain text form of the clipboard, as lines. */
function linesFromText(text: string): Line[] {
  return markGaps(
    normalise(text)
      .split('\n')
      .map((raw) => ({ text: raw.trim(), bullet: false, bold: false, gapBefore: false })),
  );
}

/**
 * Removes the empty lines and records where they were.
 *
 * The gap is data. In a pasted CV it is often the only thing that separates one job from
 * the next, thus it is kept on the line that follows it and the empty line goes.
 */
function markGaps(lines: Line[]): Line[] {
  const out: Line[] = [];
  let gap = false;
  for (const line of lines) {
    if (!line.text) {
      gap = out.length > 0;
      continue;
    }
    // A bullet character at the start is a bullet, whatever the source called the line.
    const bullet = line.bullet || BULLET_RE.test(line.text);
    out.push({
      text: line.text.replace(BULLET_RE, '').trim(),
      bullet,
      bold: line.bold,
      gapBefore: gap,
    });
    gap = false;
  }
  return out;
}

const words = (s: string): number => s.split(/\s+/).filter(Boolean).length;

const dateRe = (): RegExp => new RegExp(dateRangeRegex().source, 'i');

const hasDates = (s: string): boolean => dateRe().test(s);

/** The date range, and the line with the range and its brackets taken out. */
function takeDates(s: string): { dates: string; rest: string } {
  const hit = s.match(dateRe());
  if (!hit) return { dates: '', rest: s };
  const rest = s
    .replace(hit[0], '')
    .replace(/\(\s*\)|\[\s*\]/g, '')
    .replace(/\s*[|•·—–,]\s*$/, '')
    .replace(/^\s*[|•·—–,]\s*/, '')
    .trim();
  return { dates: hit[0].trim(), rest };
}

const isLocation = (s: string): boolean => contactLabel(s) === 'Location';

/**
 * The words that start a section on a CV, without the words that only decorate them.
 *
 * A list and not a set of patterns, because a heading in a design file is written by a
 * person and not by a template: "Work Experience", "EXPERIENCE", "Selected Projects" and
 * "Professional Experience & Projects" are the same heading.
 */
const HEADING_WORDS = new Set(
  `experience employment history background appointments education qualifications academic
   skills competencies expertise proficiencies capabilities strengths toolkit tools software
   summary profile objective about statement overview projects portfolio publications research
   certifications certification licences licenses accreditations credentials registrations
   memberships languages awards honours honors interests hobbies volunteering volunteer
   references achievements activities courses training leadership speaking talks patents
   exhibitions press contact details`
    .split(/\s+/)
    .filter(Boolean),
);

const HEADING_FILLER = new Set(
  `work professional relevant career clinical teaching technical core key selected notable
   additional other personal my and & of in the a`
    .split(/\s+/)
    .filter(Boolean),
);

const bare = (s: string): string => s.replace(/[:•·—–-]+\s*$/, '').trim();

function knownHeading(text: string): boolean {
  const t = bare(text);
  if (!t || words(t) > 5) return false;
  if (Object.values(SECTION_PATTERNS).some((re) => re.test(t))) return true;

  const parts = t.toLowerCase().replace(/[(),.&/]/g, ' ').split(/\s+/).filter(Boolean);
  if (!parts.length) return false;
  return (
    parts.some((w) => HEADING_WORDS.has(w)) &&
    parts.every((w) => HEADING_WORDS.has(w) || HEADING_FILLER.has(w))
  );
}

/**
 * Is this line the start of a section?
 *
 * Two rules only, and both are conservative. A heading that is neither a usual CV
 * heading nor written in capitals is read as ordinary text, and the interface says so.
 * The alternative rule, "a short bold line is a heading", takes the job title of every
 * entry with it, because a job title in a design file is bold as well.
 *
 * The first line of the paste is never a heading. It is the name.
 */
function isHeading(line: Line, index: number): boolean {
  const t = bare(line.text);
  if (!t || line.bullet || index === 0 || t.length > 48 || hasDates(t)) return false;
  if (knownHeading(t)) return true;
  return t === t.toUpperCase() && /[A-Za-z]/.test(t) && words(t) <= 6 && !/[.,;]$/.test(t);
}

/*
 * The separators that a person puts between the parts of one line. A comma is not one of
 * them: "Leeds, United Kingdom" is a single location and splitting it loses the country.
 */
const PIECE_SPLIT = /\s*[|•·●‣]\s*|\s+[—–]\s+/;

const splitPieces = (s: string): string[] => s.split(PIECE_SPLIT).map((p) => p.trim()).filter(Boolean);

/** "Email: a@b.com" written by hand, rather than a bare value. */
const WRITTEN_LABELS: Record<string, string> = {
  email: 'Email',
  'e-mail': 'Email',
  mail: 'Email',
  phone: 'Phone',
  mobile: 'Phone',
  tel: 'Phone',
  telephone: 'Phone',
  location: 'Location',
  address: 'Location',
  based: 'Location',
  linkedin: 'LinkedIn',
  github: 'GitHub',
  portfolio: 'Portfolio',
  website: 'Portfolio',
  site: 'Portfolio',
  web: 'Portfolio',
};

/** One contact detail, from one piece of a contact line. */
function contactField(piece: string): { label: string; value: string } | null {
  const written = piece.match(/^([A-Za-z-]{2,12})\s*[:：]\s*(.+)$/);
  if (written) {
    const label = WRITTEN_LABELS[written[1].toLowerCase()];
    if (label) return { label, value: written[2].trim() };
  }
  const label = contactLabel(piece);
  return label ? { label, value: piece } : null;
}

/**
 * The contact details on one line, or null if the line holds none.
 *
 * A piece with no label of its own still becomes a field when the line around it is a
 * contact line. "he/him" beside an email address is a detail the person wrote on
 * purpose, and dropping it silently is the fault this reader exists to avoid.
 */
function contactLine(text: string): { label: string; value: string }[] | null {
  const pieces = splitPieces(text);
  const fields = pieces.map((piece) => contactField(piece));
  if (!fields.some(Boolean)) return null;
  return pieces.map((piece, i) => fields[i] ?? { label: '', value: piece });
}

const entry = (role = ''): CvEntry => ({
  id: newId('entry'),
  role,
  location: '',
  dates: '',
  summary: '',
  bullets: [],
});

/**
 * The head of an entry, from a line that holds several parts of it.
 *
 * A CV written in one text layer gives "Senior Product Designer, Acme | Leeds | Jan 2023
 * - Present" as one line. A CV written as four layers gives four lines. Both arrive
 * here, thus this reads what is on the line and `entriesFrom` fills the rest.
 */
function headOf(text: string): CvEntry {
  const made = entry();
  const roles: string[] = [];

  for (const piece of splitPieces(text)) {
    const { dates, rest } = takeDates(piece);
    if (dates && !made.dates) made.dates = dates;
    const left = dates ? rest : piece;
    if (!left) continue;
    if (!made.location && isLocation(left)) {
      made.location = left;
      continue;
    }
    roles.push(left);
  }

  // "Senior Product Designer" and "Acme" arrived as two pieces of one line. The document
  // holds the pair in one field, in the form a printed CV uses.
  made.role = roles.length > 1 ? `${roles[0]} at ${roles.slice(1).join(', ')}` : (roles[0] ?? '');
  return made;
}

/**
 * The jobs, degrees or projects in one section.
 *
 * The rule for where an entry ends: an entry that already has items ends at the next
 * line that is not an item. Before the items arrive, a line joins the entry that is open
 * — as its dates, its location, its employer or its opening sentence — because a design
 * file puts each of those on a layer of its own.
 */
function entriesFrom(lines: Line[]): CvEntry[] {
  const out: CvEntry[] = [];
  let open: CvEntry | null = null;

  const start = (text: string): CvEntry => {
    const made = headOf(text);
    out.push(made);
    return made;
  };

  for (const line of lines) {
    if (line.bullet) {
      open = open ?? start('');
      open.bullets.push(line.text);
      continue;
    }

    const text = line.text;
    if (!open || open.bullets.length) {
      open = start(text);
      continue;
    }

    if (!open.dates && hasDates(text)) {
      const { dates, rest } = takeDates(text);
      open.dates = dates;
      if (rest && !open.location && isLocation(rest)) open.location = rest;
      else if (rest && !open.role) open.role = rest;
      else if (rest && !open.summary && words(rest) >= 4) open.summary = rest;
      continue;
    }

    if (!open.location && isLocation(text)) {
      open.location = text;
      continue;
    }

    // The employer, on its own layer, under the job title. Short, no sentence, and the
    // entry has not reached its dates yet.
    if (!open.dates && !open.summary && open.role && !/ at /i.test(open.role) && words(text) <= 6) {
      open.role = `${open.role} at ${text}`;
      continue;
    }

    /*
     * The place, written as a place and not as "City, Country": "Remote", "Leeds",
     * "London (Hybrid)". The line is short, the entry already has a job title, and its
     * dates have not arrived, thus there is one field of the head left for it.
     *
     * The gap is what stops this rule from eating the next job. Two jobs with no dates
     * and no items are separated by nothing except the empty line between them, and
     * without this test the job title of the second one became the place of the first.
     */
    if (
      !open.location &&
      !open.dates &&
      !open.summary &&
      open.role &&
      !line.gapBefore &&
      words(text) <= 4 &&
      !/[.!?]$/.test(text)
    ) {
      open.location = text;
      continue;
    }

    if (!open.summary && words(text) >= 6) {
      open.summary = text;
      continue;
    }

    // No field of the open entry is left for this line, thus it starts the next one.
    open = start(text);
  }

  return out;
}

const ROW_RE = /^([^:：]{2,40})[:：]\s*(.+)$/;

const rowsFrom = (lines: Line[]): CvRow[] =>
  lines.map((line) => {
    const hit = line.text.match(ROW_RE);
    return hit && words(hit[1]) <= 5
      ? { id: newId('row'), label: hit[1].trim(), value: hit[2].trim() }
      : { id: newId('row'), label: '', value: line.text };
  });

/**
 * Which of the three shapes this block of lines has.
 *
 * The shape decides what the export writes and what the scorer reads, thus a wrong
 * answer here costs points. The order of the tests is the order of certainty. The
 * heading answers first where it can: a section called Experience holds jobs. After
 * that, a date range or an item is proof of a history section; a colon on most lines is
 * proof of a skills section; and short lines with no full stop are a list of things
 * rather than a paragraph, thus keeping them as a list keeps one thing on each line.
 */
function shapeOf(heading: string, lines: Line[]): SectionKind {
  const title = bare(heading);
  const bullets = lines.filter((l) => l.bullet).length;
  if (SECTION_PATTERNS.summary.test(title)) return 'text';
  // The heading itself is proof for these three. A section called Experience holds jobs,
  // whatever the lines under it look like, and a job with no dates is still a job.
  if (
    SECTION_PATTERNS.experience.test(title) ||
    SECTION_PATTERNS.education.test(title) ||
    SECTION_PATTERNS.projects.test(title)
  ) {
    return 'entries';
  }
  if (lines.some((l) => !l.bullet && hasDates(l.text))) return 'entries';
  if (bullets && bullets < lines.length) return 'entries';
  if (bullets) return 'text';

  const labelled = lines.filter((l) => {
    const hit = l.text.match(ROW_RE);
    return hit ? words(hit[1]) <= 5 : false;
  }).length;
  if (lines.length >= 2 && labelled * 2 >= lines.length) return 'rows';
  if (SECTION_PATTERNS.skills.test(title)) return 'rows';
  if (lines.length >= 2 && lines.every((l) => l.text.length <= 80 && !/[.!?]$/.test(l.text))) {
    return 'rows';
  }
  return 'text';
}

function sectionFrom(heading: string, lines: Line[]): CvSection {
  const kind = shapeOf(heading, lines);
  return {
    id: newId('section'),
    heading: tidyHeading(heading),
    kind,
    // A paragraph arrives as several lines when the person wrote it in several layers.
    // The scorer reads one space between them, thus the join is what the scorer sees.
    body: kind === 'text' ? lines.map((l) => l.text).join(' ').trim() : '',
    rows: kind === 'rows' ? rowsFrom(lines) : [],
    entries: kind === 'entries' ? entriesFrom(lines) : [],
  };
}

/**
 * A heading in capitals becomes a heading in words.
 *
 * `renderCvText` puts every heading in capitals for the scorer. The sheet shows what you
 * typed. "PROFESSIONAL EXPERIENCE" shouted on the page and nothing was gained by it.
 */
function tidyHeading(heading: string): string {
  const t = bare(heading);
  if (t !== t.toUpperCase()) return t;
  return t
    .toLowerCase()
    .replace(/(^|\s|\/|\()([a-z])/g, (_, before: string, letter: string) => before + letter.toUpperCase());
}

/**
 * Reads a pasted CV.
 *
 * It never throws and it never drops a line. Text that no rule can place goes into a
 * section of its own with a note that says where it came from, because a CV with one
 * paragraph in the wrong place can be repaired in the editor, and a CV with a paragraph
 * missing cannot: nobody knows it is gone.
 */
export function parsePastedCv(clipboard: PastedClipboard): ImportResult {
  const evidence = figmaEvidence(clipboard.html);
  const notes: string[] = [];

  const fromText = linesFromText(clipboard.text ?? '');
  const fromHtml = clipboard.html ? linesFromHtml(clipboard.html) : [];
  const size = (lines: Line[]) => lines.reduce((n, l) => n + l.text.replace(/\s/g, '').length, 0);
  // The HTML form knows about bold text and about where a block ends, thus it is the
  // better source. It is not always the fuller one: some programs write a summary of the
  // content there. Take it only when it holds what the plain text holds.
  const lines = size(fromHtml) >= size(fromText) * 0.9 && fromHtml.length ? fromHtml : fromText;

  const doc: CvDoc = { name: '', headline: '', contact: [], sections: [] };
  if (!lines.length) {
    notes.push('There was no text in what you pasted.');
    return { doc, fromFigma: evidence.length > 0, evidence, notes, lineCount: 0 };
  }

  // Split the lines into the block before the first heading and one block for each
  // heading after it.
  const head: Line[] = [];
  const blocks: { heading: string; lines: Line[] }[] = [];
  for (const [i, line] of lines.entries()) {
    if (isHeading(line, i)) blocks.push({ heading: line.text, lines: [] });
    else if (blocks.length) blocks[blocks.length - 1].lines.push(line);
    else head.push(line);
  }

  // The name, the job title and the contact details, from the block above the first
  // heading. The first line is the name: on every CV ever written, it is.
  const spare: Line[] = [];
  for (const [i, line] of head.entries()) {
    if (i === 0) {
      doc.name = line.text;
      continue;
    }
    const contact = contactLine(line.text);
    if (contact) {
      doc.contact.push(...contact.map((c) => ({ id: newId('c'), ...c })));
      continue;
    }
    if (!doc.headline && words(line.text) <= 10 && !line.bullet) {
      doc.headline = line.text;
      continue;
    }
    spare.push(line);
  }

  for (const block of blocks) doc.sections.push(sectionFrom(block.heading, block.lines));

  // Text above the first heading that is not the name, the title or a contact detail is
  // almost always the opening paragraph, which people write with no heading over it.
  if (spare.length) {
    doc.sections.unshift(sectionFrom('Summary', spare));
    notes.push(
      spare.length === 1
        ? 'One line sat above the first heading with nothing to say what it was. It is in a section called Summary.'
        : `${spare.length} lines sat above the first heading with nothing to say what they were. They are in a section called Summary.`,
    );
  }

  if (!blocks.length && !spare.length && head.length > 2) {
    // Everything was read as a name, a title and contact details, and no heading arrived.
    notes.push('No section heading was found. Only the header of the CV was read.');
  }

  if (!doc.contact.length) {
    notes.push('No contact detail was found. Add your email address and your telephone number.');
  }

  const entries = doc.sections.flatMap((s) => s.entries);
  const undated = entries.filter((e) => !e.dates.trim()).length;
  if (undated) {
    notes.push(
      `${undated === 1 ? 'One entry has' : `${undated} entries have`} no dates. A program reads dates to` +
        ' calculate your years of experience, and it counts a missing date as zero.',
    );
  }

  if (!doc.sections.length) {
    notes.push('No section was found. Paste the whole CV, or write the sections in the editor.');
  }

  if (evidence.length) {
    notes.push(
      'Figma copies layers in the order they were made, not in the order you see on the frame.' +
        ' Check that the sections and the jobs are in the order you want.',
    );
  }

  return { doc, fromFigma: evidence.length > 0, evidence, notes, lineCount: lines.length };
}
