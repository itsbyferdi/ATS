import { describe, expect, it } from 'vitest';

import {
  DOMAIN_PACKS,
  extractJobKeywords,
  flatten,
  jobTitleFrom,
  scoreResume,
  lexiconFor,
  selectPacks,
} from '../index.js';

/**
 * The scorer used to know one job: product design. Everything else fell back to counting
 * repeated words, so the tool worked far better for designers than for anyone else.
 * These postings are deliberately from fields with nothing in common.
 */
const POSTINGS: Record<string, { jd: string; pack: string; title: string; expect: string[] }> = {
  nursing: {
    pack: 'healthcare',
    title: 'registered nurse',
    expect: ['patient care', 'medication administration'],
    jd: `Registered Nurse, Ward 4. We are seeking a registered nurse to deliver patient care
      on a busy medical ward. You will carry out patient assessment, medication administration,
      care planning and discharge planning within a multidisciplinary team. Experience with
      electronic health records and infection control required. Safeguarding training essential.
      Patient safety and clinical governance are central to the role.`,
  },
  software: {
    pack: 'software',
    title: 'staff software engineer',
    expect: ['system design', 'code review'],
    jd: `Staff Software Engineer, Platform. Build and scale our backend services in Go and
      TypeScript. You will own system design for distributed systems, improve observability and
      monitoring, and mentor engineers. Experience with Kubernetes, Docker, terraform and CI/CD
      pipelines on AWS required. Strong grasp of API design, code review and test automation.`,
  },
  finance: {
    pack: 'finance',
    title: 'management accountant',
    expect: ['financial reporting', 'variance analysis'],
    jd: `Management Accountant. Own month-end close, management accounts and variance analysis.
      Prepare financial reporting under IFRS, support the annual audit, and manage accounts
      payable and receivable. Strong Excel and experience with SAP or NetSuite. ACCA or CIMA
      qualified. Responsible for budgeting, forecasting and cash flow.`,
  },
  teaching: {
    pack: 'education',
    title: 'teacher',
    expect: ['curriculum development', 'classroom management'],
    jd: `Secondary School Teacher of Mathematics. Deliver lesson planning and curriculum
      development across key stage 3 and 4, including GCSE. Strong classroom management and
      behaviour management. Use formative assessment and marking to drive student engagement.
      Safeguarding and pastoral care responsibilities. QTS required, PGCE desirable.`,
  },
  operations: {
    pack: 'operations',
    title: 'warehouse supervisor',
    expect: ['inventory management', 'stock control'],
    jd: `Warehouse Supervisor. Oversee inventory management and stock control across our
      distribution centre. Lead a team of 20, manage health and safety compliance, and drive
      process improvement using lean and 5s. Experience with WMS and ERP systems. Responsible
      for capacity planning and fulfilment targets.`,
  },
};

describe('domain packs', () => {
  it('has unique ids and no empty packs', () => {
    const ids = DOMAIN_PACKS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of DOMAIN_PACKS) {
      expect(p.cues.length, p.id).toBeGreaterThan(0);
      expect(p.terms.length, p.id).toBeGreaterThan(10);
    }
  });

  for (const [field, { jd, pack, title, expect: wanted }] of Object.entries(POSTINGS)) {
    describe(field, () => {
      it('selects the right pack', () => {
        expect(selectPacks(flatten(jd)).map((p) => p.id)).toContain(pack);
      });

      it('reads the job title', () => {
        expect(jobTitleFrom(jd)?.toLowerCase()).toContain(title);
      });

      it('ranks the terms that actually matter', () => {
        const terms = extractJobKeywords(jd).map((k) => k.term);
        for (const w of wanted) expect(terms, `${field} missed ${w}`).toContain(w);
      });

      it('rewards a CV that uses the posting language', () => {
        const good = scoreResume({ text: cv(jd), jobDescription: jd });
        const bad = scoreResume({ text: cv('unrelated filler about nothing at all'), jobDescription: jd });
        expect(good.score, field).toBeGreaterThan(bad.score);
      });
    });
  }

  /** "pipeline" once matched "CI/CD pipelines" and pulled sales terms into engineering. */
  it('does not read a CI/CD pipeline as a sales pipeline', () => {
    const packs = selectPacks(flatten(POSTINGS.software.jd)).map((p) => p.id);
    expect(packs).not.toContain('sales');
  });

  /**
   * Universal terms are always in scope. They will not always reach the top of the list,
   * and they must not. An advert with much of its own vocabulary must have more weight.
   */
  it('puts universal terms in scope for every field', () => {
    for (const [field, { jd }] of Object.entries(POSTINGS)) {
      const scope = lexiconFor(flatten(jd));
      for (const term of ['stakeholder management', 'project management', 'compliance']) {
        expect(scope, `${field} lost ${term}`).toContain(term);
      }
    }
  });

  it('surfaces a universal term when a posting leans on one', () => {
    const jd = `Operations Lead. This role is about stakeholder management above all else:
      stakeholder management across three sites, stakeholder management with suppliers, and
      budget management for a large team. Strong project management required.`;
    expect(extractJobKeywords(jd).map((k) => k.term)).toContain('stakeholder management');
  });

  /** A field nobody has written a pack for still has to work. */
  it('still ranks terms for a field with no pack', () => {
    const jd = `Sommelier. Curate our wine list, run tasting sessions and manage cellar
      rotation. Wine list curation and cellar rotation are the core of the role, alongside
      supplier relationships and tasting sessions for guests. Cellar rotation experience
      essential; wine list curation is what we will judge you on.`;
    const terms = extractJobKeywords(jd).map((k) => k.term);
    expect(terms.length).toBeGreaterThan(2);
    expect(terms).toContain('cellar');
  });
});

describe('portfolio expectations', () => {
  const cvNoPortfolio = `Alex Doe\nalex@example.com | +44 7700 900123 | Leeds, United Kingdom\nlinkedin.com/in/alexdoe\n\nPROFESSIONAL EXPERIENCE\n\nAccountant, Firm\n\nLeeds | Jan 2020 - Present\n\n- Owned month-end close for a portfolio of 12 clients.\n`;

  /**
   * An accountant with no portfolio is not doing anything wrong. Docking them for it made
   * the score quietly worse for most professions.
   */
  it('drops the portfolio check for a field that does not expect one', () => {
    const r = scoreResume({ text: cvNoPortfolio, jobDescription: POSTINGS.finance.jd });
    expect(r.checks.find((c) => c.id === 'B5')).toBeUndefined();
  });

  it('keeps it for a field that does', () => {
    const jd = `Senior Product Designer. Own end-to-end product design and our design system in
      Figma. Strong portfolio required, covering user research and interaction design.`;
    const r = scoreResume({ text: cvNoPortfolio, jobDescription: jd });
    expect(r.checks.find((c) => c.id === 'B5')).toBeDefined();
  });
});

/** A minimal CV that echoes a posting's language, for comparing scores. */
function cv(body: string): string {
  return [
    'Alex Doe',
    'alex@example.com | +44 7700 900123 | Leeds, United Kingdom',
    'linkedin.com/in/alexdoe',
    '',
    'PROFESSIONAL EXPERIENCE',
    '',
    'Specialist, Some Organisation',
    '',
    'Leeds | January 2020 - Present',
    '',
    `- Delivered work involving ${body.slice(0, 600)}`,
    '',
    'EDUCATION',
    '',
    'BSc, Some University | September 2015 - July 2018',
  ].join('\n');
}
