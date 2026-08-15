import { PROBE_WORDS } from '../lexicon.js';
import { normalise } from '../text.js';
import type { Check } from '../types.js';
import { makeCheck, type CheckContext } from './context.js';

const CAT = 'Parse Safety' as const;

/**
 * Three independent detectors for split words. Any one of them firing means the
 * text layer is breaking words apart, which makes every affected keyword
 * unsearchable.
 */
export function detectSplitWords(text: string): { count: number; probes: string[]; singles: number } {
  // Single letters that are never words on their own. x/y/z/n/k are excluded
  // because they are legitimate placeholders and variables ("cut X% to Y%").
  const singles = text
    .split(/[\s,;:()[\]|]+/)
    .map((t) => t.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, ''))
    .filter((t) => /^[bcdefghjlmpqrstuvw]$/i.test(t)).length;

  // "Sk ills" collapses to "skills", which the spaced text never contains.
  const collapsed = normalise(text).replace(/[^a-z]/g, '');
  const spaced = normalise(text);
  const probes = PROBE_WORDS.filter((w) => collapsed.includes(w) && !spaced.includes(w));

  return { count: Math.max(singles, probes.length), probes, singles };
}

export function parseSafetyChecks(ctx: CheckContext): Check[] {
  const { text, lines, fields, diagnostics } = ctx;
  const checks: Check[] = [];

  // A1 — split words
  const split = detectSplitWords(text);
  const parts = [
    split.probes.length ? `words broken apart: ${split.probes.slice(0, 6).join(', ')}` : '',
    split.singles ? `${split.singles} stray single letters` : '',
  ].filter(Boolean);
  checks.push(
    makeCheck(
      CAT,
      'A1',
      'Words stay whole',
      7,
      split.count === 0 ? 7 : split.count <= 2 ? 4 : split.count <= 5 ? 2 : 0,
      split.count === 0
        ? 'Your words come out whole.'
        : `${split.count} broken word${split.count === 1 ? '' : 's'} found${parts.length ? ` — ${parts.join(' · ')}` : ''}.`,
      'The file stores "Sk ills" and "N ext.js" instead of whole words, so a keyword search finds none of them. This comes from letter spacing, or from a PDF exported by a design tool. Rebuild the file in Word or Google Docs, then paste the result into a notepad to check the words are whole.',
    ),
  );

  // A2 — reading order. ISO 14289 (PDF/UA) puts the reading order in a structure tree.
  // When the file has one, the order is stated. When it does not, every parser has to
  // guess it from where the glyphs sit, and a sidebar gets stitched into the job bullets.
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
      ? `This file states its own reading order, and ${columns}% of lines have a wide gap in the middle.`
      : tagged === false
        ? `This file does not state a reading order, so every parser guesses it. ${columns}% of lines have a wide gap in the middle, which is what a two-column layout looks like from the inside.`
        : `${columnLines} of ${lines.raw.length} lines have a wide gap in the middle (${columns}%), which is what a two-column layout looks like from the inside.`;

  checks.push(
    makeCheck(
      CAT,
      'A2',
      'Reading order is clear',
      6,
      orderScore,
      orderDetail,
      tagged === false && columnRate <= 0.1
        ? 'Nothing in this file says which order to read it in, so a parser works it out from where the text sits on the page. Nothing looks wrong here, but exporting from Word or Google Docs adds the missing structure and removes the guesswork.'
        : 'A parser reads straight across the full width of the page, so a sidebar gets mixed into your job bullets. Rebuild it as one column. Keep the designed two-column version for your portfolio.',
    ),
  );

  // A3 — length
  const wc = fields.wordCount;
  checks.push(
    makeCheck(
      CAT,
      'A3',
      'Sensible length',
      4,
      wc < 200 ? 0 : wc < 300 ? 2 : wc <= 1100 ? 4 : wc <= 1400 ? 2 : 0,
      `${wc} words.`,
      wc < 300
        ? 'Under 300 words gives a parser almost nothing to match. Aim for 450 to 900.'
        : 'Over 1100 words spreads your keywords thin and loses the reader. Cut it to two pages.',
    ),
  );

  // A4 — fonts and symbols that arrive as nothing. Type 3 is the serious one: ISO 32000
  // lets it store letters as drawings, with no requirement to record the actual character.
  const bad = (text.match(/[\u{E000}-\u{F8FF}\u{FFFD}]|[\u{1F300}-\u{1FAFF}]/gu) ?? []).length;
  const type3 = diagnostics?.type3Fonts ?? 0;
  checks.push(
    makeCheck(
      CAT,
      'A4',
      'Fonts and symbols are readable',
      4,
      type3 > 0 ? 0 : bad === 0 ? 4 : bad < 5 ? 2 : 0,
      type3 > 0
        ? `${type3} Type 3 font${type3 === 1 ? '' : 's'} found. This kind of font stores letters as drawings, so some readers get characters and some get nothing.`
        : bad === 0
          ? 'No icon glyphs, broken characters, or emoji found.'
          : `${bad} unreadable or decorative symbols found.`,
      type3 > 0
        ? 'Export the file from Word or Google Docs instead of a design tool. Those embed real fonts, so the letters stay letters.'
        : 'Icon fonts and emoji arrive as nonsense or as nothing. Replace the little icons next to your email and phone with the plain words.',
    ),
  );

  // A5 — contact data must be in the body, not a header, footer, or text box
  const headHasEmail = /[\w.+-]+@[\w-]+\.[\w.]{2,}/.test(lines.raw.slice(0, 6).join(' '));
  checks.push(
    makeCheck(
      CAT,
      'A5',
      'Contact details sit in the body',
      4,
      headHasEmail ? 4 : fields.email ? 2 : 0,
      headHasEmail
        ? 'Your email appears in the first six lines.'
        : fields.email
          ? 'Your email is there, but not near the top.'
          : 'No email found anywhere in the text.',
      'Keep contact details out of the page header, the footer, a text box, or an image. Plenty of parsers skip those areas. Put them as plain lines under your name.',
    ),
  );

  return checks;
}
