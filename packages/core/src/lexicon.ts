/**
 * The vocabulary that the scorer uses. The lists are simple, thus you can disagree with
 * the rubric directly. Each term is visible. The program does not learn or hide terms.
 *
 * The vocabulary for each field is in domains.ts, one pack for each field. This file has
 * the parts that apply to a CV in any profession.
 */
import { ALL_TERMS } from './domains.js';

/** Words that give no data when the program counts the terms of an advert. */
export const STOP_WORDS = new Set<string>(
  `a about above after again against all am an and any are as at be because been before being below
   between both but by cannot could did do does doing down during each few for from further had has
   have having he her here hers herself him himself his how i if in into is it its itself me more
   most my myself no nor not of off on once only or other ought our ours ourselves out over own same
   she should so some such than that the their theirs them themselves then there these they this
   those through to too under until up very was we were what when where which while who whom why
   with would you your yours yourself yourselves will can may must shall etc via across within upon
   also just like well able role team teams work working works join looking seeking ideal strong
   great good excellent ability responsibilities requirements qualifications preferred plus bonus
   nice years year experience experienced including include includes company companies candidate
   candidates applicant apply application job position opportunity benefits salary equal employer
   diversity inclusive new help make making made using use used ensure ensuring drive driving
   deliver delivering build building create creating support supporting our you we us your their
   this that will who what where when how why role roles hire hiring team teams
   linkedin indeed glassdoor monster ziprecruiter workday greenhouse lever
   applicants applicant applying applied save saved share report flag alert alerts
   posted ago days weeks months seen viewed click here more show less back next
   sign signin login register subscribe newsletter cookies privacy terms accept`
    .split(/\s+/)
    .filter(Boolean),
);

/**
 * All the terms that the scorer knows, for all fields. `jobMatch` decreases this to the
 * packs that apply to the advert. If there is no advert, the program uses the full list.
 * To add a profession, add a pack in domains.ts. You do not have to change this file.
 */
export const LEXICON: string[] = ALL_TERMS;

export const LEXICON_SET = new Set(LEXICON);

/**
 * One member of a group is sufficient for the full group. Thus the scanner does not give
 * a penalty to a CV that says "usability studies" when the advert says "usability
 * testing". This error makes most scanners on the internet unreliable.
 *
 * Each group contains the British and the American spelling. A CV must not get a lower
 * score because of the country of the writer.
 */
export const SYNONYM_GROUPS: string[][] = [
  // universal
  ['stakeholder management', 'stakeholders', 'stakeholder', 'stakeholder engagement'],
  ['team leadership', 'people management', 'line management', 'team management'],
  ['mentoring', 'mentorship', 'mentor', 'coaching'],
  ['project management', 'programme management', 'program management'],
  ['prioritisation', 'prioritization', 'prioritising', 'prioritizing'],
  ['optimisation', 'optimization', 'optimising', 'optimizing'],
  ['organisation', 'organization', 'organisational', 'organizational'],
  ['analyse', 'analyze', 'analysis', 'analytical'],
  ['budget management', 'budgeting', 'budget'],
  ['process improvement', 'continuous improvement', 'lean', 'kaizen'],
  ['cross-functional', 'cross functional', 'multidisciplinary', 'multi-disciplinary'],
  ['communication', 'communications', 'written communication', 'verbal communication'],
  ['customer service', 'customer support', 'client service'],
  ['data analysis', 'data analytics', 'analytics'],
  ['reporting', 'reports', 'report writing'],
  ['compliance', 'regulatory compliance', 'governance'],
  ['training', 'training and development', 'learning and development'],
  ['agile', 'scrum', 'kanban'],
  ['kpi', 'kpis', 'okr', 'okrs', 'metrics'],
  // design
  ['ux research', 'user research', 'design research', 'research'],
  ['usability testing', 'user testing', 'usability study', 'usability studies'],
  ['design system', 'design systems'],
  ['ux/ui', 'ui/ux', 'ux design', 'ui design', 'user interface design', 'user experience design'],
  ['wireframes', 'wireframing', 'wireframe'],
  ['prototype', 'prototyping', 'prototypes'],
  ['a11y', 'accessibility', 'inclusive design'],
  ['design handoff', 'developer handoff', 'engineering handoff', 'handoff'],
  ['critique', 'design critique', 'crit'],
  ['component library', 'component libraries', 'components'],
  ['responsive design', 'responsive'],
  // engineering
  ['front-end', 'frontend', 'front end'],
  ['back-end', 'backend', 'back end'],
  ['full stack', 'full-stack', 'fullstack'],
  ['ci/cd', 'continuous integration', 'continuous delivery', 'continuous deployment'],
  ['test automation', 'automated testing', 'unit testing', 'integration testing'],
  ['next.js', 'nextjs'],
  ['node.js', 'nodejs', 'node'],
  ['api design', 'api', 'apis', 'rest', 'restful'],
  ['google cloud', 'gcp'],
  // shared
  ['end to end', 'end-to-end', '0 to 1', '0-to-1', 'zero to one'],
  ['b2b', 'business to business', 'enterprise'],
  ['saas', 'software as a service'],
  ['data-driven', 'data driven', 'data-informed', 'data informed'],
  ['product roadmap', 'roadmap'],
  ['ai', 'artificial intelligence', 'generative ai', 'llm', 'machine learning'],
  ['experimentation', 'a/b testing', 'ab testing', 'split testing'],
  ['crm', 'salesforce', 'hubspot'],
  ['erp', 'sap', 'oracle', 'netsuite'],
  ['financial reporting', 'financial statements', 'management accounts'],
  ['recruitment', 'talent acquisition', 'hiring', 'sourcing'],
  ['patient care', 'clinical care', 'care delivery'],
  ['curriculum development', 'lesson planning', 'schemes of work'],
];

/**
 * Verbs that start a strong item, for all professions. A nurse administers, a lawyer
 * drafts, an electrician installs. A checker that uses the vocabulary of one industry
 * tells a teacher that the CV is bad, which is incorrect.
 */
export const ACTION_VERBS = new Set<string>(
  `led lead leads managed manage directed direct headed oversaw supervised coordinated
   designed design shipped ship built build created create developed develop drove drives
   launched launch delivered deliver owned own ran run operated executed implemented
   improved improve increased increase reduced reduce cut grew grow scaled scale
   redesigned rebuilt refactored migrated modernised modernized upgraded consolidated
   defined define established set shaped streamlined simplified standardised standardized
   automated introduced initiated founded launched pioneered spearheaded championed
   partnered collaborated facilitated coordinated liaised negotiated influenced advised
   consulted presented reported communicated documented published authored wrote drafted
   edited translated localised localized researched investigated analysed analyzed
   evaluated assessed audited reviewed inspected tested validated verified diagnosed
   troubleshot resolved solved fixed repaired maintained serviced installed configured
   deployed monitored optimised optimized tuned secured protected
   taught trained mentored coached tutored instructed supervised onboarded
   treated cared nursed administered assessed screened counselled counseled prescribed
   forecast forecasted budgeted reconciled processed calculated invoiced billed
   sold closed prospected generated acquired retained upsold converted
   recruited hired sourced interviewed staffed scheduled planned organised organized
   procured sourced purchased negotiated shipped stocked tracked measured
   achieved exceeded surpassed won secured earned awarded accelerated eliminated
   enabled supported assisted served handled`
    .split(/\s+/)
    .filter(Boolean),
);

export const WEAK_OPENERS = [
  'responsible for',
  'worked on',
  'helped with',
  'assisted in',
  'tasked with',
  'duties included',
  'participated in',
  'involved in',
  'in charge of',
  'my role was',
];

/**
 * Test words that find split words. Remove all the spaces from the text. If a test word
 * is in the result but not in the text as written, the file breaks words into parts, for
 * example "Sk ills" and "E ducation". These words occur on a CV in any field. Names of
 * design tools made the check operate for very few people.
 */
export const PROBE_WORDS = `skills education experience summary profile projects certifications
  languages references achievements employment history qualifications training awards
  volunteer publications interests university college bachelor master degree diploma
  manager engineer developer designer analyst director coordinator specialist consultant
  assistant administrator supervisor technician officer executive associate nurse teacher
  accountant solicitor researcher marketing operations finance sales support strategy
  leadership responsibilities professional personal contact present current company`
  .split(/\s+/)
  .filter(Boolean);

/**
 * The headings that a program looks for to find the start of each section. This list is
 * much longer than the three headings of a design CV. Certifications and licences are
 * the most important part of a CV in nursing, law and the trades.
 */
export const SECTION_PATTERNS = {
  experience:
    /^\s*(work\s+|professional\s+|relevant\s+|employment\s+|career\s+|clinical\s+|teaching\s+)?(experience|history|employment|background|appointments)\s*:?\s*$/im,
  education:
    /^\s*(education(\s+(and|&)\s+\w+)?|academic\s+(background|history|qualifications)|qualifications)\s*:?\s*$/im,
  skills:
    /^\s*(core\s+|key\s+|technical\s+|professional\s+|clinical\s+|it\s+)?(skills|competencies|expertise|toolkit|proficiencies|capabilities|strengths)\s*:?\s*$/im,
  summary:
    /^\s*(professional\s+|career\s+|executive\s+|personal\s+)?(summary|profile|objective|about( me)?|statement|overview)\s*:?\s*$/im,
  certifications:
    /^\s*(certifications?|licences?|licenses?|accreditations?|credentials|registrations?|memberships?)\s*:?\s*$/im,
  projects: /^\s*(key\s+|selected\s+|notable\s+)?(projects|portfolio|case studies|publications|research)\s*:?\s*$/im,
} as const;

export const BANDS = [
  { key: 'strong' as const, min: 80, label: 'Strong', advice: 'This file reads correctly and agrees with the advert. Send it.' },
  { key: 'nearly' as const, min: 65, label: 'Nearly there', advice: 'This file reads correctly, but you do not have all the matches that you can get. Correct the items below.' },
  { key: 'needs-work' as const, min: 45, label: 'Needs work', advice: 'A program gets some of this file and loses some of it. Correct the failed checks before you apply.' },
  { key: 'high-risk' as const, min: 0, label: 'High risk', advice: 'A program loses important data. Make the file again before you send it.' },
];
