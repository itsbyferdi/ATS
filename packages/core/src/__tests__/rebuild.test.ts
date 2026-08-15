import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  parseCv,
  rebuildCv,
  renderMarkdown,
  renderText,
  scoreResume,
  templateById,
  TEMPLATES,
  SAMPLE_JOB_DESCRIPTION,
} from '../index.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => readFileSync(join(here, 'fixtures', name), 'utf8');

const optimised = fixture('optimised-single-column.txt');
const legacy = fixture('legacy-two-column.txt');

describe('parseCv', () => {
  const doc = parseCv(optimised);

  it('reads the name and headline out of the header', () => {
    expect(doc.name).toBe('Alex Rivera Santos');
    expect(doc.headline).toBe('Senior Product Designer');
  });

  it('finds every section', () => {
    const kinds = doc.sections.map((s) => s.kind);
    expect(kinds).toContain('summary');
    expect(kinds).toContain('skills');
    expect(kinds).toContain('experience');
    expect(kinds).toContain('education');
  });

  it('reads every job with its dates', () => {
    const exp = doc.sections.find((s) => s.kind === 'experience')!;
    expect(exp.entries).toHaveLength(5);
    expect(exp.entries.every((e) => e.role && e.dates)).toBe(true);
    expect(exp.entries[0].org).toBe('Vela and VelaPro');
    expect(exp.entries[0].bullets.length).toBeGreaterThan(3);
  });

  /**
   * The meta line here is "Jakarta, Indonesia | [START MONTH YEAR] - May 2021". The date
   * does not parse, and the block was being read as a whole extra job called "Jakarta".
   */
  it('does not mistake an unparseable date line for a new job', () => {
    const exp = doc.sections.find((s) => s.kind === 'experience')!;
    expect(exp.entries.map((e) => e.role)).not.toContain('Jakarta');
    const rr = exp.entries.find((e) => e.org === 'Vertex')!;
    expect(rr.dates).toContain('May 2021');
  });

  it('keeps header text the rebuilt contact line cannot carry', () => {
    expect(doc.contactExtra.join(' ')).toContain('Open to relocation');
  });
});

describe('rebuildCv', () => {
  it('does not lower the score of a CV that already parses', () => {
    const before = scoreResume({ text: optimised, jobDescription: SAMPLE_JOB_DESCRIPTION }).score;
    for (const t of TEMPLATES) {
      const { text, usable } = rebuildCv(optimised, t);
      expect(usable, t.id).toBe(true);
      const after = scoreResume({ text, jobDescription: SAMPLE_JOB_DESCRIPTION }).score;
      expect(after, t.id).toBeGreaterThanOrEqual(before);
    }
  });

  /**
   * The important one. On a CV whose text layer is broken the parser cannot find
   * headings, and it used to refuse outright — which left the user with a lecture and
   * nothing else, having lost 371 of their 457 words along the way.
   *
   * It now anchors on the dates instead, warns clearly, and keeps every word.
   */
  describe('a CV whose headings did not survive extraction', () => {
    const r = rebuildCv(legacy, TEMPLATES[0]);

    it('is offered rather than refused, with a warning', () => {
      expect(r.quality).toBe('partial');
      expect(r.usable).toBe(true);
      expect(r.problems.join(' ')).toMatch(/worked out from the dates/i);
    });

    it('recovers the job history from the dates', () => {
      expect(r.doc.salvaged).toBe(true);
      const exp = r.doc.sections.find((s) => s.kind === 'experience')!;
      expect(exp.entries.length).toBeGreaterThanOrEqual(4);
      expect(exp.entries.every((e) => e.dates)).toBe(true);
    });

    it('keeps the content — the old version lost most of it', () => {
      const words = (t: string) => t.split(/\s+/).filter(Boolean).length;
      expect(r.wordsLost).toBeLessThan(80);
      expect(words(r.text)).toBeGreaterThan(words(legacy) * 0.9);
    });

    it('does not write the same content out twice', () => {
      const words = (t: string) => t.split(/\s+/).filter(Boolean).length;
      expect(words(r.text)).toBeLessThan(words(legacy) * 1.15);
    });

    it('does not invent duplicate jobs for one date range', () => {
      const exp = r.doc.sections.find((s) => s.kind === 'experience')!;
      const dates = exp.entries.map((e) => e.dates);
      expect(new Set(dates).size).toBe(dates.length);
    });
  });

  it('still refuses when there is essentially no text', () => {
    const r = rebuildCv('Jane\n\nsome words\n', TEMPLATES[0]);
    expect(r.quality).toBe('unusable');
    expect(r.usable).toBe(false);
  });

  it('judges usability from the parse, not from what a template leaves out', () => {
    // Compact drops the summary by design; that must not read as lost content.
    const all = TEMPLATES.map((t) => rebuildCv(optimised, t));
    expect(new Set(all.map((r) => r.wordsLost)).size).toBe(1);
    expect(all.every((r) => r.usable)).toBe(true);
  });
});

describe('templates', () => {
  const doc = parseCv(optimised);

  it('writes headings a parser looks for', () => {
    const text = renderText(doc, templateById('classic'));
    expect(text).toMatch(/^PROFESSIONAL EXPERIENCE$/m);
    expect(text).toMatch(/^EDUCATION$/m);
  });

  it('orders sections differently per template', () => {
    const classic = renderText(doc, templateById('classic'));
    const skillsFirst = renderText(doc, templateById('skills-first'));
    expect(classic.indexOf('SKILLS')).toBeGreaterThan(classic.indexOf('PROFESSIONAL EXPERIENCE'));
    expect(skillsFirst.indexOf('SKILLS')).toBeLessThan(skillsFirst.indexOf('PROFESSIONAL EXPERIENCE'));
  });

  it('leaves the summary out of Compact and keeps it in Classic', () => {
    expect(renderText(doc, templateById('compact'))).not.toContain('PROFESSIONAL SUMMARY');
    expect(renderText(doc, templateById('classic'))).toContain('PROFESSIONAL SUMMARY');
  });

  it('keeps every job in every template', () => {
    for (const t of TEMPLATES) {
      const text = renderText(doc, t);
      for (const org of ['Vela and VelaPro', 'Meridian Logistics', 'Lumen', 'Vertex', 'Independent']) {
        expect(text, `${t.id} lost ${org}`).toContain(org);
      }
    }
  });

  it('renders markdown headings without breaking the plain-text version', () => {
    const md = renderMarkdown(doc, templateById('classic'));
    expect(md).toContain('## PROFESSIONAL EXPERIENCE');
    // The scored form stays bare, because that is what an ATS actually reads.
    expect(renderText(doc, templateById('classic'))).not.toContain('## ');
  });
});
