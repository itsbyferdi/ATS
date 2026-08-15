import { selectPacks } from '../domains.js';
import { flatten } from '../text.js';
import type { Check } from '../types.js';
import { makeCheck, type CheckContext } from './context.js';

const CAT = 'Contact' as const;

export function contactChecks({ fields, jobDescription, hasJobDescription }: CheckContext): Check[] {
  const checks = [
    makeCheck(
      CAT, 'B1', 'Email address', 5,
      fields.email ? 5 : 0,
      fields.email ?? 'Not found.',
      'Write your email as plain text. A clickable icon with no visible address reads as nothing.',
    ),
    makeCheck(
      CAT, 'B2', 'Phone number', 3,
      fields.phone ? 3 : 0,
      fields.phone ?? 'Not found.',
      'Add a phone number with the country code. Some application forms will not create your record without one.',
    ),
    makeCheck(
      CAT, 'B3', 'Location', 3,
      fields.location ? 3 : 0,
      fields.location ?? 'Not found.',
      'Add "City, Country". Recruiters filter by location, and a blank one often gets read as something to worry about.',
    ),
    makeCheck(
      CAT, 'B4', 'LinkedIn URL', 2,
      fields.linkedin ? 2 : 0,
      fields.linkedin ?? 'Not found.',
      'Write the address out in full: linkedin.com/in/your-handle. Do not hide it behind the word "LinkedIn".',
    ),
  ];

  /*
   * B5 only counts in fields that actually expect a link to your work — design, code,
   * marketing, writing. An accountant with no portfolio is not doing anything wrong, and
   * docking them two points for it made the score quietly worse for most professions.
   * When the posting says nothing about the field, the check still runs, because then
   * nobody can tell either way.
   */
  const expectsPortfolio =
    !hasJobDescription || selectPacks(flatten(jobDescription)).some((p) => p.expectsPortfolio);

  if (fields.portfolio || expectsPortfolio) {
    checks.push(
      makeCheck(
        CAT, 'B5', 'A link to your work', 2,
        fields.portfolio ? 2 : 0,
        fields.portfolio ?? 'Not found.',
        'Add a portfolio, personal site or code profile — whichever fits your field. Spell the address out as text so it can be read and clicked.',
      ),
    );
  }

  return checks;
}
