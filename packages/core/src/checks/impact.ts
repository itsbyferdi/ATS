import { ACTION_VERBS, WEAK_OPENERS } from '../lexicon.js';
import { normalise } from '../text.js';
import type { Check } from '../types.js';
import { makeCheck, type CheckContext } from './context.js';

/**
 * These four checks are for the person who reads the CV. They are not for the software.
 * No program gives a score to your verbs. A person makes the decision after the search,
 * and these are the parts that the person reads first.
 */
const CAT = 'Impact Language' as const;

const QUANT_RE = /(\b\d+(\.\d+)?\s*(%|x\b|k\b|m\b|million|thousand)|\$\s?\d|\b\d{2,}\b)/i;

export function impactChecks({ lines, flat }: CheckContext): Check[] {
  const body = lines.body;
  const checks: Check[] = [];

  // D1. Most people read the first two words of a line and no more.
  const verbCount = body.filter((b) => {
    const first = normalise(b).split(/\s+/)[0]?.replace(/[^a-z]/g, '') ?? '';
    return ACTION_VERBS.has(first);
  }).length;
  const verbRate = body.length ? verbCount / body.length : 0;
  checks.push(
    makeCheck(
      CAT, 'D1', 'Each item starts with a verb', 5,
      verbRate * 5,
      `${verbCount} of ${body.length} lines (${Math.round(verbRate * 100)}%) start with a strong verb.`,
      'Start each item with your action: Led, Designed, Shipped, Cut, Grew. Most people read the first two words of a line and no more.',
    ),
  );

  // D2. A statement with no number is only an opinion.
  const quantCount = body.filter((b) => QUANT_RE.test(b)).length;
  const quantRate = body.length ? quantCount / body.length : 0;
  checks.push(
    makeCheck(
      CAT, 'D2', 'The results have numbers', 5,
      quantRate >= 0.4 ? 5 : quantRate >= 0.25 ? 4 : quantRate >= 0.15 ? 3 : quantRate > 0 ? 1 : 0,
      `${quantCount} of ${body.length} lines (${Math.round(quantRate * 100)}%) have a number. Approximately one third reads well.`,
      'Add a number to a minimum of one item for each job. Use take-up, conversion, time saved, drop-off, team size or the quantity of features. A correct estimate is satisfactory if you can support it.',
    ),
  );

  // D3. A long item is difficult to read and decreases the density of the keywords.
  const longBullets = body.filter((b) => b.split(/\s+/).length > 34).length;
  checks.push(
    makeCheck(
      CAT, 'D3', 'The items are short', 3,
      longBullets === 0 ? 3 : longBullets <= 2 ? 2 : 0,
      `${longBullets} line${longBullets === 1 ? '' : 's'} have more than 34 words.`,
      'Divide each item that is longer than two lines. People do not read long items, and long items decrease the density of your keywords.',
    ),
  );

  // D4. The style of a CV is short phrases that start with a verb.
  const weak = WEAK_OPENERS.filter((w) => flat.includes(` ${w} `));
  const firstPerson = /\s(i|my|me)\s/.test(flat);
  checks.push(
    makeCheck(
      CAT, 'D4', 'No filler words and no first person', 2,
      (weak.length ? 0 : 1) + (firstPerson ? 0 : 1),
      `${weak.length ? `Found: ${weak.join(', ')}.` : 'No filler words.'} ${
        firstPerson ? 'Found the words I, my or me.' : 'No first person words.'
      }`,
      'Remove "responsible for" and "worked on". Remove the words I, my and me. The style of a CV is short phrases that start with a verb.',
    ),
  );

  return checks;
}
