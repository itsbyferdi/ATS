import { lexiconFor } from '../domains.js';
import { SECTION_PATTERNS, STOP_WORDS, SYNONYM_GROUPS } from '../lexicon.js';
import { flatten, hasTerm, normalise, termPresent } from '../text.js';
import type { Check, Keyword } from '../types.js';
import { makeCheck, type CheckContext } from './context.js';

const CAT = 'Job Match' as const;
const MAX_KEYWORDS = 30;

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const SENIORITY =
  'senior|junior|lead|staff|principal|associate|assistant|deputy|chief|head of|director of|' +
  'vp of|vice president of|graduate|trainee|apprentice|intern|entry[- ]level|mid[- ]level';

const QUALIFIER =
  'product|ux|ui|interaction|visual|service|experience|graphic|motion|brand|content|creative|' +
  'software|frontend|front-end|backend|back-end|full-stack|fullstack|mobile|ios|android|web|' +
  'data|machine learning|ml|ai|security|platform|cloud|devops|site reliability|qa|quality|' +
  'systems|network|database|infrastructure|business|financial|finance|management|marketing|' +
  'digital|growth|performance|sales|account|customer|client|people|talent|hr|human resources|' +
  'programme|program|project|technical|solutions|research|clinical|medical|registered|' +
  'legal|commercial|corporate|tax|audit|risk|compliance|supply chain|logistics|operations|' +
  'warehouse|production|manufacturing|mechanical|electrical|civil|structural|chemical|' +
  'environmental|health|social|primary|secondary|school|special educational needs|teaching|' +
  'communications|public relations|policy|executive|office|field|service|maintenance';

const ROLE_NOUN =
  'designer|engineer|developer|programmer|architect|scientist|analyst|manager|director|' +
  'officer|executive|administrator|coordinator|supervisor|specialist|consultant|advisor|' +
  'adviser|strategist|researcher|marketer|writer|copywriter|editor|journalist|recruiter|' +
  'accountant|bookkeeper|auditor|controller|treasurer|banker|broker|actuary|' +
  'nurse|physician|doctor|surgeon|therapist|pharmacist|paramedic|technician|technologist|' +
  'teacher|lecturer|professor|tutor|instructor|trainer|counsellor|counselor|' +
  'solicitor|lawyer|attorney|barrister|paralegal|counsel|' +
  'electrician|plumber|mechanic|carpenter|welder|machinist|operator|driver|installer|' +
  'chef|cook|barista|server|receptionist|assistant|associate|clerk|agent|representative|' +
  'buyer|planner|scheduler|estimator|surveyor|inspector|auditor|lead|head|partner|principal';

const TITLE_RE = new RegExp(
  `\\b(?:(?:${SENIORITY})\\s+)?(?:(?:${QUALIFIER})\\s+){0,2}(?:${ROLE_NOUN})\\b`,
  'i',
);

/**
 * Puts the terms of an advert in order of importance. A phrase from the vocabulary has
 * more weight than a word from the vocabulary. A word from the vocabulary has more
 * weight than a usual word that occurs many times. Each synonym group gives one entry,
 * thus a CV does not get two penalties for one idea.
 */
export function extractJobKeywords(jobDescription: string): { term: string; weight: number; fromLexicon: boolean }[] {
  const flat = ` ${flatten(jobDescription)} `;
  const scored = new Map<string, number>();

  // Use only the vocabulary of the applicable fields and the universal set. Design
  // terms in a nursing advert hide the words that are important.
  const lexicon = lexiconFor(flat);
  const lexiconSet = new Set(lexicon);

  for (const term of lexicon) {
    const t = normalise(term);
    const re = new RegExp(`(^|[^a-z0-9])${escapeRe(t)}(s|es)?([^a-z0-9]|$)`, 'g');
    const hits = (flat.match(re) ?? []).length;
    if (hits) scored.set(t, hits * (t.includes(' ') ? 2.2 : 1.4));
  }

  // Salient plain words the lexicon does not know about.
  const freq = new Map<string, number>();
  for (const w of flatten(jobDescription).split(' ')) {
    if (w.length > 3 && !STOP_WORDS.has(w) && !/^\d+$/.test(w)) freq.set(w, (freq.get(w) ?? 0) + 1);
  }
  for (const [word, n] of freq) {
    if (n < 3 || scored.has(word)) continue;
    if ([...scored.keys()].some((k) => k.includes(word))) continue;
    scored.set(word, n);
  }

  const seenGroups = new Set<string>();
  const out: { term: string; weight: number; fromLexicon: boolean }[] = [];
  for (const [term, weight] of [...scored.entries()].sort((a, b) => b[1] - a[1])) {
    const group = SYNONYM_GROUPS.find((g) => g.includes(term));
    const key = group ? group[0] : term;
    if (seenGroups.has(key)) continue;
    seenGroups.add(key);
    out.push({ term, weight, fromLexicon: lexiconSet.has(term) });
  }
  return out.slice(0, MAX_KEYWORDS);
}

/**
 * An advert puts the title at the top, thus this function reads only the first part. A
 * search of the full advert finds each mention of "the hiring manager" and other titles
 * that are not the correct one.
 */
export function jobTitleFrom(jobDescription: string): string | null {
  const opening = jobDescription.slice(0, 300);
  const m = opening.match(TITLE_RE);
  return m ? m[0].replace(/\s+/g, ' ').trim() : null;
}

export interface JobMatchResult {
  checks: Check[];
  keywords: Keyword[];
  jobTitle: string | null;
}

export function jobMatchChecks(ctx: CheckContext): JobMatchResult {
  if (!ctx.hasJobDescription) return { checks: [], keywords: [], jobTitle: null };

  const { text, flat, jobDescription, mutedKeywords, fields } = ctx;
  const ranked = extractJobKeywords(jobDescription);

  const keywords: Keyword[] = ranked.map((k) => ({
    ...k,
    matched: termPresent(flat, k.term),
    muted: mutedKeywords.has(k.term),
  }));

  const live = keywords.filter((k) => !k.muted);
  const matched = live.filter((k) => k.matched);
  const coverage = live.length ? matched.length / live.length : 0;

  const checks: Check[] = [
    makeCheck(
      CAT, 'E1', 'Keyword coverage', 14,
      coverage * 14,
      `Your CV uses ${matched.length} of the ${live.length} important terms in this advert (${Math.round(coverage * 100)}%). There is no official pass mark. Each employer sets a different one. Current systems also accept terms with almost the same meaning.`,
      'Add the missing terms to your job items and your skills line. Use the words of the advert. Do not put a block of keywords in the CV. Put each term in a place where it is true.',
    ),
  ];

  // E2. Recruiters search by job title before they search for anything else. If the
  // advert has no title that this function can read, the check is removed. The check
  // does not give points that the CV did not earn.
  const jobTitle = jobTitleFrom(jobDescription);
  if (jobTitle) {
    const exact = termPresent(flat, jobTitle);
    const core = termPresent(
      flat,
      jobTitle.replace(new RegExp(`^(?:${SENIORITY})\\s+`, 'i'), ''),
    );
    checks.push(
      makeCheck(
        CAT, 'E2', 'Your CV uses the job title', 6,
        exact ? 6 : core ? 3 : 0,
        `The advert is for "${jobTitle}". ${exact ? 'Your CV uses this exact title.' : core ? 'Your CV uses part of this title.' : 'Your CV does not use this title.'}`,
        `Recruiters search by job title before they search for anything else. Put "${jobTitle}" in a heading below your name or in your summary line. Do not change the real titles in your job history.`,
      ),
    );
  }

  // E3. A recent job has more weight. A skill that occurs only in a job from 2019
  // counts for much less. The recent block starts at the experience heading and stops
  // at the second job.
  const experienceIndex = text.search(SECTION_PATTERNS.experience);
  const start = experienceIndex > -1 ? experienceIndex : 0;
  const later = fields.dateRanges.filter((r) => r.index > start);
  const end = later.length >= 2 ? later[1].index : start + 1200;
  const recentBlock = ` ${flatten(text.slice(start, end))} `;

  const topTerms = keywords.slice(0, 8);
  const inRecent = topTerms.filter((k) => hasTerm(recentBlock, k.term)).length;
  checks.push(
    makeCheck(
      CAT, 'E3', 'The most important terms are in your current job', 5,
      topTerms.length ? (inRecent / topTerms.length) * 5 : 0,
      `${inRecent} of the ${topTerms.length} most important terms in this advert are in your most recent job.`,
      'Recent work counts for more. A skill in a job from 2019 has much less value than the same skill in your current job. Move the applicable work to the top.',
    ),
  );

  return { checks, keywords, jobTitle };
}
