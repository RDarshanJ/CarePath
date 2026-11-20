# CarePath Job Market Alignment

Access date for every source: 2026-11-19. Postings were read through a fetch tool and paraphrased; none is quoted. Several postings state they are closed; they are still useful as evidence of recurring requirements but may not be currently open.

## Sample and limits

| Company | Posting | URL | Status noted |
|---|---|---|---|
| Hinge Health | Sr. Product Designer, New Programs (GI) | https://jobs.dukecapitalpartners.duke.edu/companies/hinge-health/jobs/82070978-sr-product-designer-new-programs | not stated |
| Hinge Health | Staff Product Designer, Design Systems | https://jobs.dukecapitalpartners.duke.edu/companies/hinge-health/jobs/81823935-staff-product-designer-design-systems | closed |
| Hinge Health | Sr. Software Engineer, GI | https://jobs.dukecapitalpartners.duke.edu/companies/hinge-health/jobs/89121981-sr-software-engineer-gi | closed |
| Hinge Health | Software Engineer II, Fullstack | https://careers.hingehealth.com/jobs/2098?lang=en-us | not stated |
| Abridge | Senior Product Designer | https://weloveproduct.nuxt.dev/jobs/senior-product-designer-abridge-u7r3sz | job aggregator copy |
| Abridge | Software Engineer, Full Stack (Staff/Senior) | https://jobs.pillar.vc/companies/abridge/jobs/37917232-software-engineer-full-stack-staff-senior | not stated |
| Commure | Product Designer (Ambient AI) | https://jobs.generalcatalyst.com/companies/commure/jobs/71008476-product-designer | not stated |
| Commure | Senior Fullstack Engineer, Ambient AI | https://jobs.generalcatalyst.com/companies/commure/jobs/62591826-senior-fullstack-engineer-applied-ai | not stated |
| Headway | Staff Product Designer, Group Practices | https://job-boards.greenhouse.io/headway/jobs/5844461004 | not stated |
| Sword Health | Expert Product Designer, Web | https://jobs.khoslaventures.com/companies/sword-health/jobs/80420420-expert-product-designer-web | closed |
| Sword Health | Senior Frontend Engineer | https://jobs.generalcatalyst.com/companies/sword-health/jobs/70176529-senior-frontend-engineer | not stated |
| Zocdoc | Principal Product Designer, Design Systems/Technologist | https://jobs.khoslaventures.com/companies/zocdoc-3/jobs/47515830-principal-product-designer-design-systems-technologist | closed |
| Medplum | Frontend Engineer | https://www.medplum.com/careers/frontend-engineer | not stated |

Limits:
- SPRY: no postings found. The board I found said it lists no open roles (https://jobs.flourishventures.com/companies/spry-3-dcd6cb62-0f75-499a-b2ed-651ea7574272). Search for "SPRY" returned a different company (Sprinter Health) and was discarded.
- Most postings are senior or staff level (roughly 3 to 8+ years). CarePath cannot prove years of experience, only skills and craft.
- Aggregator pages may differ from the original posting. Sample size is 13 postings, so counts below are indicative, not statistical.

## Recurring requirements

Counts are from the 13 postings above (D = design, E = engineering).

| Skill / requirement | Count | Where observed |
|---|---|---|
| Design system work (tokens, components, governance) | 6 of 7 D | Hinge Staff DS, Hinge GI designer (scalable systems), Commure, Sword, Zocdoc, Headway |
| Figma and fast prototyping | 5 of 7 D | Abridge (expert Figma), Commure, Sword, Headway, Zocdoc (code prototyping) |
| AI-assisted design/build tools (Claude Code, Cursor, MCPs) | 4 of 7 D, 2 of 6 E | Hinge DS, Headway, Sword, Commure (design); Hinge Sr SWE (AI dev tools), Hinge SWE GI (integrate AI) |
| Designing human + AI experiences, judgment about safe AI in healthcare | 4 of 7 D | Hinge GI, Sword, Commure, Abridge (clinician workflow) |
| Accessibility (WCAG, inclusive design) | 4 of 13 | Hinge GI designer, Sword designer (WCAG), Commure designer, Medplum frontend (preferred); Hinge Sr SWE (improve accessibility), Commure SWE (accessibility quality) |
| Research with users/clinicians, workflow shadowing | 4 of 7 D | Abridge, Commure, Hinge GI, Hinge Sr SWE (feedback loops) |
| Complex multi-role, admin and data-heavy surfaces | 3 of 7 D | Headway (roles/permissions, bulk workflows), Hinge GI (data-heavy), Abridge (clinician plus RCM) |
| End-to-end member journey (enrollment to escalation) | 3 of 7 D | Hinge GI, Sword, Headway |
| Data/analytics, experiments, A/B testing | 4 of 13 | Sword designer, Hinge SWE II, Hinge Sr SWE, Commure SWE (analytics) |
| React and TypeScript | 5 of 6 E | Abridge, Hinge SWE II (React), Hinge Sr SWE (preferred), Sword FE, Medplum |
| Mobile (React Native, Flutter) | 3 of 6 E | Hinge SWE II, Hinge Sr SWE (preferred), Commure (Flutter) |
| Backend services, APIs, data models, Node.js/TypeScript | 5 of 6 E | Abridge, Commure, Hinge SWE II, Sword FE (REST), Hinge Sr SWE |
| Cloud (GCP, AWS) and CI/CD, observability, testing | 5 of 6 E | Abridge (GCP), Hinge SWE II (AWS, trunk-based CI/CD), Hinge Sr SWE (AWS, CI/CD, monitoring), Commure (observability, release readiness) |
| Healthcare compliance (HIPAA, HITRUST, SOC 2) | 4 of 6 E | Hinge SWE II, Hinge Sr SWE (preferred), Commure (preferred), Medplum (preferred) |
| Real-time, offline, sync, async workflows | 1 of 6 E | Commure (offline-first, background sync, real-time pipelines) |
| Cross-functional collaboration with clinical, PM, ML | 9 of 13 | most postings |
| Portfolio showing craft and measurable outcomes | 4 of 7 D | Hinge, Sword, Commure, Abridge |

Interpretation notes:
- [Observed] AI fluency is now stated as an expectation in design postings (Sword defines a minimum level; Headway and Hinge DS name specific tools).
- [Observed] Regulated-environment familiarity is usually "preferred" for engineers, not required.
- [Assumption] Accessibility is named less often than design systems, so a documented WCAG 2.2 AA approach is a differentiator, not just a baseline.

## Mapping to CarePath features

| Requirement | CarePath feature that demonstrates it | Evidence to produce |
|---|---|---|
| Design system with tokens, components, governance | Shared token set and component library across patient app, clinician console and coordinator console; documented contribution rules | Token file, component docs, usage guidelines |
| Figma plus prototyping | Figma file linked to coded prototypes for key flows | Linked frames, interactive build |
| AI-assisted workflow | AI-built with documented prompts, review checkpoints and what was verified by hand | Short process note in decisions log |
| Human + AI experiences, safe AI in healthcare | AI progress summary for clinicians with source links, confidence labels and mandatory sign-off; patient-facing assistant labelled as AI with escalation to a human | Review UI, audit trail of accepted/edited/rejected drafts |
| Accessibility (WCAG 2.2 AA) | Keyboard, screen-reader, text scaling, contrast, no-camera exercise path, reduced motion | Automated and manual test results, conformance notes (not a certification claim) |
| User and clinician research | Research synthesis and persona-driven requirements; synthetic data only | Research docs, PRD revisions with reasons |
| Multi-role, admin and data-heavy surfaces | Roles: patient, PT, coach, coordinator, admin; work queues, filters, bulk assign, panels with tables | Role-permission matrix, queue and table screens |
| End-to-end journey | Enrollment, intake, assessment, care plan, guided exercise, tracking, review, follow-up | Journey map and working flow |
| Data and experiments | Adherence and outcomes analytics views; feature-flag-ready experiment hooks | Dashboard, event schema |
| React and TypeScript | Web app in TypeScript with typed FHIR models | Repo, type coverage |
| Mobile | Responsive PWA or React Native patient app (decision pending in PRD) | Mobile build |
| Backend, APIs, data models | FHIR-aligned REST API: Patient, Practitioner, CarePlan, Appointment, Observation, Task, Consent, AuditEvent | API docs, OpenAPI spec |
| Cloud, CI/CD, observability, tests | CI pipeline, unit/integration/e2e tests, structured logs and health checks | Pipeline config, test report |
| Healthcare compliance awareness | Role-based access, audit log, consent records, encryption in transit and at rest, explicit non-compliance disclaimer | Security notes, threat model |
| Offline/sync | Offline-capable exercise session with sync on reconnect | Demonstrated flow (stretch) |
| Interoperability | SMART on FHIR style launch and OAuth 2.0 for clinician app; Synthea-based synthetic data | Standards research doc |

## Skills coverage priorities (for product scope)

1. Must show: design system, AI-with-human-review pattern, multi-role console, accessibility, FHIR-aligned API, tests and CI.
2. Should show: mobile patient experience, analytics, audit and consent UI.
3. Stretch: offline-first exercise session, real-time updates.
4. Not provable from a portfolio project: years of experience, production scale, certifications. Do not imply them.
