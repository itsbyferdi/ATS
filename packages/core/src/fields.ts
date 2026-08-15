import { findDateRanges, flatten, splitLines } from './text.js';
import type { ExtractedFields } from './types.js';

/*
 * Each quantity here has a limit, on purpose.
 *
 * The email pattern without a limit is [\w.+-]+@ and it is very slow on a long sequence
 * of word characters with no "@" character. With 2 MB of usual text, the time increased
 * from milliseconds to more than one hour of CPU. This is a denial of service on each
 * installation that accepts text from the internet.
 *
 * The limits are the real ones: 64 characters for the local part, 255 characters for the
 * domain (RFC 5321) and 63 characters for a DNS label. The pattern loses no correct
 * address. Each start position now fails after a fixed quantity of work. It does not
 * read to the end of the file.
 */
const EMAIL_RE = /[\w.+-]{1,64}@[\w-]{1,255}\.[\w.]{2,24}/;
const EMAIL_RE_G = /[\w.+-]{1,64}@[\w-]{1,255}\.[\w.]{2,24}/g;
const LINKEDIN_RE = /(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/[\w\-/%.]{1,128}/i;
const URL_RE =
  /(?:https?:\/\/)?(?:www\.)?[a-z0-9-]{1,63}\.(?:com|io|co|design|me|dev|net|org|xyz|site|studio|work|portfolio)(?:\/[\w\-/%.#?=&]{0,255})?/gi;

const COUNTRIES =
  'Indonesia|Singapore|Malaysia|Australia|United States|USA|UK|United Kingdom|Netherlands|Germany|Japan|India|Vietnam|Thailand|Philippines|Canada|France|Spain|UAE|Hong Kong|China';
const LOCATION_RE = new RegExp(
  `\\b([A-Z][a-zA-Z.\\-']+(?:\\s[A-Z][a-zA-Z.\\-']+)?),\\s*(${COUNTRIES}|[A-Z]{2})\\b`,
);

/**
 * Finds a telephone number. Does not find a date range or a postcode. The ITU gives 8 to
 * 15 digits for a full international number.
 */
function findPhone(text: string): string | null {
  // Bounded for the same reason as the patterns above: an unbounded run here backtracks
  // on long stretches of digits and spaces. 20 covers the longest real number with
  // separators, and the digit count is checked properly just below.
  const candidates = text.match(/(\+?\d[\d\s().-]{7,20}\d)/g) ?? [];
  const hit = candidates.find((c) => {
    const digits = c.replace(/\D/g, '').length;
    if (digits < 8 || digits > 15) return false;
    return !/(19|20)\d{2}\s*[-–—]\s*(19|20)\d{2}/.test(c);
  });
  return hit ? hit.trim() : null;
}

export function extractFields(text: string): ExtractedFields {
  const { raw, bullets } = splitLines(text);
  const head = raw.slice(0, 8).join(' ');

  /*
   * The second half of an email address also matches the pattern for a web address.
   * Thus "alex@acme.com" gave "acme.com" as a portfolio that the person did not write.
   * The function compares the position, not the text. Thus it keeps a site that is the
   * same as the email domain if the person writes it on a different line. That
   * occurrence is outside the email address, thus it counts.
   */
  const emailRanges: [number, number][] = [];
  for (const m of text.matchAll(EMAIL_RE_G)) {
    if (m.index !== undefined) emailRanges.push([m.index, m.index + m[0].length]);
  }

  const urls: string[] = [];
  for (const m of text.matchAll(URL_RE)) {
    if (m.index === undefined) continue;
    if (emailRanges.some(([start, end]) => m.index! >= start && m.index! < end)) continue;
    if (/linkedin\.com/i.test(m[0]) || m[0].includes('@')) continue;
    urls.push(m[0]);
  }

  const firstLine = (raw[0] ?? '').trim();
  const looksLikeName = firstLine.length > 0 && firstLine.length <= 45 && /^[A-Za-z.'\- ]+$/.test(firstLine);

  return {
    name: looksLikeName ? firstLine : null,
    email: text.match(EMAIL_RE)?.[0] ?? null,
    phone: findPhone(text),
    location: text.match(LOCATION_RE)?.[0] ?? null,
    linkedin: text.match(LINKEDIN_RE)?.[0] ?? null,
    // Use an address near the top. The site of a client lower in the CV is not your
    // portfolio.
    portfolio: urls.find((u) => head.includes(u)) ?? urls[0] ?? null,
    dateRanges: findDateRanges(text),
    wordCount: flatten(text).split(' ').filter(Boolean).length,
    bulletCount: bullets.length,
  };
}
