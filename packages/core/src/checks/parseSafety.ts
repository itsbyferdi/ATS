import { PROBE_WORDS } from '../lexicon.js';
import { normalise } from '../text.js';
import type { Check } from '../types.js';
import { makeCheck, type CheckContext } from './context.js';

const CAT = 'Parse Safety' as const;

/**
 * Three independent tests for split words. If one test finds a split word, the text
 * layer breaks words into parts. A keyword search cannot find these words.
 */
export function detectSplitWords(text: string): { count: number; probes: string[]; singles: number } {
  // Single letters that are never words. The letters x, y, z, n and k are not in the
  // list. They are correct as placeholders, for example in "cut X% to Y%".
  const singles = text
    .split(/[\s,;:()[\]|]+/)
    .map((t) => t.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, ''))
    .filter((t) => /^[bcdefghjlmpqrstuvw]$/i.test(t)).length;

  // "Sk ills" becomes "skills" when you remove the spaces. The spaced text does not
  // contain "skills", but the collapsed text does.
  const collapsed = normalise(text).replace(/[^a-z]/g, '');
  const spaced = normalise(text);
  const probes = PROBE_WORDS.filter((w) => collapsed.includes(w) && !spaced.includes(w));

  return { count: Math.max(singles, probes.length), probes, singles };
}

export function parseSafetyChecks(ctx: CheckContext): Check[] {
  const { text, lines, fields, diagnostics } = ctx;
  const checks: Check[] = [];

  // A1. Split words.
  const split = detectSplitWords(text);
  const parts = [
    split.probes.length ? `broken words: ${split.probes.slice(0, 6).join(', ')}` : '',
    split.singles ? `${split.singles} single letters` : '',
  ].filter(Boolean);
  checks.push(
    makeCheck(
      CAT,
      'A1',
      'Words stay complete',
      7,
      split.count === 0 ? 7 : split.count <= 2 ? 4 : split.count <= 5 ? 2 : 0,
      split.count === 0
        ? 'All words are complete.'
        : `The file contains ${split.count} broken word${split.count === 1 ? '' : 's'}${parts.length ? `. Examples: ${parts.join('. ')}` : '.'}`,
      'The file contains "Sk ills" in place of "Skills". A keyword search cannot find a broken word. Letter spacing causes this problem. A PDF from a design tool also causes it. Make the file again in Word or Google Docs. Then copy the text into a notepad and make sure that all words are complete.',
    ),
  );

  // A2. Reading order. ISO 14289 (PDF/UA) keeps the reading order in a structure tree.
  // If the file has a structure tree, the file gives the order. If the file has no
  // structure tree, each program calculates the order from the position of the text.
  const columnLines = lines.raw.filter((l) => /\S\s{4,}\S/.test(l)).length;
  const columnRate = lines.raw.length ? columnLines / lines.raw.length : 0;
  const columns = Math.round(columnRate * 100);
  const tagged = diagnostics?.tagged;

  const orderScore =
    tagged === true
      ? columnRate > 0.25
        ? 3
        : 6
      : tagged === false
        ? columnRate > 0.25
          ? 0
          : columnRate > 0.1
            ? 2
            : 4
        : columnRate > 0.25
          ? 0
          : columnRate > 0.1
            ? 3
            : 6;

  const orderDetail =
    tagged === true
      ? `The file gives its reading order. ${columns}% of the lines have a large space in the middle.`
      : tagged === false
        ? `The file does not give a reading order, thus each program must calculate it. ${columns}% of the lines have a large space in the middle. A layout with two columns causes this.`
        : `${columnLines} of ${lines.raw.length} lines (${columns}%) have a large space in the middle. A layout with two columns causes this.`;

  checks.push(
    makeCheck(
      CAT,
      'A2',
      'The reading order is clear',
      6,
      orderScore,
      orderDetail,
      tagged === false && columnRate <= 0.1
        ? 'The file does not give a reading order. Each program calculates the order from the position of the text. The layout is correct, but an export from Word or Google Docs adds the missing structure.'
        : 'A program reads across the full width of the page. Text in a side column becomes part of your job details. Use one column. Keep the version with two columns for your portfolio.',
    ),
  );

  // A3. Length.
  const wc = fields.wordCount;
  checks.push(
    makeCheck(
      CAT,
      'A3',
      'The length is correct',
      4,
      wc < 200 ? 0 : wc < 300 ? 2 : wc <= 1100 ? 4 : wc <= 1400 ? 2 : 0,
      `The CV contains ${wc} words.`,
      wc < 300
        ? 'A CV with less than 300 words gives a program very little data. Use 450 to 900 words.'
        : 'A CV with more than 1100 words decreases the density of your keywords. Decrease the CV to two pages.',
    ),
  );

  // A4. Fonts and symbols that give no characters. A Type 3 font is the most important
  // problem. ISO 32000 permits a Type 3 font to keep letters as drawings. The font does
  // not have to record the applicable character.
  const bad = (text.match(/[\u{E000}-\u{F8FF}\u{FFFD}]|[\u{1F300}-\u{1FAFF}]/gu) ?? []).length;
  const type3 = diagnostics?.type3Fonts ?? 0;
  checks.push(
    makeCheck(
      CAT,
      'A4',
      'The fonts and symbols are readable',
      4,
      type3 > 0 ? 0 : bad === 0 ? 4 : bad < 5 ? 2 : 0,
      type3 > 0
        ? `The file uses ${type3} Type 3 font${type3 === 1 ? '' : 's'}. This type of font keeps letters as drawings. Some programs get characters from it and some get nothing.`
        : bad === 0
          ? 'The file contains no icon fonts, no damaged characters and no emoji.'
          : `The file contains ${bad} unreadable or decorative symbols.`,
      type3 > 0
        ? 'Export the file from Word or Google Docs. Do not export it from a design tool. Word and Google Docs include a correct font, thus the letters stay letters.'
        : 'An icon font or an emoji gives incorrect characters or no characters. Replace the icons near your email address and telephone number with words.',
    ),
  );

  // A5. Contact data must be in the body of the page. Many programs do not read a page
  // header, a page footer or a text box.
  const headHasEmail = /[\w.+-]+@[\w-]+\.[\w.]{2,}/.test(lines.raw.slice(0, 6).join(' '));
  checks.push(
    makeCheck(
      CAT,
      'A5',
      'The contact data is in the body',
      4,
      headHasEmail ? 4 : fields.email ? 2 : 0,
      headHasEmail
        ? 'Your email address is in the first six lines.'
        : fields.email
          ? 'Your email address is in the file, but not near the top.'
          : 'The file contains no email address.',
      'Do not put contact data in a page header, a page footer, a text box or an image. Many programs do not read these areas. Put the contact data in usual lines below your name.',
    ),
  );

  return checks;
}
