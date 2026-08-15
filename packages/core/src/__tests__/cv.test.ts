import { describe, expect, it, vi } from 'vitest';

import {
  emptyEntry,
  emptyRow,
  emptySection,
  newId,
  renderCvHtml,
  renderCvMarkdown,
  renderCvText,
  repairIds,
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

  /*
   * The test above passes for an id that counts up, and a counting id was still wrong.
   * A document is written to the local store and read back on the next visit, but the
   * counter restarts at zero when the page loads. The next part added then took an id
   * that the document already held, and because every change finds its target by id, one
   * edit changed two parts. The tests below are the ones that fail on a counter.
   */
  it('does not repeat an id across many parts', () => {
    const ids = Array.from({ length: 5000 }, () => newId('c'));
    expect(new Set(ids).size).toBe(ids.length);
  });

  /*
   * The real failure crossed a page load, so the test has to cross one. Resetting the
   * module registry and importing again gives the module the fresh start that a reload
   * gives it, while the document from the first session is still in hand. An id built
   * from a counter reissues that document's ids here; a random one does not.
   */
  it('does not reissue the ids of a document made before the page reloaded', async () => {
    const idsOf = (doc: CvDoc) => [
      ...doc.contact.map((c) => c.id),
      ...doc.sections.flatMap((s) => [s.id, ...s.rows.map((r) => r.id), ...s.entries.map((e) => e.id)]),
    ];

    // The first visit. A new document is made and written to the local store.
    vi.resetModules();
    const first = await import('../cv.js');
    const saved = idsOf(first.starterDoc());

    // The second visit. The module starts again from nothing, the document does not.
    vi.resetModules();
    const second = await import('../cv.js');
    const afterReload = [
      ...idsOf(second.starterDoc()),
      second.newId('c'),
      second.emptyRow().id,
      second.emptyEntry().id,
    ];

    expect(afterReload.filter((id) => saved.includes(id))).toEqual([]);
  });
});

describe('repairing a document that already holds a repeated id', () => {
  const damaged = (): CvDoc => ({
    name: 'A Name',
    headline: 'A Title',
    contact: [
      { id: 'c-1-7919', label: 'Email', value: 'a@example.com' },
      { id: 'c-1-7919', label: 'Phone', value: '+00 000' },
      { id: 'c-2-15838', label: 'Location', value: 'A City' },
    ],
    sections: [
      {
        id: 'section-1-7919',
        heading: 'Core skills',
        kind: 'rows',
        body: '',
        rows: [
          { id: 'row-1-7919', label: 'One', value: 'a, b' },
          { id: 'row-1-7919', label: 'Two', value: 'c, d' },
        ],
        entries: [],
      },
    ],
  });

  it('gives every part its own id', () => {
    const fixed = repairIds(damaged());
    const ids = [
      ...fixed.contact.map((c) => c.id),
      ...fixed.sections.flatMap((s) => [s.id, ...s.rows.map((r) => r.id)]),
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('changes no word of the document', () => {
    expect(renderCvText(repairIds(damaged()))).toBe(renderCvText(damaged()));
  });

  it('leaves the first part of a pair with the id it had', () => {
    const fixed = repairIds(damaged());
    expect(fixed.contact[0].id).toBe('c-1-7919');
    expect(fixed.contact[1].id).not.toBe('c-1-7919');
    expect(fixed.sections[0].rows[0].id).toBe('row-1-7919');
  });

  it('returns a document with no repeated id exactly as it arrived', () => {
    const clean = starterDoc();
    expect(repairIds(clean)).toBe(clean);
  });

  it('starts a rows section with one row and an entries section with one entry', () => {
    expect(emptySection('rows').rows).toHaveLength(1);
    expect(emptySection('entries').entries).toHaveLength(1);
    expect(emptySection('text').body).toBe('');
  });
});
