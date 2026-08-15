import { SECTION_PATTERNS } from '../lexicon.js';
import { toMonths } from '../text.js';
import type { Check } from '../types.js';
import { makeCheck, type CheckContext } from './context.js';

const CAT = 'Structure' as const;

export function structureChecks({ text, fields }: CheckContext): Check[] {
  const checks: Check[] = [];
  const ranges = fields.dateRanges;

  // C1 — the headings a parser uses to decide where each section begins
  const found = (Object.keys(SECTION_PATTERNS) as (keyof typeof SECTION_PATTERNS)[]).filter((k) =>
    SECTION_PATTERNS[k].test(text),
  );
  checks.push(
    makeCheck(
      CAT, 'C1', 'Standard section headings', 6,
      (found.includes('experience') ? 3 : 0) +
        (found.includes('education') ? 2 : 0) +
        (found.includes('skills') ? 1 : 0),
      `Found: ${found.length ? found.join(', ') : 'none'}.`,
      'No line reads exactly "Experience" or "Professional Experience". Software uses those headings to work out where your job history starts. Without one, your jobs land in the wrong place or nowhere at all.',
    ),
  );

  // C2 — years of experience are computed from these, so a missing range reads as zero
  checks.push(
    makeCheck(
      CAT, 'C2', 'Machine-readable date ranges', 6,
      ranges.length >= 4 ? 6 : ranges.length >= 2 ? 4 : ranges.length === 1 ? 2 : 0,
      `${ranges.length} date range${ranges.length === 1 ? '' : 's'} parsed: ${
        ranges.slice(0, 6).map((r) => r.raw).join(' · ') || 'none'
      }`,
      'Write every job as "Month YYYY - Month YYYY", or "Month YYYY - Present" for your current one. Your years of experience get counted from these dates, and a missing one can read as zero years.',
    ),
  );

  // C3 — many parsers take the first role they find as your current job title,
  // which is the highest-weighted field in the document.
  const inOrder = ranges.every(
    (r, i) => i === 0 || toMonths(r.start) <= toMonths(ranges[i - 1].start),
  );
  checks.push(
    makeCheck(
      CAT, 'C3', 'Reverse-chronological order', 4,
      ranges.length < 2 ? 2 : inOrder ? 4 : 0,
      ranges.length < 2
        ? 'Not enough dates to judge.'
        : inOrder
          ? 'Roles run newest to oldest.'
          : 'A later role appears above an earlier one.',
      'Put your newest job first. Plenty of systems take the first job they find as your current title, and that is the single field recruiters search on most.',
    ),
  );

  // C4 — two roles with the identical range is almost always a copy-paste error
  const duplicates = new Set<string>();
  for (let i = 0; i < ranges.length; i++) {
    for (let j = i + 1; j < ranges.length; j++) {
      if (ranges[i].raw.toLowerCase() === ranges[j].raw.toLowerCase()) duplicates.add(ranges[i].raw);
    }
  }
  checks.push(
    makeCheck(
      CAT, 'C4', 'No duplicated or impossible dates', 4,
      duplicates.size ? 0 : 4,
      duplicates.size
        ? `Identical range used twice: ${[...duplicates].join(', ')}`
        : 'No duplicate ranges.',
      'Two jobs have exactly the same start and end date. That is nearly always a copy-paste slip, and it reads as carelessness. Put the real dates in.',
    ),
  );

  return checks;
}
