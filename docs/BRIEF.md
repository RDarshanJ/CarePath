# CarePath — Full-Stack AI-Assisted Digital Healthcare Platform

## Your role

Act as a cross-functional founding product team consisting of:

- Senior HealthTech Product Manager
- Principal Product Designer
- UX Researcher specializing in healthcare
- Staff Software Engineer
- Healthcare Interoperability Engineer
- AI Engineer
- Accessibility Specialist
- QA Engineer
- DevOps Engineer

You are responsible for researching, designing, architecting, implementing, testing and documenting a complete working healthcare software product called CarePath.

Treat this as a real startup preparing a high-quality product demonstration, not a hackathon, generic dashboard, landing page or superficial portfolio concept.

The final product must demonstrate the capabilities expected from software engineers and product designers working at leading healthcare technology companies.

## 1. Product vision

CarePath is an AI-assisted digital rehabilitation and remote care management platform connecting patients, physical therapists, healthcare coaches and clinic administrators.

It helps patients follow clinician-assigned treatment plans while enabling healthcare professionals to monitor progress, review patient-reported outcomes, manage schedules and identify patients who need attention.

The product must connect the entire care lifecycle:

Patient enrollment → Intake → Clinician assessment → Care plan assignment → Guided exercise → Progress tracking → Clinician review → Follow-up care.

CarePath is an independent portfolio product using synthetic patient data. It is not affiliated with any existing healthcare company and is not intended for clinical use.

## 2. Mandatory research before implementation

Do not immediately begin generating screens or writing UI code.

First conduct structured product, industry, technical and UX research using available browsing tools and integrations.

### Competitor research

Study the actual products, public documentation, app screenshots, product demonstrations and available case studies from:

- Hinge Health
- Sword Health
- SPRY
- Omada Health
- Maven Clinic
- MedBridge
- PhysiApp
- WebPT
- Headway
- Zocdoc
- Abridge
- Commure
- Medplum

Investigate patient-facing applications and provider-facing software separately.

For each relevant competitor document:

- Product positioning
- Target users
- Core functionality
- Business and user problems
- Patient onboarding
- Clinical workflows
- Appointment scheduling
- Treatment plan management
- Patient engagement
- Remote monitoring
- AI functionality
- Privacy and trust interactions
- Navigation architecture
- Visual design
- Accessibility considerations
- Potential product gaps

Do not fabricate competitor features. Cite exact sources and distinguish observed facts from assumptions.

Review relevant job descriptions from Hinge Health, SPRY, Abridge, Commure, Headway, Sword Health and similar healthcare companies.

Use their engineering and product design requirements to ensure the project demonstrates commercially relevant skills.

### Mobbin research

Use the Mobbin integration or authenticated browser access where available.

Research complete mobile and desktop flows, not isolated attractive screenshots.

Search for relevant references from:

- One Medical
- Apple Health
- Fitbit
- Oura
- WHOOP
- Headspace
- Calm
- MyChart
- Zocdoc
- Flo
- Nike Training Club
- Strava
- Accessible healthcare and enterprise products

Only claim that an application was inspected if it is actually accessible.

Research at least the following patterns:

1. Account creation and authentication
2. Progressive onboarding
3. Medical questionnaires
4. Consent and permissions
5. Goal setting
6. Daily home dashboards
7. Guided activity experiences
8. Pain and symptom logging
9. Progress visualization
10. Appointment booking
11. Calendar management
12. Messaging
13. Patient profiles
14. Data tables
15. Advanced filters
16. Administrative work queues
17. Notifications
18. AI-generated content review
19. Error recovery
20. Empty and loading states

For each pattern, document the reference product, observed behavior, usability strengths, limitations and how the pattern should influence CarePath.

Do not copy any competitor's complete interface, branding, screenshots or proprietary illustrations.

If Mobbin is inaccessible, state this limitation and use publicly accessible product demonstrations and official screenshots instead.

### Healthcare standards research

Consult primary sources for:

- HL7 FHIR R4
- SMART on FHIR
- OAuth 2.0
- US Core implementation guidance
- HHS HIPAA security and privacy guidance
- WCAG 2.2 AA
- OWASP application security guidance
- Synthea synthetic healthcare records

Create a practical understanding of:

- Patient and clinician identities
- Healthcare consent
- Protected health information
- Encounter records
- Care plans
- Observations
- Appointments
- Clinical notes
- Audit logs
- Role-based permissions

Do not claim that implementing selected security controls makes CarePath HIPAA compliant.

### Research deliverables

Before finalizing the architecture, create:

- docs/research/competitor-analysis.md
- docs/research/mobbin-patterns.md
- docs/research/healthcare-domain.md
- docs/research/job-market-alignment.md
- docs/research/product-opportunities.md
- docs/product/prd.md

Include citations and access dates.

Use findings from the research to revise the proposed requirements when appropriate. Document substantive changes and reasons.

## 3. Product users

### Patient

Individuals receiving clinician-assigned rehabilitation plans.

Their goals include understanding what to do today, completing assigned activities, reporting symptoms, tracking progress and communicating with their care team.

The product must support people with different levels of technical confidence, mobility, vision and health literacy.

### Physical therapist

Healthcare professionals managing multiple patients.

Their goals include reviewing patient progress, creating treatment plans, monitoring engagement, documenting encounters and determining which patients need attention.

### Care coordinator and administrator

Staff responsible for enrollment, clinician assignments, appointments, administrative operations and organizational reporting.

Implement three genuinely distinct role experiences rather than presenting the same dashboard with different labels.

## 4. Patient mobile experience

Build a complete responsive patient application with mobile-first interaction design and installable PWA support.

### Onboarding

Create a progressive onboarding experience covering:

- Account creation
- Demo eligibility verification
- Personal information
- Primary rehabilitation goal
- Relevant body area
- Patient-reported pain levels
- Activity limitations
- Existing clinician preferences
- Appointment availability
- Consent
- Review and confirmation

Provide back navigation, progress indicators, autosave, field validation and an option to resume incomplete onboarding.

Do not make medical diagnoses based on onboarding answers.

### Today dashboard

The home experience should prioritize what the patient needs to do today.

Include:

- Personalized greeting
- Current care plan
- Today's assigned exercises
- Upcoming appointments
- Daily check-in
- Weekly activity progress
- Care-team messages
- Contextual reminders

Avoid presenting every item as an equally weighted card.

Create a clear primary action, secondary actions and useful contextual information.

### Guided exercise experience

Build an actual interactive exercise-session flow using fictional, preassigned demonstration activities.

Include:

- Exercise overview
- Clinician-authored instructions
- Illustration or video reference
- Assigned repetitions and duration
- Exercise progression
- Rest timer
- Pause and resume
- Skip activity
- Report discomfort
- Session completion
- Post-session check-in

Persist progress so interrupted sessions can resume correctly.

Never generate unsupervised medical treatment recommendations.

### Optional experimental motion tracking

After the core experience works, evaluate MediaPipe Pose Landmarker or an equivalent computer vision library.

Build an optional local-camera demonstration that:

- Requests camera permission explicitly
- Tracks body landmarks locally
- Displays a skeleton overlay
- Shows tracking confidence
- Handles poor lighting and partial visibility
- Supports experimental repetition counting
- Allows a manual alternative

Do not claim that this system clinically evaluates exercise correctness or prevents injuries.

Do not upload or retain camera footage by default.

### Progress

Build understandable visualizations for:

- Completed sessions
- Assigned versus completed activities
- Weekly engagement
- Patient-reported pain trends
- Functional goals
- Treatment milestones
- Appointment history

Clearly label patient-reported information.

Avoid implying clinical improvement merely because someone used the application more frequently.

### Appointments

Implement a working scheduling system with:

- Clinician profiles
- Available appointment slots
- Appointment type
- Time-zone-aware booking
- Confirmation
- Rescheduling
- Cancellation
- Upcoming appointment reminders
- Duplicate-booking prevention

Include actual server-side availability verification.

### Care team and messaging

Provide:

- Assigned physical therapist
- Care coordinator
- Conversation list
- Message composer
- Unread states
- Message history
- Delivery and failure states
- Clear expectations around response times

Use synthetic messages and demo accounts.

Make clear that messaging is not monitored for emergencies.

## 5. Clinician desktop workspace

Design and implement a sophisticated desktop application for physical therapists.

This workspace is equally important as the patient application.

### Clinical overview

Create an actionable workspace showing:

- Today's appointments
- Assigned patients
- Recent patient check-ins
- Unreviewed progress reports
- Patients with missed activities
- Messages needing responses
- Care plan updates
- Review queue

Design around clinician decisions instead of decorative analytics.

### Patient directory

Implement a functional data table supporting:

- Search
- Sorting
- Pagination
- Advanced filtering
- Patient status
- Assigned clinician
- Last activity
- Upcoming appointments
- Care plan stage

Include saved filters if practical.

### Patient record

Create a comprehensive patient record with:

- Patient overview
- Medical-history demonstration data
- Care goals
- Treatment plan
- Clinical encounter history
- Patient-reported outcomes
- Activity history
- Appointments
- Messages
- Clinical notes
- Audit history

Use a strong information hierarchy and contextual navigation.

Provide a longitudinal timeline of important care events.

### Care plan builder

Create a working plan editor supporting:

- Exercise library
- Search and filtering
- Activity assignment
- Repetitions and duration
- Weekly schedules
- Treatment goals
- Clinician instructions
- Draft and published states
- Plan revisions
- Version history

When a clinician publishes an updated plan, the patient application must reflect the changes.

Do not implement this as a static mockup.

### Review and intervention queue

Create a prioritized review queue using transparent, configurable administrative rules.

Examples:

- Patient-reported discomfort
- Missed assigned sessions
- Unreviewed check-ins
- Upcoming follow-up appointments
- Missing intake information

Explain why each item appears.

This queue must support human review and must not claim to provide validated clinical risk prediction.

### Clinical documentation

Implement:

- Structured encounter notes
- SOAP note template
- Draft editing
- Save and resume
- Clinician review
- Finalization
- Version history

Use fictional clinical encounters only.

## 6. AI intelligence layer

AI must support a clear healthcare workflow rather than acting as a generic chatbot.

### Patient progress summaries

Generate clinician-facing summaries using:

- Completed activities
- Patient-reported outcomes
- Recent messages
- Appointment history
- Current care plan

Generate structured outputs containing:

- Summary
- Important reported changes
- Engagement observations
- Missing information
- Source references
- Items requiring clinician review

Every generated factual statement should be traceable to available source data where possible.

### Clinical note assistance

Using synthetic encounter transcripts, generate a draft structured note.

Support:

- Source-linked statements
- Editable sections
- Evidence inspection
- Missing-information indicators
- Unsupported-statement warnings
- Regeneration
- Approval and rejection
- Version history

AI-generated content must not automatically become a finalized clinical record.

### Patient navigation assistant

Allow patients to ask administrative questions such as:

- How do I reschedule an appointment?
- Where is my current care plan?
- How can I contact my clinician?
- Where can I see completed activities?

Use approved application documentation and assigned care-plan information.

Do not diagnose conditions, prescribe treatment, change exercise instructions or generate personalized medical advice.

### AI implementation

Use a server-side LLM provider abstraction with:

- Structured JSON outputs
- Schema validation
- Prompt versioning
- Timeout handling
- Retry logic
- Rate limiting
- Cost tracking
- Failure recovery
- Prompt-injection defenses
- Human approval
- Evaluation datasets

Provide a deterministic local demo provider so the application remains usable without a paid API key.

Do not misrepresent simulated AI results as live model outputs.

## 7. Clinic administration

Implement a focused administrative workspace with:

- Patient enrollment management
- Clinician assignment
- Clinician availability
- Appointment operations
- Organization management
- Role and permission management
- Operational analytics
- Audit-event inspection

Administrative metrics should include:

- Enrollment completion
- Appointment utilization
- Appointment cancellations
- Care plan activation
- Activity completion
- Pending review items

Metrics must be computed from persisted data instead of hardcoded chart values.

## 8. Design direction

The product must have a recognizable, professionally art-directed visual identity.

Avoid AI-generated SaaS aesthetics.

Specifically avoid:

- Excessive gradients
- Unnecessary glassmorphism
- Purple accent colors without purpose
- Generic glowing AI icons
- Huge rounded cards everywhere
- Excessive shadows
- Decorative dashboard widgets
- Repetitive layouts
- Placeholder text
- Random icons
- Emojis as product navigation
- Unnecessary animations
- Inconsistent spacing
- Generic stock photography

### Patient design language

Create a warm, approachable healthcare experience with:

- Soft neutral backgrounds
- Deep forest-green or teal accents
- High-contrast typography
- Comfortable touch targets
- Meaningful illustrations
- Clear instructions
- Calm transitions
- Human and reassuring copy

Support older adults and users with limited technical confidence.

### Clinician design language

Create a professional clinical workspace with:

- Efficient information density
- Clear table hierarchy
- Contextual patient navigation
- Distinct clinical and administrative statuses
- Compact but readable typography
- Keyboard-first interactions
- Useful comparison charts
- Accessible data visualization
- Minimal visual noise

Use a coherent shared design system while adapting density and interaction patterns to the audience.

### Design system

Build semantic tokens for:

- Background and foreground
- Surface hierarchy
- Primary actions
- Secondary actions
- Borders
- Focus indicators
- Success
- Warning
- Error
- Informational states
- Typography
- Spacing
- Radius
- Elevation
- Motion

Build reusable components for:

- Buttons
- Inputs
- Selects
- Comboboxes
- Forms
- Step indicators
- Navigation
- Tabs
- Dialogs
- Drawers
- Tables
- Filters
- Tooltips
- Date pickers
- Calendars
- Charts
- Patient cards
- Appointment cards
- Exercise cards
- Clinical status indicators
- AI review panels
- Audit timelines

Document component anatomy, variants, states, accessibility and usage guidance.

Use Radix UI primitives where appropriate, but customize styling extensively. The application must not look like an unmodified shadcn template.

## 9. Magnific asset generation

Use the available Magnific integration or approved image-generation workflow for original assets wherever visual assets materially improve the experience.

Create a consistent art direction before generating individual assets.

Generate:

- Rehabilitation lifestyle photography
- Fictional patient and clinician portraits
- Exercise-category illustrations
- Body-area illustrations
- Onboarding artwork
- Empty-state illustrations
- Exercise thumbnails
- Product marketing imagery

Represent different ages, body types and mobility levels naturally.

Do not use identifiable real patients or imply that fictional people endorse the product.

Exercise illustrations must not be treated as medically verified instructions. Use clinician-provided or appropriately licensed instruction material where required.

Optimize assets into WebP or AVIF.

Store an asset manifest containing prompts, usage, licensing information where applicable, dimensions and filenames.

Do not use generated images merely to fill empty space.

## 10. Engineering architecture

Build a maintainable TypeScript-first monorepo.

Recommended stack:

### Frontend

- Next.js with App Router
- React
- TypeScript with strict mode
- Tailwind CSS
- Radix UI
- TanStack Query
- TanStack Table
- React Hook Form
- Zod
- Recharts or another accessible charting library
- Storybook

### Backend

- Node.js with NestJS or an equivalent structured framework
- PostgreSQL
- Prisma ORM
- Redis
- BullMQ for background jobs
- OpenAPI documentation
- WebSockets or server-sent events where justified

### AI service

- Python
- FastAPI
- Pydantic
- Configurable LLM provider
- Structured outputs
- Evaluation scripts

### Infrastructure

- pnpm workspaces
- Turborepo
- Docker Compose
- GitHub Actions
- Environment configuration
- Structured logging
- Error reporting
- Health-check endpoints

Suggested repository structure:

apps/patient

apps/clinician

apps/admin

apps/api

services/ai

packages/ui

packages/database

packages/fhir

packages/auth

packages/config

packages/testing

docs

tests

Choose the simplest architecture that meets the requirements.

Prefer a modular monolith over unnecessary distributed microservices.

Document major technical decisions and trade-offs.

## 11. Database and domain models

Implement relational models for:

- User
- Organization
- OrganizationMembership
- Role
- Patient
- Practitioner
- CareTeam
- Consent
- IntakeAssessment
- CarePlan
- CarePlanVersion
- Exercise
- ExerciseAssignment
- ExerciseSession
- PatientCheckIn
- Observation
- Goal
- Appointment
- AvailabilitySlot
- Encounter
- ClinicalNote
- Conversation
- Message
- Notification
- ReviewTask
- AIGeneration
- AIReview
- AuditEvent

Implement appropriate:

- Primary and foreign keys
- Unique constraints
- Indexes
- Transactions
- Data integrity checks
- Status transitions
- Organization boundaries
- UTC timestamps
- Version history

Generate entity relationship diagrams and document important domain relationships.

## 12. Healthcare interoperability

Implement a meaningful FHIR R4 integration exercise.

Support relevant resource mappings for:

- Patient
- Practitioner
- Organization
- CarePlan
- Observation
- Condition
- Goal
- Appointment
- Encounter
- DocumentReference

Create adapters between internal domain models and FHIR resources.

Implement:

- FHIR JSON export
- FHIR Bundle generation
- Resource-reference validation
- Import validation
- Error reporting
- Duplicate detection
- Sandbox integration where accessible

Use Medplum or another suitable FHIR sandbox if practical.

Use Synthea to generate synthetic patient records.

Do not claim production EHR integration unless one has actually been implemented and verified.

## 13. API development

Create real API endpoints for:

- Authentication
- Patient onboarding
- Patient management
- Care plan creation and updates
- Exercise assignment
- Session tracking
- Patient observations
- Appointment availability
- Booking and cancellation
- Messaging
- Notifications
- Review tasks
- AI summary generation
- Clinical note review
- FHIR import and export
- Administrative reporting
- Audit-event inspection

Use:

- Request validation
- Typed responses
- Consistent error structures
- Pagination
- Authentication
- Server-side authorization
- Rate limits
- OpenAPI documentation

Avoid returning success responses for failed or unimplemented operations.

## 14. Privacy and security

Treat privacy and security as functional product requirements.

Implement:

- Secure session management
- Role-based access control
- Organization-level data isolation
- Authorization on every protected endpoint
- Protection against insecure direct object references
- Input validation
- CSRF protection where relevant
- Appropriate CORS configuration
- Secrets management
- Rate limiting
- Sensitive-field redaction
- Audit logging
- Encryption in transit for deployed services
- Appropriate storage security

Prevent sensitive medical information from entering application logs, analytics services or external AI providers.

Use entirely synthetic data in public demos.

Create a threat model documenting security boundaries, attack scenarios and mitigations.

Do not display unsupported HIPAA-compliance or clinical-certification claims.

## 15. End-to-end scenarios

The following scenarios must be genuinely functional.

### Scenario A: New patient enrollment

A patient creates an account, completes intake and becomes available for clinician assignment.

### Scenario B: Clinician assigns a treatment plan

A clinician opens the patient record, creates a plan, assigns fictional exercises and publishes it.

The patient can immediately access the assigned plan.

### Scenario C: Exercise completion

A patient completes an assigned session, reports their experience and sees updated progress.

The clinician can view the same data.

### Scenario D: Patient requires review

A patient submits a check-in matching a configured review rule.

A review task appears in the clinician workspace with its explanation and source information.

### Scenario E: Appointment booking

A patient schedules an available appointment.

The system prevents conflicting appointments and updates both patient and clinician calendars.

### Scenario F: AI-supported progress review

A clinician requests a summary, inspects source information, edits the draft and approves it.

The system records the AI generation and final review in audit history.

### Scenario G: FHIR export

An authorized user exports a synthetic patient record as a valid FHIR Bundle.

### Scenario H: Administrative operations

An administrator assigns clinicians, updates availability and reviews computed operational metrics.

### Scenario I: Access-control failure

An unauthorized account attempts to access another organization's patient record.

The request is denied, and an appropriate security event is recorded.

## 16. Accessibility

Target WCAG 2.2 AA throughout the product.

Implement and evaluate:

- Color contrast
- Semantic HTML
- Keyboard navigation
- Focus visibility
- Accessible form labels
- Error announcements
- Screen-reader support
- Accessible dialogs
- Reduced motion
- Touch target sizing
- Responsive text scaling
- Chart accessibility
- Appropriate reading order

Run automated accessibility checks with axe-core.

Also perform manual keyboard and interaction reviews.

Do not equate passing automated checks with full accessibility compliance.

## 17. Testing and performance

Build meaningful automated tests using:

- Vitest or Jest
- React Testing Library
- Playwright
- API integration testing
- Accessibility tests
- k6 or equivalent load testing

Test:

- Authentication
- Role permissions
- Organization isolation
- Patient enrollment
- Care plan publishing
- Session completion
- Concurrent appointment booking
- AI output validation
- FHIR conversion
- Background job retry
- Error recovery
- Database integrity

Evaluate desktop and mobile layouts using actual rendered browser screenshots.

Fix visual defects, broken interactions and accessibility issues before considering a feature complete.

## 18. Synthetic demonstration data

Create rich, believable fictional data.

Initial target:

- 1,000 synthetic patients
- 30 synthetic clinicians
- 5 clinics
- 3 administrative roles
- 50 fictional exercise-library entries
- 2,000 appointment records
- 10,000 activity records
- 50 synthetic clinical encounters
- Varied patient journeys over 90 days

Use a deterministic seed so results can be reproduced.

Include sparse records, incomplete intake, cancelled appointments, inactive patients, failed jobs and other realistic edge cases.

These are development targets, not claims about real patients or customers.

## 19. Measurable engineering outcomes

Measure actual project performance.

Collect:

- Number of functioning API endpoints
- Number of completed product workflows
- Number of reusable documented components
- Automated test results
- Test coverage
- API p50 and p95 response latency
- Concurrent booking test results
- FHIR validation results
- AI structured-output validity
- AI unsupported-statement rate
- Accessibility audit results
- Build size and frontend performance

Use initial targets such as:

- 30+ functioning API endpoints
- 25+ meaningful end-to-end tests
- 80% core business-logic test coverage
- 10 supported FHIR resource mappings
- 100% prevention of conflicting bookings in defined concurrency tests
- 50 synthetic encounters for AI evaluation

Do not fabricate measured results or report targets as completed outcomes.

Document the test environment, methodology, results and limitations.

Save benchmark reports in docs/evaluation.

## 20. Product design case study

Document the product design process as a real portfolio case study.

Include:

- Problem statement
- Research findings
- Competitor analysis
- User assumptions
- User journeys
- Service blueprint
- Information architecture
- Prioritization
- Early design explorations
- Interaction design decisions
- Design system
- Final screens
- Accessibility decisions
- Engineering collaboration decisions
- Usability testing methodology
- Iterations
- Results
- Limitations
- Future opportunities

Prepare usability test scenarios for both patients and clinicians.

Distinguish simulated personas from interviews with actual participants.

Do not fabricate interview quotes, research participants or usability results.

## 21. Software engineering case study

Create a separate engineering-oriented technical case study.

Include:

- Product requirements
- System architecture
- Database design
- API architecture
- Authentication and authorization
- Organization isolation
- FHIR integration
- Concurrency handling
- Background processing
- AI architecture and evaluation
- Data privacy decisions
- Automated testing
- CI/CD
- Performance benchmarks
- Engineering trade-offs
- Known limitations

Include architecture diagrams, API examples and reproducible local development instructions.

## 22. Deployment and demo experience

Provide:

- Working local development setup
- Docker Compose configuration
- Database migrations
- Seed scripts
- Environment variable template
- Production build configuration
- CI/CD workflow
- Deployment documentation

Create fictional demonstration accounts for:

- Patient
- Clinician
- Administrator

For a public demo, provide an explicit demo-mode entry point.

Make role switching easy for recruiters while preserving meaningful role authorization.

Create a polished product landing page only after the core application works.

The landing page should link directly to the actual product experiences and provide a concise product overview.

Do not use the landing page as a substitute for building the product.

## 23. Implementation sequence

### Phase 1 — Research and product definition

Complete competitor research, Mobbin analysis, healthcare standards research, requirements and feature prioritization.

### Phase 2 — Architecture and foundation

Set up the monorepo, database, authentication, permissions, API architecture, shared UI and initial design tokens.

### Phase 3 — Core vertical slice

Build one connected journey:

Patient onboarding → Clinician assignment → Care plan creation → Patient session completion → Clinician progress review.

Make this fully functional before expanding scope.

### Phase 4 — Scheduling and communication

Implement appointment availability, booking, notifications and messaging.

### Phase 5 — AI and healthcare data

Implement evidence-linked AI summaries, review workflows, FHIR mapping and synthetic record import.

### Phase 6 — Administration

Implement clinic operations, permissions management, operational analytics and audit history.

### Phase 7 — Visual refinement

Review actual browser renders against Mobbin research and the design-system principles.

Improve layouts, typography, interactions, responsiveness, accessibility and assets.

### Phase 8 — Testing and documentation

Run automated tests, performance benchmarks, accessibility checks and AI evaluation.

Document actual results and prepare both portfolio case studies.

### Phase 9 — Optional motion tracking

Only after all mandatory workflows operate correctly, implement and evaluate the experimental camera-based exercise interaction.

## 24. Working instructions

Inspect the existing repository before making changes.

If no repository exists, initialize the project appropriately.

Create a CLAUDE.md file containing architecture rules, design principles, testing commands, product constraints and documentation conventions.

Maintain a progress document with completed tasks, outstanding work and blockers.

Use available specialized agents for research, design systems, accessibility, backend development and testing where beneficial.

Do not spend the entire session producing a theoretical plan.

After the research and foundational design decisions, start implementing the application and continue through working vertical slices.

Do not mark a feature complete until its data, interactions and relevant tests work.

Avoid dead buttons, fake charts, hardcoded interactions and placeholder functionality.

When external integrations are unavailable, implement a clearly labeled local abstraction and document the limitation.

Make reasonable implementation decisions independently and record meaningful trade-offs.

Ask for clarification only when a missing credential, permission, destructive operation or consequential product decision blocks progress.

## 25. Definition of done

CarePath is complete when:

- All three role experiences work.
- The patient and clinician applications share real persisted data.
- Core workflows work end to end.
- Scheduling prevents conflicting reservations.
- Care plans can be created, published and completed.
- AI summaries support evidence inspection and human approval.
- FHIR exports pass defined validation.
- Authorization prevents cross-role and cross-organization access.
- Tests and accessibility checks have been executed.
- Performance results have been measured.
- The UI is polished and responsive.
- Synthetic data is clearly identified.
- The repository can be run by another developer.
- Both portfolio case studies are documented.
- All unsupported clinical, compliance and performance claims are excluded.

At completion, provide:

1. Working application and repository.
2. Local setup instructions.
3. Deployment instructions and available live URLs.
4. Demo credentials.
5. Research documentation.
6. Architecture and database diagrams.
7. Design-system documentation.
8. Test and benchmark reports.
9. Product design case study.
10. Software engineering case study.
11. Resume-ready accomplishments derived exclusively from completed, measured work.

Start with the research phase now, then proceed into implementation.