/**
 * Example postings, one per field, so the sample button is not an advert for one
 * profession. They double as readable fixtures for the domain packs in domains.ts.
 */
export interface SampleJob {
  id: string;
  label: string;
  text: string;
}

const DESIGN = `Senior Product Designer

We are looking for a Senior Product Designer to join our product team in Singapore. You will own end-to-end product design for our B2B SaaS platform, from discovery research through to shipped interface.

What you will do
- Lead end-to-end design for a core product area, covering discovery, interaction design, visual design, and delivery.
- Run user research and usability testing, and turn findings into product decisions.
- Build and maintain our design system, including design tokens and component libraries, in close partnership with front-end engineers.
- Partner with product managers and engineers to shape the product roadmap and product strategy.
- Use analytics and A/B testing to make data-informed design decisions.
- Design accessible, responsive experiences across web and mobile (iOS and Android), to WCAG standards.
- Mentor other designers and raise the quality bar through critique.

What we look for
- 5+ years of product design experience, ideally in B2B SaaS or enterprise platforms.
- Expert in Figma, prototyping, wireframing, and information architecture.
- A portfolio of case studies that show end-to-end ownership and measurable outcomes.
- Strong stakeholder management and communication in cross-functional teams.
- Comfortable working with HTML, CSS, and React-based design handoff.
- Experience shipping AI-powered features is a plus.`;

const SOFTWARE = `Senior Backend Engineer

We are hiring a Senior Backend Engineer to build and scale the services behind our payments platform.

What you will do
- Own system design for distributed systems handling high transaction volume.
- Write and review production code in TypeScript and Go, with a strong focus on test automation.
- Build and maintain REST and GraphQL APIs consumed by web and mobile clients.
- Improve observability and monitoring, and take part in on-call rotation.
- Work with Postgres and Redis, and manage infrastructure with Terraform on AWS.
- Maintain CI/CD pipelines and keep deployments boring.
- Mentor engineers and take part in code review.

What we look for
- 5+ years building backend services in production.
- Strong grasp of API design, SQL, and performance optimisation.
- Experience with Docker and Kubernetes.
- Comfortable with unit testing, integration testing, and debugging live systems.
- Clear written communication and stakeholder management across cross-functional teams.`;

const NURSING = `Registered Nurse — Acute Medical Ward

We are seeking a Registered Nurse to join our acute medical ward. You will deliver patient care to a high standard within a multidisciplinary team.

What you will do
- Carry out patient assessment, care planning, and discharge planning.
- Administer medication safely and maintain accurate records in our electronic health records system.
- Monitor vital signs and escalate deteriorating patients promptly.
- Maintain infection control standards and contribute to clinical governance and clinical audit.
- Support safeguarding processes and uphold patient safety at all times.
- Mentor student nurses and support their training and development.

What we look for
- Registered Nurse with current NMC registration.
- Evidence-based practice and strong clinical assessment skills.
- Experience with wound care and medication administration.
- Excellent communication with patients, families, and colleagues.
- Commitment to continuous professional development.`;

const FINANCE = `Management Accountant

We are recruiting a Management Accountant to join our finance team and own the monthly reporting cycle.

What you will do
- Own month-end close, producing management accounts and variance analysis.
- Prepare financial reporting in line with IFRS and support the annual audit.
- Manage accounts payable, accounts receivable, and general ledger reconciliation.
- Lead budgeting and forecasting, and report on cash flow and working capital.
- Strengthen internal controls and support compliance and risk management.
- Business partner with department heads on cost control and budget management.

What we look for
- ACCA, CIMA, or CPA qualified, or finalist.
- Strong financial analysis and financial modelling skills.
- Advanced Excel; experience with SAP, Oracle, or NetSuite.
- High attention to detail and the ability to meet reporting deadlines.
- Clear communication with non-finance stakeholders.`;

const TEACHING = `Secondary Teacher of Mathematics

We are looking for a Teacher of Mathematics to join our secondary school from September.

What you will do
- Deliver lesson planning and curriculum development across key stage 3 and 4, including GCSE.
- Use formative assessment and summative assessment, marking, and feedback to raise attainment.
- Maintain strong classroom management and behaviour management.
- Drive student engagement through differentiation and inclusive education.
- Support pastoral care and uphold safeguarding responsibilities.
- Communicate with parents and contribute to schemes of work.

What we look for
- QTS, with a PGCE desirable.
- Experience teaching mathematics to GCSE level.
- Understanding of special educational needs and how to support them.
- Commitment to CPD and to raising standards.
- Strong communication and time management.`;

const OPERATIONS = `Warehouse Supervisor

We are hiring a Warehouse Supervisor to lead the day shift at our regional distribution centre.

What you will do
- Oversee inventory management and stock control across the site.
- Lead and develop a team of 20, covering scheduling, training, and performance management.
- Own health and safety compliance, including risk assessment and reporting.
- Drive process improvement using lean, kaizen, and 5S.
- Manage capacity planning and hit fulfilment and distribution targets.
- Work with procurement and vendor management on supplier performance.

What we look for
- Experience supervising a warehouse or logistics operation.
- Confident with WMS and ERP systems.
- Strong problem solving and root cause analysis.
- Track record of cost reduction and continuous improvement.
- Clear communication and stakeholder management.`;

export const SAMPLE_JOBS: SampleJob[] = [
  { id: 'design', label: 'Product design', text: DESIGN },
  { id: 'software', label: 'Software engineering', text: SOFTWARE },
  { id: 'nursing', label: 'Nursing', text: NURSING },
  { id: 'finance', label: 'Accounting', text: FINANCE },
  { id: 'teaching', label: 'Teaching', text: TEACHING },
  { id: 'operations', label: 'Warehouse operations', text: OPERATIONS },
];

/** Kept as the default and used by the tests. */
export const SAMPLE_JOB_DESCRIPTION = DESIGN;
