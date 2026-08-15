import { buildContext } from './checks/context.js';
import { contactChecks } from './checks/contact.js';
import { impactChecks } from './checks/impact.js';
import { jobMatchChecks } from './checks/jobMatch.js';
import { parseSafetyChecks } from './checks/parseSafety.js';
import { structureChecks } from './checks/structure.js';
import { BANDS } from './lexicon.js';
import { extractFields } from './fields.js';
import {
  CATEGORY_ORDER,
  type Band,
  type CategoryScore,
  type Check,
  type ExtractionDiagnostics,
  type HardFailure,
  type ScoreInput,
  type ScoreReport,
} from './types.js';

export function bandFor(score: number): Band {
  return BANDS.find((b) => score >= b.min) ?? BANDS[BANDS.length - 1];
}

const REBUILD_FIX =
  'Do not export the PDF from Figma, Sketch, Canva or a browser print window. Make the CV again in Google Docs or Word and export it from there. As an alternative, send the DOCX file. Then do this test: open the file, press Ctrl+A and Ctrl+C, and paste the result into a notepad. If the result is not clear readable text, no hiring program can read it.';

/** The reader made many marks on the page but got almost no characters. */
const isBlind = (d: ExtractionDiagnostics) => d.characters < 120 && d.drawingOps > 100;

/** The reader got sufficient text to give a score. */
const isReadable = (d: ExtractionDiagnostics) => d.characters >= 120;

function type3Note(engines: ExtractionDiagnostics[]): string {
  const n = engines.reduce((most, e) => Math.max(most, e.type3Fonts ?? 0), 0);
  return n
    ? ` The file uses ${n} Type 3 font${n === 1 ? '' : 's'}. ISO 32000 permits this type of font to keep each letter as a small drawing in place of a character. The font does not have to record the applicable letter. Thus the page looks correct but gives no text.`
    : '';
}

/**
 * Finds a file that no set of checks can apply to.
 *
 * This function uses all the readers, not only the best one. The API sends back the
 * reader that got the most characters. If one reader gets 2890 damaged characters and a
 * second reader gets zero, an examination of only the best reader hides the problem.
 */
export function detectHardFailure(
  primary: ExtractionDiagnostics | undefined,
  all: ExtractionDiagnostics[] = [],
): HardFailure | null {
  const engines = all.length ? all : primary ? [primary] : [];
  if (!engines.length) return null;

  const blind = engines.filter(isBlind);
  if (!blind.length) return null;

  const readable = engines.filter(isReadable);
  const worst = blind[0];

  // One reader got text and one reader got nothing. You cannot select the program that
  // the employer uses. Thus this file is not safe to send, although it operates
  // correctly with some programs.
  if (readable.length) {
    return {
      kind: 'engine-split',
      diagnostics: worst,
      engines,
      headline: 'One reader gets text, a second reader gets an empty page',
      explanation: `The ${readable[0].engine} got ${readable[0].characters} characters from this file. The ${worst.engine} made ${worst.drawingOps} marks on the page and got ${worst.characters} characters.${type3Note(engines)} Hiring systems use both types of reader. If you send this file, approximately one half of them get an empty CV.`,
      fix: REBUILD_FIX,
    };
  }

  return {
    kind: 'no-text-layer',
    diagnostics: worst,
    engines,
    headline: 'The file contains no text',
    explanation: `This file made ${worst.drawingOps} marks on the page and gave ${worst.textRuns} pieces of readable text. You can see the letters, but there are no characters below them. Software cannot get the letters.${type3Note(engines)}`,
    fix: REBUILD_FIX,
  };
}

export function scoreResume(input: ScoreInput): ScoreReport {
  const text = input.text ?? '';
  const jobDescription = input.jobDescription ?? '';

  const hardFailure = detectHardFailure(input.diagnostics, input.engines);
  if (hardFailure) {
    return {
      score: 0,
      points: 0,
      max: 100,
      band: bandFor(0),
      categories: CATEGORY_ORDER.map((name) => ({ name, score: 0, max: 0, applicable: false })),
      checks: [],
      fields: extractFields(''),
      keywords: [],
      jobTitle: null,
      hasJobDescription: false,
      priorityFixes: [],
      text,
      hardFailure,
    };
  }

  const ctx = buildContext(text, jobDescription, input.mutedKeywords, input.diagnostics);
  const match = jobMatchChecks(ctx);

  const checks: Check[] = [
    ...parseSafetyChecks(ctx),
    ...contactChecks(ctx),
    ...structureChecks(ctx),
    ...impactChecks(ctx),
    ...match.checks,
  ];

  const categories: CategoryScore[] = CATEGORY_ORDER.map((name) => {
    const own = checks.filter((c) => c.category === name);
    return {
      name,
      score: own.reduce((s, c) => s + c.score, 0),
      max: own.reduce((s, c) => s + c.max, 0),
      applicable: own.length > 0,
    };
  });

  const points = categories.reduce((s, c) => s + c.score, 0);
  // If there is no advert, Job Match does not apply and the total comes from 75 points.
  const max = categories.reduce((s, c) => s + c.max, 0);
  const score = max ? Math.round((points / max) * 100) : 0;

  const priorityFixes = checks
    .filter((c) => c.score < c.max && c.fix)
    .sort((a, b) => b.max - b.score - (a.max - a.score))
    .slice(0, 6);

  return {
    score,
    points,
    max,
    band: bandFor(score),
    categories,
    checks,
    fields: ctx.fields,
    keywords: match.keywords,
    jobTitle: match.jobTitle,
    hasJobDescription: ctx.hasJobDescription,
    priorityFixes,
    text,
  };
}
