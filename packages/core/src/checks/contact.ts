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
      'Write your email address as usual text. An icon with no visible address gives no data.',
    ),
    makeCheck(
      CAT, 'B2', 'Telephone number', 3,
      fields.phone ? 3 : 0,
      fields.phone ?? 'Not found.',
      'Add a telephone number with the country code. Some application forms do not make your record without one.',
    ),
    makeCheck(
      CAT, 'B3', 'Location', 3,
      fields.location ? 3 : 0,
      fields.location ?? 'Not found.',
      'Add the city and the country. Recruiters filter by location. An empty location can look like a problem.',
    ),
    makeCheck(
      CAT, 'B4', 'LinkedIn address', 2,
      fields.linkedin ? 2 : 0,
      fields.linkedin ?? 'Not found.',
      'Write the full address: linkedin.com/in/your-handle. Do not hide it behind the word "LinkedIn".',
    ),
  ];

  /*
   * B5 applies only to fields that usually ask for a link to your work, for example
   * design, software, marketing and writing. An accountant with no portfolio does
   * nothing incorrect. A penalty of two points made the score worse for most jobs. If
   * the advert does not identify the field, the check stays, because then nobody can
   * know.
   */
  const expectsPortfolio =
    !hasJobDescription || selectPacks(flatten(jobDescription)).some((p) => p.expectsPortfolio);

  if (fields.portfolio || expectsPortfolio) {
    checks.push(
      makeCheck(
        CAT, 'B5', 'A link to your work', 2,
        fields.portfolio ? 2 : 0,
        fields.portfolio ?? 'Not found.',
        'Add a portfolio, a personal site or a code profile. Select the type that your field expects. Write the address as text.',
      ),
    );
  }

  return checks;
}
