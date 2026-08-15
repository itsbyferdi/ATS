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
  'Do not export the PDF from Figma, Sketch, Canva, or a browser print dialogue. Rebuild the CV in Google Docs or Word and export from there, or just send the DOCX. Then check it: open the file, press Ctrl+A and Ctrl+C, and paste into a notepad. If what lands is not clean readable text, no ATS can read it either.';

/** Drew a lot of ink and gave back almost no characters. */
const isBlind = (d: ExtractionDiagnostics) => d.characters < 120 && d.drawingOps > 100;

/** Recovered enough text to be worth scoring. */
const isReadable = (d: ExtractionDiagnostics) => d.characters >= 120;

function type3Note(engines: ExtractionDiagnostics[]): string {
  const n = engines.reduce((most, e) => Math.max(most, e.type3Fonts ?? 0), 0);
  return n
    ? ` The file uses ${n} Type 3 font${n === 1 ? '' : 's'}. ISO 32000 lets that kind of font store each letter as a small drawing instead of a character, and nothing makes it record which letter the drawing is meant to be. That is why the page looks fine and reads as nothing.`
    : '';
}

/**
 * Catches a file before any rubric applies.
 *
 * Takes every engine, not just the winning one. The API hands back whichever engine
 * recovered the most characters, so when one engine reads 2890 garbled characters and
 * another reads zero, looking only at the winner hides the entire finding.
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

  // One engine read it, another read nothing. You do not get to pick which parser the
  // employer runs, so this file is not safe to send even though it "works" somewhere.
  if (readable.length) {
    return {
      kind: 'engine-split',
      diagnostics: worst,
      engines,
      headline: 'One reader sees text, another sees a blank page',
      explanation: `${readable[0].engine} pulled ${readable[0].characters} characters out of this file. ${worst.engine} drew ${worst.drawingOps} shapes and got ${worst.characters}.${type3Note(engines)} Both are used by real hiring systems. Send this file and roughly half of them receive an empty CV.`,
      fix: REBUILD_FIX,
    };
  }

  return {
    kind: 'no-text-layer',
    diagnostics: worst,
    engines,
    headline: 'No text at all',
    explanation: `This file drew ${worst.drawingOps} shapes on the page and gave back ${worst.textRuns} pieces of readable text. The letters are there to look at, but there are no characters underneath them for software to pick up.${type3Note(engines)}`,
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
  // Job Match drops out when no posting is supplied, so the total rescales from 75.
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
