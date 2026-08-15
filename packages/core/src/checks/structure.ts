import { SECTION_PATTERNS } from '../lexicon.js';
import { toMonths } from '../text.js';
import type { Check } from '../types.js';
import { makeCheck, type CheckContext } from './context.js';

const CAT = 'Structure' as const;

export function structureChecks({ text, fields }: CheckContext): Check[] {
  const checks: Check[] = [];
  const ranges = fields.dateRanges;

  // C1. A program uses these headings to find the start of each section.
  const found = (Object.keys(SECTION_PATTERNS) as (keyof typeof SECTION_PATTERNS)[]).filter((k) =>
    SECTION_PATTERNS[k].test(text),
  );
  checks.push(
    makeCheck(
      CAT, 'C1', 'Usual section headings', 6,
      (found.includes('experience') ? 3 : 0) +
        (found.includes('education') ? 2 : 0) +
        (found.includes('skills') ? 1 : 0),
      `Found: ${found.length ? found.join(', ') : 'none'}.`,
      'The CV has no line with the text "Experience" or "Professional Experience". A program uses this heading to find the start of your job history. Without the heading, your jobs go into the incorrect field or into no field.',
    ),
  );

  // C2. A program calculates your years of experience from these dates.
  checks.push(
    makeCheck(
      CAT, 'C2', 'Dates a program can read', 6,
      ranges.length >= 4 ? 6 : ranges.length >= 2 ? 4 : ranges.length === 1 ? 2 : 0,
      `Found ${ranges.length} date range${ranges.length === 1 ? '' : 's'}: ${
        ranges.slice(0, 6).map((r) => r.raw).join(' · ') || 'none'
      }`,
      'Write each job as "Month YYYY - Month YYYY". Write your current job as "Month YYYY - Present". A program calculates your years of experience from these dates. A date that is not there can count as zero years.',
    ),
  );

  // C3. Many programs use the first job in the file as your current job title.
  const inOrder = ranges.every(
    (r, i) => i === 0 || toMonths(r.start) <= toMonths(ranges[i - 1].start),
  );
  checks.push(
    makeCheck(
      CAT, 'C3', 'The newest job is first', 4,
      ranges.length < 2 ? 2 : inOrder ? 4 : 0,
      ranges.length < 2
        ? 'There are too few dates to do this test.'
        : inOrder
          ? 'The jobs go from the newest to the oldest.'
          : 'A newer job is below an older job.',
      'Put your newest job first. Many programs use the first job in the file as your current job title. Recruiters search on this field more than any other.',
    ),
  );

  // C4. Two jobs with the same dates are almost always a copy error.
  const duplicates = new Set<string>();
  for (let i = 0; i < ranges.length; i++) {
    for (let j = i + 1; j < ranges.length; j++) {
      if (ranges[i].raw.toLowerCase() === ranges[j].raw.toLowerCase()) duplicates.add(ranges[i].raw);
    }
  }
  checks.push(
    makeCheck(
      CAT, 'C4', 'No dates occur two times', 4,
      duplicates.size ? 0 : 4,
      duplicates.size
        ? `These dates occur two times: ${[...duplicates].join(', ')}`
        : 'No dates occur two times.',
      'Two jobs have the same start date and the same end date. This is almost always a copy error, and it looks careless. Put in the correct dates.',
    ),
  );

  return checks;
}
