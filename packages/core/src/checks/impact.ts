import { ACTION_VERBS, WEAK_OPENERS } from '../lexicon.js';
import { normalise } from '../text.js';
import type { Check } from '../types.js';
import { makeCheck, type CheckContext } from './context.js';

/**
 * These four checks are for the person reading, not the software. No parser scores
 * your verbs. They are here because a human decides what happens after the search,
 * and this is what that human skims.
 */
const CAT = 'Impact Language' as const;

const QUANT_RE = /(\b\d+(\.\d+)?\s*(%|x\b|k\b|m\b|million|thousand)|\$\s?\d|\b\d{2,}\b)/i;

export function impactChecks({ lines, flat }: CheckContext): Check[] {
  const body = lines.body;
  const checks: Check[] = [];

  // D1 — recruiters scan the first two words of each line and little else
  const verbCount = body.filter((b) => {
    const first = normalise(b).split(/\s+/)[0]?.replace(/[^a-z]/g, '') ?? '';
    return ACTION_VERBS.has(first);
  }).length;
  const verbRate = body.length ? verbCount / body.length : 0;
  checks.push(
    makeCheck(
      CAT, 'D1', 'Bullets open with an action verb', 5,
      verbRate * 5,
      `${verbCount} of ${body.length} lines start with a strong verb (${Math.round(verbRate * 100)}%).`,
      'Start each bullet with what you did: Led, Designed, Shipped, Cut, Grew. Most people skim the first two words of a line and nothing else.',
    ),
  );

  // D2 — a claim without a number is an opinion
  const quantCount = body.filter((b) => QUANT_RE.test(b)).length;
  const quantRate = body.length ? quantCount / body.length : 0;
  checks.push(
    makeCheck(
      CAT, 'D2', 'Results carry numbers', 5,
      quantRate >= 0.4 ? 5 : quantRate >= 0.25 ? 4 : quantRate >= 0.15 ? 3 : quantRate > 0 ? 1 : 0,
      `${quantCount} of ${body.length} lines contain a number (${Math.round(quantRate * 100)}%). Around a third reads well to most people.`,
      'Put a number on at least one bullet per job: take-up, conversion, time saved, drop-off, team size, features shipped. A fair estimate is fine if you can back it up.',
    ),
  );

  // D3 — long bullets get skipped by humans and dilute keyword density
  const longBullets = body.filter((b) => b.split(/\s+/).length > 34).length;
  checks.push(
    makeCheck(
      CAT, 'D3', 'Bullets stay short', 3,
      longBullets === 0 ? 3 : longBullets <= 2 ? 2 : 0,
      `${longBullets} line${longBullets === 1 ? '' : 's'} run past 34 words.`,
      'Split anything longer than two lines. Long bullets get skipped, and they spread your keywords thin.',
    ),
  );

  // D4 — resume voice is verb-first fragments
  const weak = WEAK_OPENERS.filter((w) => flat.includes(` ${w} `));
  const firstPerson = /\s(i|my|me)\s/.test(flat);
  checks.push(
    makeCheck(
      CAT, 'D4', 'No filler openers or first person', 2,
      (weak.length ? 0 : 1) + (firstPerson ? 0 : 1),
      `${weak.length ? `Found: ${weak.join(', ')}.` : 'No filler openers.'} ${
        firstPerson ? 'First-person pronouns found.' : 'No first-person pronouns.'
      }`,
      'Cut "responsible for" and "worked on", and drop I, my and me. A CV reads as short phrases that start with a verb.',
    ),
  );

  return checks;
}
