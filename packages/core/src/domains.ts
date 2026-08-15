/**
 * The vocabulary for each field.
 *
 * The scorer knew only one job: product design. For each other advert, the scorer only
 * counted the words that occur many times. This gives much less data. Thus the tool
 * operated much better for designers than for other people.
 *
 * The terms are in packs, not in one very long list. An advert selects the packs that
 * contain its cues, and always gets the `UNIVERSAL` pack. The program scores an advert
 * for an accountant with accounting vocabulary, and an advert for a nurse with clinical
 * vocabulary. A field with no pack also operates, because the program counts unknown
 * terms that occur many times.
 *
 * To add a field, add one entry here. You do not have to change anything else.
 */

export interface DomainPack {
  id: string;
  name: string;
  /** If an advert contains these terms, the tool selects this pack. */
  cues: string[];
  /** The vocabulary that this pack adds to the keyword list. */
  terms: string[];
  /** True if this field usually expects a portfolio, a code profile or examples. */
  expectsPortfolio?: boolean;
}

/**
 * These terms apply to each advert. Employers ask for these things in all fields: work
 * with other people, control of a budget, completion of work before a date, training of
 * a person and reports to a manager.
 */
export const UNIVERSAL: string[] = [
  'stakeholder management', 'cross-functional', 'project management', 'programme management',
  'team leadership', 'people management', 'line management', 'mentoring', 'coaching',
  'training', 'onboarding', 'performance management', 'hiring', 'recruitment',
  'budget management', 'cost control', 'forecasting', 'reporting', 'presentation',
  'communication', 'written communication', 'verbal communication', 'negotiation',
  'problem solving', 'analytical skills', 'attention to detail', 'time management',
  'prioritisation', 'planning', 'scheduling', 'documentation', 'process improvement',
  'continuous improvement', 'quality assurance', 'compliance', 'risk management',
  'governance', 'audit', 'policy', 'strategy', 'roadmap', 'kpi', 'okr', 'metrics',
  'data analysis', 'excel', 'powerpoint', 'google workspace', 'microsoft office',
  'agile', 'scrum', 'kanban', 'waterfall', 'sprint', 'stakeholders', 'client management',
  'customer service', 'vendor management', 'procurement', 'collaboration', 'teamwork',
  'remote work', 'hybrid', 'change management', 'workshop facilitation', 'escalation',
  'root cause analysis', 'standard operating procedure', 'sla', 'crm', 'erp',
];

export const DOMAIN_PACKS: DomainPack[] = [
  {
    id: 'software',
    name: 'Software and engineering',
    expectsPortfolio: true,
    cues: ['software engineer', 'developer', 'backend', 'frontend', 'full stack', 'devops', 'programming', 'codebase', 'api', 'sre'],
    terms: [
      'software engineering', 'backend', 'frontend', 'front-end', 'back-end', 'full stack',
      'javascript', 'typescript', 'python', 'java', 'c#', 'c++', 'go', 'golang', 'rust',
      'ruby', 'php', 'swift', 'kotlin', 'scala', 'react', 'next.js', 'vue', 'angular',
      'svelte', 'node.js', 'express', 'django', 'flask', 'spring', 'rails', '.net',
      'html', 'css', 'tailwind', 'sass', 'graphql', 'rest', 'grpc', 'microservices',
      'api design', 'sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch',
      'aws', 'azure', 'gcp', 'google cloud', 'docker', 'kubernetes', 'terraform',
      'ci/cd', 'jenkins', 'github actions', 'git', 'github', 'gitlab', 'unit testing',
      'integration testing', 'test automation', 'tdd', 'code review', 'debugging',
      'performance optimisation', 'scalability', 'distributed systems', 'system design',
      'observability', 'monitoring', 'linux', 'bash', 'devops', 'site reliability',
    ],
  },
  {
    id: 'design',
    name: 'Design',
    expectsPortfolio: true,
    cues: ['designer', 'ux', 'ui', 'user experience', 'visual design', 'figma', 'design system', 'interaction design'],
    terms: [
      'product design', 'product designer', 'senior product designer', 'ux design', 'ui design',
      'ux/ui', 'user experience', 'user interface', 'interaction design', 'visual design',
      'service design', 'design systems', 'design system', 'design tokens', 'component library',
      'style guide', 'figma', 'figjam', 'sketch', 'adobe xd', 'framer', 'protopie', 'webflow',
      'miro', 'storybook', 'zeplin', 'photoshop', 'illustrator', 'after effects', 'indesign',
      'user research', 'ux research', 'design research', 'discovery research',
      'usability testing', 'user testing', 'concept testing', 'user interviews',
      'contextual inquiry', 'card sorting', 'heuristic evaluation', 'journey mapping',
      'customer journey', 'personas', 'jobs to be done', 'service blueprint',
      'wireframing', 'wireframes', 'prototyping', 'prototype', 'high fidelity', 'low fidelity',
      'mockups', 'user flows', 'information architecture', 'design thinking', 'double diamond',
      'design sprint', 'critique', 'accessibility', 'wcag', 'a11y', 'inclusive design',
      'responsive design', 'mobile design', 'typography', 'colour theory', 'branding',
      'design handoff', 'developer handoff', 'design ops', 'portfolio', 'case study',
    ],
  },
  {
    id: 'data',
    name: 'Data and analytics',
    cues: ['data analyst', 'data scientist', 'analytics', 'machine learning', 'data engineer', 'bi ', 'statistics'],
    terms: [
      'data analysis', 'data science', 'data engineering', 'analytics', 'business intelligence',
      'sql', 'python', 'r', 'pandas', 'numpy', 'scikit-learn', 'tensorflow', 'pytorch',
      'machine learning', 'deep learning', 'nlp', 'computer vision', 'statistics',
      'statistical analysis', 'regression', 'classification', 'clustering', 'forecasting',
      'a/b testing', 'experimentation', 'hypothesis testing', 'causal inference',
      'tableau', 'power bi', 'looker', 'metabase', 'dbt', 'airflow', 'spark', 'hadoop',
      'snowflake', 'bigquery', 'redshift', 'databricks', 'etl', 'elt', 'data pipeline',
      'data warehouse', 'data modelling', 'data quality', 'data governance', 'dashboard',
      'visualisation', 'reporting', 'segmentation', 'cohort analysis', 'predictive modelling',
    ],
  },
  {
    id: 'product',
    name: 'Product management',
    cues: ['product manager', 'product owner', 'product management', 'roadmap', 'backlog'],
    terms: [
      'product management', 'product manager', 'product owner', 'product strategy',
      'product roadmap', 'backlog', 'backlog grooming', 'user stories', 'acceptance criteria',
      'prd', 'requirements gathering', 'discovery', 'delivery', 'go-to-market',
      'product launch', 'market research', 'competitive analysis', 'user feedback',
      'customer interviews', 'prioritisation', 'rice', 'moscow', 'north star',
      'product analytics', 'a/b testing', 'experimentation', 'conversion', 'retention',
      'activation', 'engagement', 'churn', 'funnel', 'lifecycle', 'pricing', 'monetisation',
      'stakeholder alignment', 'jira', 'confluence', 'linear', 'amplitude', 'mixpanel',
    ],
  },
  {
    id: 'marketing',
    name: 'Marketing and growth',
    expectsPortfolio: true,
    cues: ['marketing', 'seo', 'campaign', 'brand', 'content', 'social media', 'growth', 'demand generation'],
    terms: [
      'marketing strategy', 'brand strategy', 'brand management', 'campaign management',
      'digital marketing', 'content marketing', 'content strategy', 'copywriting',
      'seo', 'sem', 'ppc', 'google ads', 'meta ads', 'paid media', 'paid social',
      'social media', 'community management', 'influencer marketing', 'email marketing',
      'marketing automation', 'hubspot', 'marketo', 'mailchimp', 'salesforce',
      'lead generation', 'demand generation', 'conversion rate optimisation', 'landing page',
      'google analytics', 'attribution', 'roas', 'cac', 'ltv', 'funnel', 'growth marketing',
      'product marketing', 'positioning', 'messaging', 'market research', 'competitive analysis',
      'public relations', 'press release', 'event marketing', 'partnerships', 'crm',
    ],
  },
  {
    id: 'sales',
    name: 'Sales and business development',
    // The word "pipeline" matched "CI/CD pipelines" and added sales vocabulary to
    // engineering adverts. Thus the cue must be the sales meaning of the word.
    cues: ['sales', 'account executive', 'business development', 'quota', 'sales pipeline', 'pipeline management', 'account manager'],
    terms: [
      'sales strategy', 'business development', 'account management', 'account executive',
      'pipeline management', 'lead qualification', 'prospecting', 'cold calling',
      'outbound', 'inbound', 'discovery call', 'demo', 'negotiation', 'closing',
      'quota', 'revenue growth', 'upsell', 'cross-sell', 'renewal', 'churn',
      'customer success', 'relationship management', 'key accounts', 'territory management',
      'salesforce', 'hubspot', 'outreach', 'crm', 'b2b', 'b2c', 'saas', 'enterprise sales',
      'solution selling', 'consultative selling', 'contract negotiation', 'proposal', 'rfp',
      'forecasting', 'sales enablement', 'partnerships', 'channel sales',
    ],
  },
  {
    id: 'finance',
    name: 'Finance and accounting',
    cues: ['accountant', 'finance', 'financial', 'audit', 'bookkeeping', 'tax', 'controller', 'treasury'],
    terms: [
      'financial reporting', 'financial analysis', 'financial modelling', 'forecasting',
      'budgeting', 'variance analysis', 'management accounts', 'month-end close',
      'year-end close', 'reconciliation', 'general ledger', 'accounts payable',
      'accounts receivable', 'payroll', 'bookkeeping', 'invoicing', 'cash flow',
      'working capital', 'treasury', 'audit', 'internal audit', 'external audit',
      'ifrs', 'gaap', 'us gaap', 'tax', 'vat', 'corporate tax', 'tax compliance',
      'sox', 'internal controls', 'risk management', 'due diligence', 'valuation',
      'fp&a', 'cost accounting', 'revenue recognition', 'consolidation', 'sap', 'oracle',
      'netsuite', 'quickbooks', 'xero', 'excel', 'financial statements', 'p&l', 'balance sheet',
      'acca', 'cpa', 'cfa', 'cima',
    ],
  },
  {
    id: 'people',
    name: 'HR and people',
    cues: ['human resources', 'hr ', 'people operations', 'talent', 'recruiter', 'recruitment', 'employee'],
    terms: [
      'human resources', 'people operations', 'talent acquisition', 'recruitment',
      'sourcing', 'candidate experience', 'interviewing', 'employer branding',
      'onboarding', 'offboarding', 'employee relations', 'employee engagement',
      'performance management', 'succession planning', 'learning and development',
      'training and development', 'compensation and benefits', 'payroll', 'hris',
      'workday', 'bamboohr', 'greenhouse', 'employment law', 'labour law',
      'diversity and inclusion', 'dei', 'organisational design', 'culture',
      'people analytics', 'headcount planning', 'grievance', 'disciplinary', 'cipd',
    ],
  },
  {
    id: 'operations',
    name: 'Operations and supply chain',
    cues: ['operations', 'supply chain', 'logistics', 'warehouse', 'procurement', 'inventory', 'manufacturing'],
    terms: [
      'operations management', 'supply chain', 'logistics', 'procurement', 'sourcing',
      'inventory management', 'stock control', 'warehouse management', 'distribution',
      'fulfilment', 'last mile', 'freight', 'shipping', 'customs', 'demand planning',
      'capacity planning', 'production planning', 'manufacturing', 'lean', 'six sigma',
      'kaizen', '5s', 'process improvement', 'standard operating procedure',
      'quality control', 'quality assurance', 'health and safety', 'iso 9001',
      'vendor management', 'supplier relationship', 'contract negotiation', 'cost reduction',
      'sap', 'erp', 'wms', 'oracle', 'route optimisation', 'fleet management',
    ],
  },
  {
    id: 'healthcare',
    name: 'Healthcare and clinical',
    cues: ['nurse', 'nursing', 'clinical', 'patient', 'medical', 'healthcare', 'physician', 'therapist', 'pharmacy'],
    terms: [
      'patient care', 'clinical practice', 'clinical governance', 'patient safety',
      'care planning', 'care coordination', 'triage', 'assessment', 'diagnosis',
      'treatment planning', 'medication administration', 'infection control',
      'electronic health records', 'ehr', 'emr', 'epic', 'cerner', 'hipaa',
      'safeguarding', 'multidisciplinary team', 'clinical audit', 'evidence-based practice',
      'nursing', 'phlebotomy', 'vital signs', 'wound care', 'discharge planning',
      'health and safety', 'cpr', 'bls', 'acls', 'first aid', 'registered nurse',
      'clinical trials', 'gcp', 'regulatory compliance', 'pharmacovigilance',
      'physiotherapy', 'occupational therapy', 'mental health', 'public health',
    ],
  },
  {
    id: 'education',
    name: 'Education and teaching',
    cues: ['teacher', 'teaching', 'lecturer', 'curriculum', 'classroom', 'student', 'education', 'tutor'],
    terms: [
      'curriculum development', 'lesson planning', 'classroom management', 'differentiation',
      'assessment', 'formative assessment', 'summative assessment', 'marking', 'feedback',
      'student engagement', 'pastoral care', 'safeguarding', 'special educational needs',
      'send', 'iep', 'inclusive education', 'behaviour management', 'parent communication',
      'ofsted', 'national curriculum', 'key stage', 'gcse', 'a-level', 'ib',
      'blended learning', 'e-learning', 'learning management system', 'lms', 'moodle',
      'google classroom', 'pedagogy', 'schemes of work', 'cpd', 'qts', 'pgce',
      'tutoring', 'mentoring', 'academic writing', 'research supervision',
    ],
  },
  {
    id: 'legal',
    name: 'Legal',
    cues: ['legal', 'lawyer', 'solicitor', 'attorney', 'paralegal', 'counsel', 'litigation', 'contract law'],
    terms: [
      'contract drafting', 'contract negotiation', 'contract review', 'commercial contracts',
      'litigation', 'dispute resolution', 'arbitration', 'mediation', 'legal research',
      'legal advice', 'due diligence', 'corporate law', 'employment law', 'commercial law',
      'intellectual property', 'trademark', 'patent', 'licensing', 'compliance',
      'regulatory compliance', 'gdpr', 'data protection', 'privacy', 'aml',
      'know your customer', 'risk assessment', 'case management', 'court filings',
      'legal drafting', 'memoranda', 'counsel', 'paralegal', 'bar admission', 'llb', 'jd',
    ],
  },
  {
    id: 'support',
    name: 'Customer support and success',
    cues: ['customer support', 'customer service', 'help desk', 'technical support', 'customer success'],
    terms: [
      'customer support', 'customer service', 'customer success', 'technical support',
      'help desk', 'service desk', 'ticketing', 'zendesk', 'freshdesk', 'intercom',
      'jira service management', 'sla', 'first response time', 'resolution time',
      'escalation', 'troubleshooting', 'root cause analysis', 'knowledge base',
      'documentation', 'onboarding', 'account management', 'churn', 'retention',
      'customer satisfaction', 'csat', 'nps', 'voice of the customer', 'live chat',
      'call handling', 'complaint handling', 'quality monitoring',
    ],
  },
  {
    id: 'writing',
    name: 'Writing and communications',
    expectsPortfolio: true,
    cues: ['writer', 'copywriter', 'editor', 'journalist', 'communications', 'content writer'],
    terms: [
      'copywriting', 'content writing', 'editing', 'proofreading', 'subediting',
      'content strategy', 'editorial calendar', 'style guide', 'tone of voice',
      'technical writing', 'ux writing', 'journalism', 'reporting', 'interviewing',
      'research', 'fact checking', 'storytelling', 'long-form', 'short-form',
      'seo writing', 'blogging', 'newsletter', 'press release', 'internal communications',
      'corporate communications', 'public relations', 'cms', 'wordpress', 'contentful',
      'ap style', 'house style', 'localisation', 'translation',
    ],
  },
  {
    id: 'science',
    name: 'Science and research',
    cues: ['research scientist', 'laboratory', 'lab ', 'phd', 'postdoc', 'experiment', 'publication'],
    terms: [
      'research design', 'experimental design', 'laboratory techniques', 'data collection',
      'quantitative research', 'qualitative research', 'literature review', 'peer review',
      'publication', 'grant writing', 'funding applications', 'protocol development',
      'statistical analysis', 'spss', 'stata', 'matlab', 'r', 'python',
      'good laboratory practice', 'glp', 'gmp', 'regulatory submission', 'ethics approval',
      'chromatography', 'spectroscopy', 'pcr', 'assay development', 'sample preparation',
      'lims', 'method validation', 'technical report', 'conference presentation',
    ],
  },
  {
    id: 'skilled-trades',
    name: 'Skilled trades and field work',
    cues: ['technician', 'electrician', 'plumber', 'mechanic', 'installation', 'maintenance', 'construction', 'site '],
    terms: [
      'preventive maintenance', 'corrective maintenance', 'fault diagnosis', 'troubleshooting',
      'installation', 'commissioning', 'servicing', 'repair', 'calibration', 'inspection',
      'health and safety', 'risk assessment', 'method statement', 'permit to work',
      'cscs', 'nvq', 'city and guilds', 'blueprint reading', 'technical drawings',
      'schematics', 'hand tools', 'power tools', 'welding', 'fabrication', 'hvac',
      'electrical systems', 'plumbing', 'mechanical systems', 'plant machinery',
      'site management', 'quality control', 'compliance', 'certification',
    ],
  },
];

const has = (haystack: string, term: string) => haystack.includes(` ${term} `) || haystack.includes(` ${term}`);

/**
 * Selects the packs that apply to an advert. More than one pack can apply. An advert for
 * a product manager who works with data needs both vocabularies.
 */
export function selectPacks(flatJobDescription: string): DomainPack[] {
  const padded = ` ${flatJobDescription} `;
  const scored = DOMAIN_PACKS.map((pack) => ({
    pack,
    hits: pack.cues.filter((c) => has(padded, c.trim())).length,
  })).filter((p) => p.hits > 0);

  scored.sort((a, b) => b.hits - a.hits);
  return scored.slice(0, 3).map((p) => p.pack);
}

/** The vocabulary for an advert: the universal set and the packs of its fields. */
export function lexiconFor(flatJobDescription: string): string[] {
  const packs = selectPacks(flatJobDescription);
  return [...new Set([...UNIVERSAL, ...packs.flatMap((p) => p.terms)])];
}

/** Each term from each pack. The tool uses this list if there is no advert. */
export const ALL_TERMS: string[] = [
  ...new Set([...UNIVERSAL, ...DOMAIN_PACKS.flatMap((p) => p.terms)]),
];
