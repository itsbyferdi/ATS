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
 * Rank the terms a posting actually leans on. Lexicon phrases outrank lexicon
 * words, which outrank plain repeated words. Synonym groups collapse to one entry
 * so a resume is never punished twice for the same idea.
 */
export function extractJobKeywords(jobDescription: string): { term: string; weight: number; fromLexicon: boolean }[] {
  const flat = ` ${flatten(jobDescription)} `;
  const scored = new Map<string, number>();

  // Only the vocabulary of the fields this posting is about, plus the universal set.
  // Ranking a nursing post against design terms would bury the words that matter.
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
 * Postings put the title at the top, so only the opening is searched. Looking at the
 * whole posting picks up every passing mention of "the hiring manager" instead.
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
      `Your CV uses ${matched.length} of the ${live.length} terms this posting leans on (${Math.round(coverage * 100)}%). There is no official pass mark — every employer sets its own, and modern systems also match near-synonyms rather than exact words.`,
      'Work the missing terms into your bullets and skills line, in the posting\'s own wording. Never paste a block of keywords; put each one where it is actually true.',
    ),
  ];

  // E2 — recruiters search by job title before anything else. When the posting has no
  // detectable title the check is dropped entirely, rather than handing out free points.
  const jobTitle = jobTitleFrom(jobDescription);
  if (jobTitle) {
    const exact = termPresent(flat, jobTitle);
    const core = termPresent(
      flat,
      jobTitle.replace(new RegExp(`^(?:${SENIORITY})\\s+`, 'i'), ''),
    );
    checks.push(
      makeCheck(
        CAT, 'E2', 'The job title appears in your CV', 6,
        exact ? 6 : core ? 3 : 0,
        `The posting is for "${jobTitle}" — ${exact ? 'you use that exact title.' : core ? 'you use part of it.' : 'you never use it.'}`,
        `Recruiters search by job title before anything else. Put "${jobTitle}" in a headline under your name, or in your summary line. Leave the real titles in your job history exactly as they are.`,
      ),
    );
  }

  // E3 — recency is weighted, so a skill that only appears under a 2019 job counts for
  // far less. The recent block runs from the experience heading to the second role.
  const experienceIndex = text.search(SECTION_PATTERNS.experience);
  const start = experienceIndex > -1 ? experienceIndex : 0;
  const later = fields.dateRanges.filter((r) => r.index > start);
  const end = later.length >= 2 ? later[1].index : start + 1200;
  const recentBlock = ` ${flatten(text.slice(start, end))} `;

  const topTerms = keywords.slice(0, 8);
  const inRecent = topTerms.filter((k) => hasTerm(recentBlock, k.term)).length;
  checks.push(
    makeCheck(
      CAT, 'E3', 'Top terms sit in your current role', 5,
      topTerms.length ? (inRecent / topTerms.length) * 5 : 0,
      `${inRecent} of this posting's ${topTerms.length} strongest terms appear in your most recent job.`,
      'Recent work counts for more. A skill listed only under a 2019 job is worth far less than the same skill under your current one. Move the relevant work up.',
    ),
  );

  return { checks, keywords, jobTitle };
}
