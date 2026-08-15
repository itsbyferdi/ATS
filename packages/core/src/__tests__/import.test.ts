import { describe, expect, it } from 'vitest';

import { BULLET_RE, figmaEvidence, parsePastedCv, renderCvText, repairIds, scoreResume } from '../index.js';

/**
 * A CV laid out in Figma, copied to the clipboard.
 *
 * Each line was a text layer. That is why the job title, the employer, the place and the
 * dates arrive on four lines with nothing to join them: on the frame they are four boxes
 * beside each other, and the clipboard keeps none of that arrangement.
 */
const FIGMA_TEXT = `Ferdi Hafidh
Senior Product Designer
ferdi@example.com | +62 812 3456 7890 | Jakarta, Indonesia | linkedin.com/in/hafidhferdi

SUMMARY
Product designer with eight years in travel software. I work from the research to the design system, and I ship with the engineers.

CORE SKILLS
Design: Design systems, Prototyping, Interaction design
Research: Usability testing, Interviews, Surveys
Tools: Figma, Framer, Notion

PROFESSIONAL EXPERIENCE
Senior Product Designer
Wego (WegoPro)
Jakarta, Indonesia
January 2023 - Present
Own the design of the corporate travel product.
• Led end to end design for a B2B travel platform and cut drop-off by 24 percent.
• Built the design system in Figma and in the codebase.

Product Designer
Meridian
Remote
May 2021 - December 2022
• Shipped the monitoring tools and raised operator output by 1.5 times.

EDUCATION
Bachelor of Design, Visual Communication
Institut Teknologi Bandung
2013 - 2017`;

/**
 * The HTML form of that clipboard.
 *
 * Figma writes two empty elements before the words. They hold the file header and the
 * scene itself, in base64, inside an HTML comment. They are the proof that the paste came
 * from Figma, and none of it may reach the document.
 */
const FIGMA_HTML = `<meta charset="utf-8"><span data-metadata="<!--(figmeta)eyJmaWxlS2V5IjoiWjNhIiwicGFzdGVJRCI6MTIzfQ==(/figmeta)-->"></span><span data-buffer="<!--(figma)ZmlnLWtpd2kAAAAAAAAAQUJD(/figma)-->"></span><span style="white-space:pre-wrap;font-size:24px;font-weight:700">Ferdi Hafidh</span><br><span style="white-space:pre-wrap">Senior Product Designer</span><br><span style="white-space:pre-wrap">ferdi@example.com&nbsp;| +62 812 3456 7890 | Jakarta, Indonesia</span><br><br><span style="white-space:pre-wrap;font-weight:600">Work Experience</span><br><span style="white-space:pre-wrap">Senior Product Designer</span><br><span style="white-space:pre-wrap">Wego (WegoPro)</span><br><span style="white-space:pre-wrap">January&nbsp;2023 – Present</span><br><ul><li>Led end to end design for a B2B travel platform.</li><li>Built the design system in Figma &amp; in the codebase.</li></ul>`;

/** The plain text of that same copy, which the clipboard carries beside the HTML. */
const FIGMA_HTML_TEXT = `Ferdi Hafidh
Senior Product Designer
ferdi@example.com | +62 812 3456 7890 | Jakarta, Indonesia

Work Experience
Senior Product Designer
Wego (WegoPro)
January 2023 – Present
Led end to end design for a B2B travel platform.
Built the design system in Figma & in the codebase.`;

const parse = (text: string, html?: string) => parsePastedCv({ text, html });

describe('what came from Figma', () => {
  it('finds the payload that Figma writes beside the words', () => {
    const result = parse(FIGMA_TEXT, FIGMA_HTML);
    expect(result.fromFigma).toBe(true);
    expect(result.evidence.length).toBeGreaterThanOrEqual(2);
  });

  it('does not call a paste from a text editor a paste from Figma', () => {
    expect(parse(FIGMA_TEXT).fromFigma).toBe(false);
    expect(parse('Some text', '<p>Some text</p>').fromFigma).toBe(false);
    expect(figmaEvidence(undefined)).toEqual([]);
  });

  it('says that Figma copies layers in the order they were made', () => {
    expect(parse(FIGMA_TEXT, FIGMA_HTML).notes.join(' ')).toContain('order');
  });

  it('keeps none of the base64 payload', () => {
    const text = renderCvText(parse(FIGMA_TEXT, FIGMA_HTML).doc);
    expect(text).not.toContain('figma');
    expect(text).not.toContain('ZmlnLWtpd2k');
    expect(text).not.toContain('eyJmaWxlS2V5');
  });
});

describe('the header of the CV', () => {
  const { doc } = parse(FIGMA_TEXT);

  it('reads the name and the job title', () => {
    expect(doc.name).toBe('Ferdi Hafidh');
    expect(doc.headline).toBe('Senior Product Designer');
  });

  it('labels each contact detail', () => {
    expect(doc.contact.map((c) => c.label)).toEqual(['Email', 'Phone', 'Location', 'LinkedIn']);
    expect(doc.contact[0].value).toBe('ferdi@example.com');
    expect(doc.contact[2].value).toBe('Jakarta, Indonesia');
  });
});

describe('the sections', () => {
  const { doc } = parse(FIGMA_TEXT);
  const section = (heading: string) => doc.sections.find((s) => s.heading === heading)!;

  it('writes a heading in capitals back as words', () => {
    expect(doc.sections.map((s) => s.heading)).toEqual([
      'Summary',
      'Core Skills',
      'Professional Experience',
      'Education',
    ]);
  });

  it('gives a paragraph section a paragraph', () => {
    expect(section('Summary').kind).toBe('text');
    expect(section('Summary').body).toContain('eight years in travel software');
  });

  it('gives a skills section one row for each group', () => {
    const skills = section('Core Skills');
    expect(skills.kind).toBe('rows');
    expect(skills.rows.map((r) => r.label)).toEqual(['Design', 'Research', 'Tools']);
    expect(skills.rows[2].value).toBe('Figma, Framer, Notion');
  });

  it('joins the layers of one job into one entry', () => {
    const jobs = section('Professional Experience');
    expect(jobs.kind).toBe('entries');
    expect(jobs.entries).toHaveLength(2);

    const [first, second] = jobs.entries;
    expect(first.role).toBe('Senior Product Designer at Wego (WegoPro)');
    expect(first.location).toBe('Jakarta, Indonesia');
    expect(first.dates).toBe('January 2023 - Present');
    expect(first.summary).toBe('Own the design of the corporate travel product.');
    expect(first.bullets).toHaveLength(2);
    expect(first.bullets[0]).toMatch(/^Led end to end design/);

    expect(second.role).toBe('Product Designer at Meridian');
    expect(second.dates).toBe('May 2021 - December 2022');
    expect(second.bullets).toHaveLength(1);
  });

  it('reads a degree as an entry', () => {
    const education = section('Education');
    expect(education.kind).toBe('entries');
    expect(education.entries[0].role).toBe('Bachelor of Design, Visual Communication at Institut Teknologi Bandung');
    expect(education.entries[0].dates).toBe('2013 - 2017');
  });
});

describe('a job on one line', () => {
  it('splits the parts a person wrote beside each other', () => {
    const { doc } = parse(`Alex Rivera
alex@example.com

EXPERIENCE
Senior Product Designer, Acme | Leeds, United Kingdom | October 2023 - Present
• Led the design of the booking product and cut drop-off by 24 percent.`);

    const [job] = doc.sections.find((s) => s.kind === 'entries')!.entries;
    // The comma stays as the person wrote it. A comma inside one piece separates a
    // degree from its subject as often as it separates a job from its employer, thus
    // the reader does not decide which one it is.
    expect(job.role).toBe('Senior Product Designer, Acme');
    expect(job.location).toBe('Leeds, United Kingdom');
    expect(job.dates).toBe('October 2023 - Present');
    expect(job.bullets).toHaveLength(1);
  });

  it('starts the next entry at the empty line, when there are no dates to say so', () => {
    const { doc } = parse(`Alex Rivera
alex@example.com

EXPERIENCE
Product Designer
Acme

Junior Designer
Beta Studio`);

    const jobs = doc.sections.find((s) => s.kind === 'entries')!.entries;
    expect(jobs.map((e) => e.role)).toEqual(['Product Designer at Acme', 'Junior Designer at Beta Studio']);
    expect(jobs[0].location).toBe('');
  });

  it('takes the dates out of the brackets after a job title', () => {
    const { doc } = parse(`Alex Rivera
alex@example.com

EXPERIENCE
Product Designer at Acme (March 2019 - April 2021)
• Ran the research that shaped the roadmap.`);

    const [job] = doc.sections.find((s) => s.kind === 'entries')!.entries;
    expect(job.role).toBe('Product Designer at Acme');
    expect(job.dates).toBe('March 2019 - April 2021');
  });
});

describe('the HTML form of the clipboard', () => {
  const { doc } = parse(FIGMA_HTML_TEXT, FIGMA_HTML);

  it('reads the list items as items', () => {
    const jobs = doc.sections.find((s) => s.kind === 'entries')!;
    expect(jobs.entries[0].bullets).toEqual([
      'Led end to end design for a B2B travel platform.',
      'Built the design system in Figma & in the codebase.',
    ]);
  });

  it('reads a heading that is not in capitals', () => {
    expect(doc.sections.map((s) => s.heading)).toContain('Work Experience');
  });

  it('replaces the no-break space, so the dates can be found', () => {
    const jobs = doc.sections.find((s) => s.kind === 'entries')!;
    expect(jobs.entries[0].dates).toBe('January 2023 – Present');
    expect(doc.contact.map((c) => c.label)).toContain('Email');
  });
});

describe('nothing is lost', () => {
  /**
   * The one guarantee this reader owes a person. A CV with a paragraph in the wrong
   * section can be repaired in the editor. A CV with a paragraph missing cannot, because
   * nobody knows that it has gone.
   */
  it('keeps every line of the paste somewhere in the document', () => {
    const flat = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
    const rendered = flat(renderCvText(parse(FIGMA_TEXT).doc));

    for (const line of FIGMA_TEXT.split('\n')) {
      const content = line.replace(BULLET_RE, '').trim();
      if (!content) continue;
      for (const piece of content.split(/\s*\|\s*/)) {
        expect(rendered, piece).toContain(flat(piece));
      }
    }
  });

  it('keeps text that sits above the first heading, and says where it went', () => {
    const result = parse(`Alex Rivera
alex@example.com
I design booking products for people who travel for work, from the research to the handoff.

EXPERIENCE
Product Designer at Acme
January 2020 - Present`);

    expect(result.doc.sections[0].heading).toBe('Summary');
    expect(result.doc.sections[0].body).toContain('booking products');
    expect(result.notes.join(' ')).toContain('above the first heading');
  });
});

describe('the notes state the limits', () => {
  it('reports an entry with no dates', () => {
    const result = parse(`Alex Rivera
alex@example.com

EXPERIENCE
Product Designer at Acme
• Ran the research that shaped the roadmap for two years.`);
    expect(result.notes.join(' ')).toContain('no dates');
  });

  it('reports a CV with no contact detail', () => {
    const result = parse(`Alex Rivera
Product Designer

EXPERIENCE
Product Designer at Acme
January 2020 - Present`);
    expect(result.notes.join(' ')).toContain('No contact detail');
  });
});

describe('the document it makes', () => {
  it('gives every part its own id', () => {
    const { doc } = parse(FIGMA_TEXT);
    expect(repairIds(doc)).toBe(doc);
  });

  it('scores as a CV, with no work on the format', () => {
    const report = scoreResume({ text: renderCvText(parse(FIGMA_TEXT).doc) });
    expect(report.hardFailure).toBeUndefined();
    expect(report.score).toBeGreaterThanOrEqual(55);
  });

  it('survives an empty clipboard', () => {
    const result = parse('   \n  \n');
    expect(result.doc.sections).toEqual([]);
    expect(result.notes[0]).toContain('no text');
    expect(() => renderCvText(result.doc)).not.toThrow();
  });

  it('survives a clipboard that holds one word', () => {
    const result = parse('Ferdi');
    expect(result.doc.name).toBe('Ferdi');
    expect(result.lineCount).toBe(1);
  });
});
