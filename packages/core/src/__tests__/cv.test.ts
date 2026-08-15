import { describe, expect, it } from 'vitest';

import {
  emptyEntry,
  emptyRow,
  emptySection,
  renderCvHtml,
  renderCvMarkdown,
  renderCvText,
  scoreResume,
  starterDoc,
  type CvDoc,
} from '../index.js';

/** A complete document, of the shape a finished CV has. */
function filled(): CvDoc {
  const doc = starterDoc();
  doc.name = 'Alex Rivera';
  doc.headline = 'Senior Product Designer';
  doc.contact = [
    { id: 'c1', label: 'Email', value: 'alex@example.com' },
    { id: 'c2', label: 'Phone', value: '+44 7700 900123' },
    { id: 'c3', label: 'Location', value: 'Leeds, United Kingdom' },
    { id: 'c4', label: 'LinkedIn', value: 'linkedin.com/in/alexrivera' },
  ];
  const exp = doc.sections.find((s) => s.heading === 'Professional Experience')!;
  exp.entries = [
    {
      id: 'e1',
      role: 'Senior Product Designer at Acme',
      location: 'Leeds (Remote)',
      dates: 'October 2023 - Present',
      summary: 'Own the design of the booking product.',
      bullets: [
        'Led end to end design for a B2B travel platform and cut drop-off by 24 percent.',
        'Built the design system in Figma and in the codebase.',
      ],
    },
    {
      id: 'e2',
      role: 'Product Designer at Meridian',
      location: 'Leeds',
      dates: 'May 2021 - September 2023',
      summary: '',
      bullets: ['Shipped the monitoring tools and raised operator output by 1.5 times.'],
    },
    {
      id: 'e3',
      role: 'Product Designer at Lumen',
      location: 'Remote',
      dates: 'January 2019 - April 2021',
      summary: '',
      bullets: ['Ran the research that shaped the roadmap for two years.'],
    },
  ];
  return doc;
}

describe('renderCvText', () => {
  const text = renderCvText(filled());

  it('puts each heading on its own line, in capitals', () => {
    expect(text).toMatch(/^SUMMARY$/m);
    expect(text).toMatch(/^CORE SKILLS$/m);
    expect(text).toMatch(/^PROFESSIONAL EXPERIENCE$/m);
    expect(text).toMatch(/^EDUCATION$/m);
  });

  it('writes the contact line as usual text', () => {
    expect(text).toContain('alex@example.com | +44 7700 900123 | Leeds, United Kingdom');
  });

  it('marks each item so the impact checks can find it', () => {
    expect(text).toMatch(/^- Led end to end design/m);
  });

  it('leaves out a section that has no content', () => {
    const doc = starterDoc();
    doc.sections = [{ ...emptySection('text'), heading: 'Summary', body: '' }];
    expect(renderCvText(doc)).not.toContain('SUMMARY');
  });

  it('leaves out a contact field with no value', () => {
    const doc = filled();
    doc.contact = [{ id: 'c1', label: 'Email', value: '' }, ...doc.contact.slice(1)];
    expect(renderCvText(doc)).not.toContain('Email');
  });
});

describe('the document scores as a CV', () => {
  /**
   * The point of the editor: a document written here cannot have the faults that a
   * design tool export has. It must reach a high score without any correction.
   */
  it('gives a strong score with no work on the format', () => {
    const report = scoreResume({ text: renderCvText(filled()) });
    expect(report.hardFailure).toBeUndefined();
    expect(report.score).toBeGreaterThanOrEqual(70);
  });

  it('finds every contact field', () => {
    const { fields } = scoreResume({ text: renderCvText(filled()) });
    expect(fields.email).toBe('alex@example.com');
    expect(fields.location).toBe('Leeds, United Kingdom');
    expect(fields.linkedin).toContain('linkedin.com/in/alexrivera');
    expect(fields.dateRanges.length).toBeGreaterThanOrEqual(2);
  });

  it('passes the checks that a broken file fails', () => {
    const report = scoreResume({ text: renderCvText(filled()) });
    for (const id of ['A1', 'C1', 'C2']) {
      expect(report.checks.find((c) => c.id === id)?.status, id).toBe('pass');
    }
  });
});

describe('the other formats', () => {
  const doc = filled();

  it('writes markdown with headings and items', () => {
    const md = renderCvMarkdown(doc);
    expect(md).toContain('# Alex Rivera');
    expect(md).toContain('## Professional Experience');
    expect(md).toMatch(/^- Led end to end design/m);
  });

  it('writes html and escapes the text', () => {
    const risky = filled();
    risky.name = '<script>alert(1)</script>';
    const html = renderCvHtml(risky);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('keeps the same words in every format', () => {
    const needle = 'cut drop-off by 24 percent';
    expect(renderCvText(doc)).toContain(needle);
    expect(renderCvMarkdown(doc)).toContain(needle);
    expect(renderCvHtml(doc)).toContain(needle);
  });
});

describe('new parts', () => {
  it('gives each new part its own id', () => {
    const ids = [emptyEntry().id, emptyEntry().id, emptyRow().id, emptySection('rows').id];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('starts a rows section with one row and an entries section with one entry', () => {
    expect(emptySection('rows').rows).toHaveLength(1);
    expect(emptySection('entries').entries).toHaveLength(1);
    expect(emptySection('text').body).toBe('');
  });
});
