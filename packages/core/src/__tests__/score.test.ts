import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { detectSplitWords, extractFields, extractJobKeywords, jobTitleFrom, scoreResume, SAMPLE_JOB_DESCRIPTION } from '../index.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => readFileSync(join(here, 'fixtures', name), 'utf8');

/**
 * Both fixtures are the same career. One is text pulled out of a two-column PDF
 * exported from a design tool; the other is the single-column rebuild. The gap
 * between their scores is the thing this project exists to measure.
 */
const legacy = fixture('legacy-two-column.txt');
const optimised = fixture('optimised-single-column.txt');

const check = (report: ReturnType<typeof scoreResume>, id: string) => {
  const c = report.checks.find((x) => x.id === id);
  if (!c) throw new Error(`no check ${id}`);
  return c;
};

describe('scoreResume: the new CV must get a better score than the original', () => {
  const before = scoreResume({ text: legacy, jobDescription: SAMPLE_JOB_DESCRIPTION });
  const after = scoreResume({ text: optimised, jobDescription: SAMPLE_JOB_DESCRIPTION });

  it('scores the legacy two-column export as high risk', () => {
    expect(before.score).toBeLessThan(55);
    expect(before.band.key).not.toBe('strong');
  });

  it('scores the single-column rebuild as strong', () => {
    expect(after.score).toBeGreaterThanOrEqual(85);
    expect(after.band.key).toBe('strong');
  });

  it('improves every category', () => {
    for (const cat of after.categories) {
      const prior = before.categories.find((c) => c.name === cat.name)!;
      expect(cat.score, cat.name).toBeGreaterThanOrEqual(prior.score);
    }
  });

  it('awards a score out of 100 that matches the point total', () => {
    expect(after.max).toBe(100);
    expect(after.score).toBe(Math.round((after.points / after.max) * 100));
  });
});

describe('parse safety', () => {
  it('catches words split by the design-tool export', () => {
    const split = detectSplitWords(legacy);
    expect(split.count).toBeGreaterThan(0);
    expect(split.probes).toContain('skills');
  });

  it('reports a clean text layer for the rebuild', () => {
    expect(detectSplitWords(optimised).count).toBe(0);
  });

  it('does not fire on placeholder variables such as "cut X steps to Y"', () => {
    const text = 'Cut the booking flow from X steps to Y. Reduced drop-off by X%.';
    expect(detectSplitWords(text).count).toBe(0);
  });

  it('flags the multi-column reading order in the legacy file', () => {
    const report = scoreResume({ text: legacy });
    expect(check(report, 'A2').status).toBe('fail');
  });
});

describe('field extraction', () => {
  it('finds nothing in a resume whose contact details are link labels', () => {
    const f = extractFields(legacy);
    expect(f.email).toBeNull();
    expect(f.phone).toBeNull();
    expect(f.location).toBeNull();
  });

  it('reads the rebuilt contact block', () => {
    const f = extractFields(optimised);
    expect(f.email).toBe('hello@alexrivera.com');
    expect(f.location).toBe('Jakarta, Indonesia');
    expect(f.portfolio).toBe('alexrivera.com');
    expect(f.dateRanges.length).toBeGreaterThanOrEqual(4);
  });

  it('does not mistake a date range for a phone number', () => {
    expect(extractFields('Meridian Logistics | May 2022 - August 2023').phone).toBeNull();
  });

  it('prefers a portfolio URL near the top over a client URL further down', () => {
    const text = 'Jane Doe\njane.design | jane@mail.com\n\nEXPERIENCE\nRedesigned clientsite.com for a client.';
    expect(extractFields(text).portfolio).toBe('jane.design');
  });
});

describe('structure', () => {
  it('catches two roles sharing an identical date range', () => {
    const report = scoreResume({ text: legacy });
    expect(check(report, 'C4').status).toBe('fail');
    expect(check(report, 'C4').detail).toContain('May 2021');
  });

  it('accepts reverse-chronological order', () => {
    expect(check(scoreResume({ text: optimised }), 'C3').status).toBe('pass');
  });

  it('rejects roles listed oldest first', () => {
    const text = [
      'PROFESSIONAL EXPERIENCE',
      'Junior Designer, A Co',
      'Jan 2018 - Jan 2020',
      'Senior Designer, B Co',
      'Jan 2021 - Present',
    ].join('\n');
    expect(check(scoreResume({ text }), 'C3').status).toBe('fail');
  });
});

describe('job match', () => {
  it('ranks phrases from the posting above single words', () => {
    const kws = extractJobKeywords(SAMPLE_JOB_DESCRIPTION).map((k) => k.term);
    expect(kws).toContain('senior product designer');
    expect(kws).toContain('design system');
  });

  it('reads the posting title', () => {
    expect(jobTitleFrom(SAMPLE_JOB_DESCRIPTION)?.toLowerCase()).toBe('senior product designer');
  });

  it('reads titles outside design too', () => {
    expect(jobTitleFrom('Staff Software Engineer\n\nWe are hiring.')?.toLowerCase()).toBe(
      'staff software engineer',
    );
    expect(jobTitleFrom('Marketing Manager\n\nAbout the role.')?.toLowerCase()).toBe('marketing manager');
    expect(jobTitleFrom('Senior Data Analyst\n\nAbout us.')?.toLowerCase()).toBe('senior data analyst');
  });

  /**
   * The old title regex only matched designer titles, and a posting it could not read
   * gave 3 of 6 points. These are points for a test that did not operate.
   */
  it('drops the title check instead of awarding free points when it finds no title', () => {
    const posting = `${'We need someone to look after our warehouse stock levels. '.repeat(4)}`;
    const report = scoreResume({ text: optimised, jobDescription: posting });
    expect(report.hasJobDescription).toBe(true);
    expect(jobTitleFrom(posting)).toBeNull();
    expect(report.checks.find((c) => c.id === 'E2')).toBeUndefined();
    expect(report.max).toBe(94);
  });

  it('treats synonyms as a match, so "usability studies" satisfies "usability testing"', () => {
    const text = 'PROFESSIONAL EXPERIENCE\nRan usability studies and design research every sprint.';
    const report = scoreResume({ text, jobDescription: SAMPLE_JOB_DESCRIPTION });
    const usability = report.keywords.find((k) => k.term === 'usability testing');
    expect(usability?.matched).toBe(true);
  });

  it('drops muted keywords from the coverage denominator', () => {
    const base = scoreResume({ text: optimised, jobDescription: SAMPLE_JOB_DESCRIPTION });
    const missing = base.keywords.filter((k) => !k.matched).map((k) => k.term);
    const muted = scoreResume({
      text: optimised,
      jobDescription: SAMPLE_JOB_DESCRIPTION,
      mutedKeywords: missing,
    });
    expect(muted.score).toBeGreaterThanOrEqual(base.score);
  });

  it('switches Job Match off and rescales from 75 when no posting is given', () => {
    const report = scoreResume({ text: optimised });
    expect(report.hasJobDescription).toBe(false);
    expect(report.max).toBe(75);
    expect(report.categories.find((c) => c.name === 'Job Match')?.applicable).toBe(false);
  });
});

describe('hard failure', () => {
  // The numbers measured from the real Figma-exported CV that started this project.
  const blind = { engine: 'Strict PDF reader', pages: 1, textRuns: 0, drawingOps: 1272, characters: 0 };
  const salvaged = { engine: 'Lenient PDF reader', pages: 1, textRuns: 120, drawingOps: 0, characters: 2890 };

  it('returns zero for a PDF that draws glyphs but exposes no characters', () => {
    const report = scoreResume({ text: '', diagnostics: blind });
    expect(report.score).toBe(0);
    expect(report.hardFailure?.kind).toBe('no-text-layer');
  });

  it('names Type 3 only when Type 3 fonts were actually found', () => {
    const withFonts = scoreResume({ text: '', diagnostics: { ...blind, type3Fonts: 4 } });
    expect(withFonts.hardFailure?.explanation).toContain('Type 3');
    // Without the evidence the tool must not assert the cause.
    expect(scoreResume({ text: '', diagnostics: blind }).hardFailure?.explanation).not.toContain('Type 3');
  });

  /**
   * The regression that mattered: the API returns whichever engine recovered the most
   * text. Thus a score from only that reader hid the fact that the other reader got
   * exactly the file this project was built to catch.
   */
  it('still fails when one engine salvages text and another reads nothing', () => {
    const report = scoreResume({
      text: 'Sk ills E ducation N ext.js',
      diagnostics: salvaged,
      engines: [salvaged, blind],
    });
    expect(report.score).toBe(0);
    expect(report.hardFailure?.kind).toBe('engine-split');
    expect(report.hardFailure?.explanation).toContain('Lenient PDF reader');
  });

  it('does not hard-fail a short but readable file', () => {
    const report = scoreResume({
      text: optimised,
      diagnostics: { engine: 'Strict PDF reader', pages: 2, textRuns: 480, drawingOps: 900, characters: 3400 },
    });
    expect(report.hardFailure).toBeUndefined();
  });

  it('does not hard-fail when no diagnostics are supplied', () => {
    expect(scoreResume({ text: '' }).hardFailure).toBeUndefined();
  });

  it('ignores an engine that failed to run at all', () => {
    const notInstalled = { engine: 'Lenient PDF reader', pages: 0, textRuns: 0, drawingOps: 0, characters: 0 };
    const good = { engine: 'Strict PDF reader', pages: 2, textRuns: 480, drawingOps: 900, characters: 3400 };
    const report = scoreResume({ text: optimised, diagnostics: good, engines: [good, notInstalled] });
    expect(report.hardFailure).toBeUndefined();
  });
});

describe('reading order (ISO 14289)', () => {
  it('never awards full marks to a PDF that states no reading order', () => {
    const untagged = scoreResume({
      text: optimised,
      diagnostics: { engine: 'Strict PDF reader', pages: 2, textRuns: 480, drawingOps: 900, characters: 3400, tagged: false },
    });
    const a2 = check(untagged, 'A2');
    expect(a2.score).toBeLessThan(a2.max);
    expect(a2.detail).toContain('does not give a reading order');
  });

  it('awards full marks to a tagged PDF with no column signature', () => {
    const tagged = scoreResume({
      text: optimised,
      diagnostics: { engine: 'Strict PDF reader', pages: 2, textRuns: 480, drawingOps: 900, characters: 3400, tagged: true },
    });
    expect(check(tagged, 'A2').status).toBe('pass');
  });

  it('falls back to the layout heuristic for pasted text', () => {
    expect(check(scoreResume({ text: optimised }), 'A2').status).toBe('pass');
    expect(check(scoreResume({ text: legacy }), 'A2').status).toBe('fail');
  });
});

describe('fonts (ISO 32000)', () => {
  it('fails the font check when Type 3 fonts are present', () => {
    const report = scoreResume({
      text: optimised,
      diagnostics: { engine: 'Strict PDF reader', pages: 2, textRuns: 480, drawingOps: 900, characters: 3400, type3Fonts: 4 },
    });
    expect(check(report, 'A4').status).toBe('fail');
    expect(check(report, 'A4').detail).toContain('Type 3');
  });
});

describe('priority fixes', () => {
  it('orders by points recoverable, largest first', () => {
    const { priorityFixes } = scoreResume({ text: legacy, jobDescription: SAMPLE_JOB_DESCRIPTION });
    const gains = priorityFixes.map((c) => c.max - c.score);
    expect(gains).toEqual([...gains].sort((a, b) => b - a));
    expect(priorityFixes.every((c) => c.fix)).toBe(true);
  });
});
