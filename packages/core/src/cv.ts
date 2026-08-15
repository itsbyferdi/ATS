/**
 * The CV document that the editor writes.
 *
 * A design tool exports a PDF that can lose its text layer, which is the fault that
 * started this project. A CV that you write here cannot have that fault: the document is
 * data, and each export comes from the same data.
 *
 * `renderCvText` gives the plain text form. The scorer reads that text, thus the score
 * applies to the content that an employer gets.
 */

export interface ContactField {
  id: string;
  label: string;
  value: string;
}

/** One job, one degree or one project. */
export interface CvEntry {
  id: string;
  /** "Senior Product Designer at Wego (WegoPro)". */
  role: string;
  /** Sits at the right of the line, as on a printed CV. */
  location: string;
  dates: string;
  /** One paragraph before the list of items. Optional. */
  summary: string;
  bullets: string[];
}

/** One row of a skills block: a label in bold, then the terms. */
export interface CvRow {
  id: string;
  label: string;
  value: string;
}

export type SectionKind = 'text' | 'rows' | 'entries';

export interface CvSection {
  id: string;
  heading: string;
  kind: SectionKind;
  /** `text` sections only. */
  body: string;
  /** `rows` sections only. */
  rows: CvRow[];
  /** `entries` sections only. */
  entries: CvEntry[];
}

export interface CvDoc {
  name: string;
  headline: string;
  contact: ContactField[];
  sections: CvSection[];
}

/**
 * Ids only have to be unique inside one document. They are the React keys, and they keep
 * the caret in place when a list changes above the field you are typing in.
 */
let counter = 0;
export const newId = (prefix = 'id'): string => `${prefix}-${(counter += 1)}-${Math.floor(counter * 7919) % 100000}`;

export const emptyEntry = (): CvEntry => ({
  id: newId('entry'),
  role: '',
  location: '',
  dates: '',
  summary: '',
  bullets: [''],
});

export const emptyRow = (): CvRow => ({ id: newId('row'), label: '', value: '' });

export const emptySection = (kind: SectionKind): CvSection => ({
  id: newId('section'),
  heading: kind === 'entries' ? 'Professional Experience' : kind === 'rows' ? 'Core skills' : 'Summary',
  kind,
  body: '',
  rows: kind === 'rows' ? [emptyRow()] : [],
  entries: kind === 'entries' ? [emptyEntry()] : [],
});

/**
 * The starting document. It shows the shape of each section, thus a new user can replace
 * the words and keep the structure that a program can read.
 */
export function starterDoc(): CvDoc {
  return {
    name: 'Your Name',
    headline: 'Your job title',
    contact: [
      { id: newId('c'), label: 'Email', value: 'you@example.com' },
      { id: newId('c'), label: 'Phone', value: '+00 000 000 000' },
      { id: newId('c'), label: 'Location', value: 'City, Country' },
      { id: newId('c'), label: 'LinkedIn', value: 'linkedin.com/in/your-handle' },
    ],
    sections: [
      {
        id: newId('section'),
        heading: 'Summary',
        kind: 'text',
        body: 'Two or three sentences about the work you do, the fields you know and the results you get. Use the words that the advert uses.',
        rows: [],
        entries: [],
      },
      {
        id: newId('section'),
        heading: 'Core skills',
        kind: 'rows',
        body: '',
        rows: [
          { id: newId('row'), label: 'Group one', value: 'Add the skills that this job asks for, separated by commas' },
          { id: newId('row'), label: 'Tools', value: 'The software that you use every day' },
        ],
        entries: [],
      },
      {
        id: newId('section'),
        heading: 'Professional Experience',
        kind: 'entries',
        body: '',
        rows: [],
        entries: [
          {
            id: newId('entry'),
            role: 'Your job title at Company',
            location: 'City (Remote)',
            dates: 'January 2023 - Present',
            summary: 'One line about the team, the product and your part in it.',
            bullets: [
              'Start each item with a verb. Give the result and a number if you have one.',
              'Use the words of the advert where they are true for your work.',
            ],
          },
        ],
      },
      {
        id: newId('section'),
        heading: 'Education',
        kind: 'entries',
        body: '',
        rows: [],
        entries: [
          {
            id: newId('entry'),
            role: 'Your degree, Subject',
            location: 'City, Country',
            dates: 'September 2015 - July 2019',
            summary: '',
            bullets: [],
          },
        ],
      },
    ],
  };
}

const clean = (s: string) => s.replace(/\s+/g, ' ').trim();

/**
 * The plain text form of the document. This is what the scorer reads and what an
 * employer's software gets. The headings stay bare and on their own line, because that
 * is how a program finds the start of each section.
 */
export function renderCvText(doc: CvDoc): string {
  const out: string[] = [];
  if (clean(doc.name)) out.push(clean(doc.name), '');
  if (clean(doc.headline)) out.push(clean(doc.headline), '');

  const contact = doc.contact
    .filter((c) => clean(c.value))
    .map((c) => clean(c.value))
    .join(' | ');
  if (contact) out.push(contact, '');

  for (const s of doc.sections) {
    const heading = clean(s.heading);
    if (!heading) continue;

    if (s.kind === 'text') {
      if (!clean(s.body)) continue;
      out.push(heading.toUpperCase(), '', clean(s.body), '');
      continue;
    }

    if (s.kind === 'rows') {
      const rows = s.rows.filter((r) => clean(r.label) || clean(r.value));
      if (!rows.length) continue;
      out.push(heading.toUpperCase(), '');
      for (const r of rows) {
        out.push(clean(r.label) ? `${clean(r.label)}: ${clean(r.value)}` : clean(r.value));
      }
      out.push('');
      continue;
    }

    const entries = s.entries.filter((e) => clean(e.role) || e.bullets.some((b) => clean(b)));
    if (!entries.length) continue;
    out.push(heading.toUpperCase(), '');
    for (const e of entries) {
      if (clean(e.role)) out.push(clean(e.role));
      const meta = [clean(e.location), clean(e.dates)].filter(Boolean).join(' | ');
      if (meta) out.push(meta);
      out.push('');
      if (clean(e.summary)) out.push(clean(e.summary), '');
      for (const b of e.bullets) if (clean(b)) out.push(`- ${clean(b)}`);
      if (e.bullets.some((b) => clean(b))) out.push('');
    }
  }

  return `${out.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** The document as HTML, for the print window and for a saved copy. */
export function renderCvHtml(doc: CvDoc): string {
  const out: string[] = [];
  if (clean(doc.name)) out.push(`<h1>${esc(clean(doc.name))}</h1>`);
  if (clean(doc.headline)) out.push(`<p class="cv-headline">${esc(clean(doc.headline))}</p>`);

  const contact = doc.contact.filter((c) => clean(c.value));
  if (contact.length) {
    out.push(
      `<p class="cv-contact">${contact
        .map((c) => (clean(c.label) ? `<span class="cv-label">${esc(clean(c.label))}:</span> ${esc(clean(c.value))}` : esc(clean(c.value))))
        .join('<span class="cv-sep"> </span>')}</p>`,
    );
  }

  for (const s of doc.sections) {
    const heading = clean(s.heading);
    if (!heading) continue;

    if (s.kind === 'text') {
      if (!clean(s.body)) continue;
      out.push(`<h2>${esc(heading)}</h2>`, `<p>${esc(clean(s.body))}</p>`);
      continue;
    }
    if (s.kind === 'rows') {
      const rows = s.rows.filter((r) => clean(r.label) || clean(r.value));
      if (!rows.length) continue;
      out.push(`<h2>${esc(heading)}</h2>`);
      for (const r of rows) {
        out.push(
          `<p>${clean(r.label) ? `<b>${esc(clean(r.label))}:</b> ` : ''}${esc(clean(r.value))}</p>`,
        );
      }
      continue;
    }
    const entries = s.entries.filter((e) => clean(e.role) || e.bullets.some((b) => clean(b)));
    if (!entries.length) continue;
    out.push(`<h2>${esc(heading)}</h2>`);
    for (const e of entries) {
      out.push('<div class="cv-entry">');
      out.push(
        `<p class="cv-entry-head"><b>${esc(clean(e.role))}</b><span class="cv-entry-loc">${esc(clean(e.location))}</span></p>`,
      );
      if (clean(e.dates)) out.push(`<p class="cv-meta">${esc(clean(e.dates))}</p>`);
      if (clean(e.summary)) out.push(`<p>${esc(clean(e.summary))}</p>`);
      const bullets = e.bullets.filter((b) => clean(b));
      if (bullets.length) {
        out.push('<ul>');
        for (const b of bullets) out.push(`<li>${esc(clean(b))}</li>`);
        out.push('</ul>');
      }
      out.push('</div>');
    }
  }
  return out.join('\n');
}

/** The document as Markdown, to keep a copy in a repository. */
export function renderCvMarkdown(doc: CvDoc): string {
  const out: string[] = [];
  if (clean(doc.name)) out.push(`# ${clean(doc.name)}`, '');
  if (clean(doc.headline)) out.push(`**${clean(doc.headline)}**`, '');
  const contact = doc.contact.filter((c) => clean(c.value)).map((c) => clean(c.value));
  if (contact.length) out.push(contact.join(' | '), '');

  for (const s of doc.sections) {
    const heading = clean(s.heading);
    if (!heading) continue;
    if (s.kind === 'text') {
      if (!clean(s.body)) continue;
      out.push(`## ${heading}`, '', clean(s.body), '');
      continue;
    }
    if (s.kind === 'rows') {
      const rows = s.rows.filter((r) => clean(r.label) || clean(r.value));
      if (!rows.length) continue;
      out.push(`## ${heading}`, '');
      for (const r of rows) out.push(`**${clean(r.label)}:** ${clean(r.value)}`, '');
      continue;
    }
    const entries = s.entries.filter((e) => clean(e.role) || e.bullets.some((b) => clean(b)));
    if (!entries.length) continue;
    out.push(`## ${heading}`, '');
    for (const e of entries) {
      out.push(`### ${clean(e.role)}`);
      const meta = [clean(e.location), clean(e.dates)].filter(Boolean).join(' | ');
      if (meta) out.push(`*${meta}*`);
      out.push('');
      if (clean(e.summary)) out.push(clean(e.summary), '');
      for (const b of e.bullets) if (clean(b)) out.push(`- ${clean(b)}`);
      out.push('');
    }
  }
  return `${out.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`;
}
