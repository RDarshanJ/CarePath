# CarePath — Research-Led Product Design, UX Strategy and Visual Refinement

## 1. Role and objective

Act as a principal product designer, senior UX researcher, healthcare product manager, design systems architect and senior frontend engineer working together on CarePath.

We are building a commercially credible digital healthcare product, not a conceptual Dribbble design, hackathon project or generic AI-generated SaaS application.

Your responsibility is to research, explore, evaluate, select, design and implement the most appropriate solution for every major user problem.

Do not treat this assignment as merely changing colors, fonts and component styles.

Reconsider the existing experience from the perspective of:

- Patient needs
- Clinician needs
- Administrative needs
- Business objectives
- Healthcare workflows
- Accessibility
- Patient safety
- Privacy and trust
- Technical feasibility
- Long-term product scalability

Preserve existing working functionality unless research establishes a clear reason to change it.

## 2. Mandatory visual direction

The current visual direction must be refined to resemble a modern, professional HealthTech product.

I explicitly do not want cream, beige, ivory, tan, warm off-white or earthy backgrounds.

Avoid:

- Cream and beige page backgrounds
- Muted brown accents
- Generic wellness branding
- Excessive pastel colors
- Oversaturated gradients
- Glassmorphism
- Excessive shadows
- Arbitrarily rounded components
- Large decorative dashboard cards
- Generic purple AI branding
- Excessive use of pills
- Repetitive bento grids
- Unnecessary illustrations
- Unmodified shadcn component styling
- Generic AI-generated dashboard compositions

The desired experience should feel:

- Modern
- Clinically credible
- Calm
- Precise
- Approachable
- Accessible
- Professionally designed
- Technologically advanced without being futuristic
- Appropriate for a real healthcare organization

The interface should be credible enough to demonstrate to a product design team at Hinge Health, Sword Health, SPRY, Abridge or Headway.

## 3. Explore multiple color systems

Do not immediately choose a color palette.

Research how successful healthcare applications use color for brand recognition, patient trust, interface hierarchy, clinical information, feedback and accessibility.

Develop at least three distinct visual directions.

### Direction A — Modern clinical

Explore:

- White: #FFFFFF
- Canvas: #F5F7FA
- Border: #DCE3EB
- Primary blue: #175CD3
- Secondary teal: #0E7490
- Primary text: #172B4D

### Direction B — Contemporary digital care

Explore:

- White: #FFFFFF
- Canvas: #F4F7F8
- Border: #DCE6E9
- Primary teal: #087F8C
- Secondary green: #0D9488
- Primary text: #123047

### Direction C — Enterprise clinical intelligence

Explore:

- White: #FFFFFF
- Canvas: #F6F8FC
- Border: #E2E8F0
- Primary blue: #1D4ED8
- Secondary blue: #0369A1
- Primary text: #0F172A

These are starting points, not mandatory final palettes.

You may develop a stronger direction through research, provided it respects the requirement for white and cool-neutral surfaces.

For each direction, create comparable screen explorations for:

1. Patient home
2. Guided exercise experience
3. Clinician workspace
4. Patient medical record
5. Scheduling
6. AI-assisted clinical review

Use identical content across explorations so the evaluation is meaningful.

Compare each direction against:

- Clinical credibility
- Patient approachability
- Visual distinction
- Readability
- Information hierarchy
- Accessibility
- Suitability for dense enterprise workflows
- Component scalability
- Brand consistency

Choose one primary visual identity based on the findings.

Do not implement a different unrelated brand for each application.

## 4. Build a semantic color system

Do not hardcode random HEX values throughout the codebase.

Develop semantic design tokens for:

- Application canvas
- Primary surface
- Secondary surface
- Elevated surface
- Primary text
- Secondary text
- Muted text
- Disabled text
- Default border
- Strong border
- Primary action
- Primary action hover
- Primary action pressed
- Secondary action
- Selected state
- Focus indicator
- Information
- Success
- Warning
- Error
- Critical attention
- AI-generated content
- Data visualization

Brand colors and semantic clinical statuses must have distinguishable purposes.

Do not use red or green as the only indicator of a clinical or operational status.

Use appropriate labels, symbols and supporting information.

Develop consistent interactive states for every component.

Validate the color combinations against WCAG 2.2 AA, including normal text, large text, meaningful icons, form boundaries and focus indicators.

Consult NHS, CMS Healthcare Design System and W3C accessibility guidance.

Document the contrast ratios for important foreground/background combinations.

## 5. Research the product one problem at a time

Do not perform one broad competitor analysis and then reuse the same design pattern throughout the application.

Every major feature represents a different user problem and requires independent research.

For each feature:

1. Define the actual user problem.
2. Identify the target user and their context.
3. Identify the business objective.
4. Identify functional and technical constraints.
5. Research comparable production experiences.
6. Identify established UX patterns.
7. Generate multiple distinct solutions.
8. Evaluate their advantages and disadvantages.
9. Select the strongest solution.
10. Implement and validate it.

Do not skip from identifying a feature directly to implementing the first design idea.

Research must influence the final product.

## 6. Research sources and tools

Use Mobbin extensively for production interface patterns and complete user flows.

Use available browser tools to investigate:

- Official healthcare product websites
- Product demonstrations
- App Store screenshots
- Google Play screenshots
- Public help documentation
- Product design case studies
- Healthcare design systems
- Research papers where relevant
- Accessibility guidance
- Enterprise software interaction patterns

### Healthcare references

Investigate:

- Hinge Health
- Sword Health
- SPRY
- Omada Health
- Maven Clinic
- One Medical
- MyChart
- MedBridge
- WebPT
- PhysiApp
- Headway
- Zocdoc
- Abridge
- Ambience Healthcare
- Tebra
- Medplum

### Adjacent industry references

Do not restrict research to healthcare.

Useful interaction patterns may exist in:

- Apple Health
- Nike Training Club
- Strava
- Fitbit
- Oura
- WHOOP
- Duolingo
- Headspace
- Google Calendar
- Calendly
- Linear
- Notion
- Stripe Dashboard
- Slack

Inspect these products specifically for the problems they solve well.

For example, a scheduling solution may benefit from calendar products, while a clinician work queue may benefit from enterprise issue-tracking software.

Mobbin research must include actual screen and flow observations, not fabricated descriptions.

If an application is unavailable on Mobbin, use other accessible sources.

Record exact URLs, product names, screen names and access dates.

## 7. Feature-specific UX research and exploration

### A. Authentication and patient onboarding

Research:

- Progressive onboarding
- Account creation
- Healthcare intake forms
- Consent experiences
- Medical history collection
- Long questionnaires
- Save-and-resume flows
- Sensitive questions
- Eligibility verification

Explore at least three approaches:

- Linear step-by-step onboarding
- Modular onboarding checklist
- Adaptive questionnaire with conditional questions

Evaluate them against:

- Completion friction
- Patient anxiety
- Amount of required information
- Error prevention
- Information accuracy
- Clinician data requirements
- Ability to resume incomplete enrollment

Choose the approach that best fits the actual CarePath enrollment requirements.

Do not ask unnecessary questions merely to make onboarding appear sophisticated.

### B. Patient home dashboard

Research how healthcare and fitness applications prioritize daily activities.

Explore:

- Daily task-based home
- Personalized care-plan overview
- Timeline-based daily experience
- Goal-oriented progress dashboard

Determine what a patient should be able to understand within five seconds of opening the application.

Investigate:

- What do I need to do today?
- How much time will it take?
- What is my next appointment?
- How am I progressing?
- How can I contact my care team?

Do not present these with equal hierarchy.

The selected dashboard must support one clear primary action while keeping other important information discoverable.

### C. Guided rehabilitation sessions

Research guided workout, rehabilitation and instructional experiences.

Explore:

- Full-screen activity player
- Step-by-step instructional flow
- Video-led exercise experience
- Interactive checklist
- Camera-assisted experience where appropriate

Consider:

- Mobile device placement during exercise
- Readability from a distance
- Large interaction targets
- Pause and resume
- Repetitions
- Rest periods
- Audio controls
- Reporting discomfort
- Interrupted sessions
- Accessibility alternatives

Select a solution appropriate for patients using the application while physically moving.

Do not prioritize visual flair over practical usability.

### D. Pain and symptom reporting

Research:

- Pain-rating scales
- Body-area selection
- Patient-reported outcome measures
- Daily health check-ins
- Symptom journaling

Explore:

- Numeric scales
- Labeled selection controls
- Body-map interactions
- Progressive questions
- Structured check-ins with optional notes

Distinguish clinical data collection from casual feedback.

Use validated measurement systems only when their use is appropriate and correctly documented.

Do not invent clinically validated scales.

Ensure patients can understand what their responses mean and how the information will be used.

### E. Patient progress

Research Apple Health, Hinge Health, Oura, WHOOP, Strava and comparable products.

Explore:

- Longitudinal line charts
- Calendar-based activity tracking
- Goal-based progress
- Weekly summaries
- Milestone timelines
- Trends with explanatory context

Choose visualization types according to the actual data.

Do not force every metric into a line chart.

Distinguish:

- Activity completion
- Program engagement
- Patient-reported outcomes
- Functional goals
- Clinical assessments

Clearly communicate missing data and measurement limitations.

Do not equate application engagement with medical improvement.

### F. Appointment scheduling

Research healthcare booking products and calendar applications.

Explore:

- Date-first scheduling
- Provider-first scheduling
- Earliest-availability recommendations
- Week calendar
- Guided booking flow

Evaluate:

- Speed of finding a suitable appointment
- Patient flexibility
- Clinician utilization
- Time-zone clarity
- Cancellation and rescheduling
- Booking conflicts
- Availability updates
- Appointment types

Design for the actual constraints of healthcare scheduling, not just an attractive calendar.

### G. Patient-care team communication

Research secure messaging and healthcare communication experiences.

Explore:

- Conversation-based messaging
- Topic-based communication
- Care-team inbox
- Structured requests combined with conversations

Consider:

- Message urgency
- Response-time expectations
- Care-team responsibilities
- Unread messages
- Failed delivery
- Attachments
- Privacy
- Communication history

Do not imply that clinicians are available continuously or that the application provides emergency services.

### H. Clinician workspace

Research actual clinical software and enterprise work-management products.

Explore:

- Schedule-first dashboard
- Patient-centered dashboard
- Action-oriented work queue
- Split-view workspace

Understand the clinician's working day.

Prioritize:

- What requires attention now?
- Which patients have appointments today?
- Which patient records need review?
- What information is missing?
- What tasks must be completed?
- Which actions can be completed without navigating away?

Avoid generic dashboards filled with large cards and superficial business metrics.

Create an efficient working environment.

### I. Patient directory

Research enterprise data tables, patient registries and operational search.

Explore:

- Dense sortable table
- Master-detail layout
- Grouped patient lists
- Prioritized operational queue

Evaluate:

- Search speed
- Information retrieval
- Filtering complexity
- Scanning efficiency
- Context preservation
- Bulk actions
- Row-level actions
- Keyboard navigation

Decide whether the user's task requires a table, a list, cards or a hybrid approach.

Do not use cards for dense structured information simply because they look more attractive.

### J. Patient medical record

Research clinical information architecture and longitudinal health records.

Explore:

- Tab-based record
- Timeline-centered record
- Persistent patient summary with contextual workspace
- Modular record overview

Consider:

- Patient identity visibility
- Care-plan history
- Appointment history
- Patient-reported observations
- Clinical notes
- Relevant medications where applicable
- Missing information
- Record provenance
- Information freshness

Maintain patient context across navigation.

Prevent misleading interpretations of unavailable or outdated information.

### K. Care-plan builder

Research form builders, treatment planning software and complex configuration tools.

Explore:

- Sequential wizard
- Structured single-page builder
- Split-pane exercise library and plan editor
- Template-first workflow

Evaluate:

- Speed of creating a plan
- Reusability
- Editing efficiency
- Version history
- Error prevention
- Flexible clinical workflows
- Visibility of unpublished changes

Select a solution that balances flexibility with efficiency.

Design appropriate draft, published, updated and archived states.

### L. Clinician review queue

Research work queues, issue tracking, exception management and clinical review systems.

Explore:

- Prioritized work list
- Grouped attention categories
- Inbox-style review
- Table with contextual detail panel

Determine how to communicate:

- Why a patient requires review
- Source information
- Review status
- Assigned responsibilities
- Available actions
- Resolution history

Do not rely solely on colored severity labels.

Distinguish administrative review priorities from validated medical risk assessments.

### M. AI-assisted clinical summaries

Research Abridge, Ambience Healthcare and other AI-assisted documentation products.

Explore:

- Inline generated summary
- Side-by-side source and generated output
- Structured review panel
- Section-level editing and approval

Compare approaches for:

- Source verification
- Trust calibration
- Unsupported information
- Editing efficiency
- Missing information
- Human oversight
- Review accountability

AI should be integrated into the actual clinician workflow.

Do not simply add a floating AI assistant or generic chat interface to every page.

Never automatically finalize AI-generated clinical documentation.

### N. Administrative analytics

Research healthcare operations dashboards and enterprise reporting products.

Explore:

- KPI-oriented overview
- Operational funnel
- Drill-down data tables
- Exception-based dashboard
- Comparative reporting

Each metric must support an identifiable administrative decision.

Specify:

- Metric definition
- Data source
- Time period
- Calculation
- Relevant comparison
- Available drill-down actions

Avoid decorative charts and fabricated metrics.

## 8. Evaluate alternatives before selecting a solution

For each major feature, produce at least three meaningfully different interaction approaches.

Do not present the same layout with different colors and call them alternatives.

For every alternative, document:

- User problem addressed
- Interaction model
- Benefits
- Limitations
- Accessibility considerations
- Business implications
- Technical complexity
- Error and recovery behavior
- Evidence supporting the approach

Use a weighted evaluation framework.

Suggested starting weights:

- User task effectiveness: 25%
- Clinical safety, privacy and trust: 20%
- Usability and accessibility: 20%
- Business value: 15%
- Operational efficiency: 10%
- Technical feasibility: 5%
- Design-system consistency: 5%

Adjust these weights for individual features where appropriate.

Accessibility, privacy and essential safety requirements are mandatory gates, not weaknesses that can be offset by a higher business score.

Do not assign arbitrary scores without explaining the evidence.

Distinguish research evidence, expert judgment and untested assumptions.

Select the highest-value eligible solution and explain why it is preferable to competing approaches.

## 9. Business and user requirement alignment

For each feature, establish the relationship between user needs and business value.

Use a framework containing:

- User segment
- Job to be done
- User pain point
- Business objective
- Functional requirement
- Success metric
- Design hypothesis
- Selected interaction pattern
- Technical dependency
- Validation method

Example:

Feature: Patient onboarding

User need: Complete intake without confusion or repeated information entry.

Business objective: Increase the proportion of enrolled patients reaching their first care session.

Possible metrics: Enrollment completion, time to completion, abandonment by step and validation-error frequency.

Do not report an improvement percentage unless it has actually been measured.

Apply this reasoning to every major feature.

Do not use manipulative engagement techniques or hide important patient choices to improve business metrics.

## 10. Visual composition and typography

Research typography and layout systems used by credible healthcare and enterprise software.

Explore suitable typefaces such as:

- Inter
- Geist
- IBM Plex Sans
- Public Sans
- Source Sans 3

Choose based on readability, numeric clarity, interface density, accessibility and brand character.

Avoid mixing many typefaces.

Establish a complete typography scale with defined roles for:

- Page titles
- Section headings
- Component titles
- Body text
- Labels
- Supporting text
- Table content
- Data values
- Clinical notes

Use tabular numerals for comparative numerical data where useful.

Develop spacing, layout and grid systems that adapt to:

- Mobile patients
- Tablet users
- Desktop clinicians
- Administrative workspaces

The patient application should have comfortable spacing and a clear reading hierarchy.

The clinician application should support higher information density without sacrificing readability.

Do not apply identical spacing rules to both contexts.

## 11. Component design

Build a professional shared design system.

Each component must have a defined reason for existing.

Create and document:

- Buttons and button hierarchies
- Inputs and form controls
- Selection controls
- Navigation
- Tabs
- Dialogs
- Drawers
- Tooltips
- Data tables
- Search
- Filters
- Pagination
- Date and time controls
- Clinical status indicators
- Patient identification components
- Progress visualizations
- Appointment components
- AI review components
- Activity instructions
- Notifications
- Error messages
- Loading patterns
- Empty states

For each component document anatomy, variants, size, behavior, accessibility, usage rules and misuse examples.

Do not overuse cards, borders, badges, icons or dividers.

Use whitespace and typography as primary hierarchy tools.

## 12. Magnific and visual assets

Use Magnific where original visual assets meaningfully improve the experience.

Research the required assets before generating them.

Create a consistent photographic and illustration art direction.

Possible assets include:

- Rehabilitation lifestyle photography
- Fictional clinician portraits
- Onboarding illustrations
- Exercise thumbnails
- Body-area diagrams
- Patient education illustrations
- Purposeful empty-state illustrations

Use realistic and diverse people.

Favor natural lighting, clean compositions and appropriate healthcare environments.

Do not generate random 3D illustrations merely to make the application appear modern.

Avoid decorative photography in clinical workspaces where it consumes useful screen space.

Do not present generated medical or exercise imagery as clinically verified instruction.

Optimize all assets and preserve accessibility through appropriate alternative descriptions.

## 13. Interaction and motion design

Use motion only when it improves comprehension.

Consider:

- Navigation transitions
- Activity completion feedback
- Expand and collapse behavior
- Step transitions
- Loading feedback
- Data updates
- Contextual panels
- Confirmation states

Use restrained timing and easing.

Respect reduced-motion preferences.

Avoid excessive entrance animations, parallax, decorative loops, animated gradients and unnecessary hover effects.

Clinical tasks must remain predictable and efficient.

## 14. Edge cases and complete interaction states

For every feature design and implement:

- Default
- Hover
- Focus
- Active
- Selected
- Disabled
- Loading
- Empty
- Partial data
- Validation error
- Server error
- Network loss
- Permission denied
- Success
- Cancellation
- Interrupted workflow
- Stale information
- Unsaved changes

Identify which states are relevant to each feature instead of adding irrelevant states mechanically.

Include realistic microcopy and meaningful recovery actions.

Do not create dead buttons or placeholder interactions.

Adapt existing functional application logic rather than replacing real data with static mockups.

## 15. Responsive design

Evaluate at minimum:

- 375px mobile
- 390px mobile
- 768px tablet
- 1024px small desktop
- 1440px desktop
- 1920px large desktop

Do not simply shrink a desktop dashboard onto mobile.

Determine which information remains visible, moves into contextual panels or requires a different interaction model.

Ensure important patient tasks remain comfortable on small screens.

Ensure clinicians can navigate efficiently across patient records and operational workflows.

## 16. Research documentation

Create a structured documentation system:

- docs/design/research-sources.md
- docs/design/feature-research/
- docs/design/user-business-requirements.md
- docs/design/pattern-library.md
- docs/design/design-alternatives/
- docs/design/decision-records/
- docs/design/color-exploration.md
- docs/design/design-tokens.md
- docs/design/component-guidelines.md
- docs/design/accessibility-audit.md
- docs/design/usability-testing.md
- docs/design/final-design-rationale.md

Every major design decision should have a traceable rationale.

Record observed facts separately from assumptions.

Include rejected alternatives where they demonstrate a meaningful product trade-off.

Do not fabricate research participants, user quotations, usability findings or competitor observations.

## 17. Implementation workflow

Start by inspecting the existing repository and running the application.

Capture baseline screenshots of the actual current experience.

Audit existing screens, components, navigation, design tokens and functional workflows.

Identify:

- Inconsistent colors
- Cream or warm-neutral backgrounds
- Generic layouts
- Unnecessary components
- Weak visual hierarchy
- Accessibility concerns
- Navigation problems
- Incomplete interactions
- Poor responsiveness
- Functional regressions

Then proceed through the following sequence:

Phase 1: Research and audit.

Phase 2: Visual identity exploration.

Phase 3: Feature-specific interaction explorations.

Phase 4: Design decisions and shared design system.

Phase 5: Implement high-priority patient workflows.

Phase 6: Implement clinician workflows.

Phase 7: Refine administrative experiences.

Phase 8: Responsive, accessibility and interaction testing.

Phase 9: Final product polish and documentation.

Do not redesign every screen simultaneously without establishing the visual foundation.

Work in functional vertical slices.

Preserve data models, API contracts, authentication and existing business logic unless a justified change is necessary.

## 18. Browser-based visual refinement

After implementation, open the real application using browser automation.

Capture screenshots of every major workflow.

Review the screenshots as a senior product designer.

Inspect:

- Alignment
- Typography
- Spacing
- Visual hierarchy
- Color consistency
- Button positioning
- Navigation
- Scroll behavior
- Table density
- Form usability
- Responsive layouts
- Data visualization
- Loading and empty states
- Error handling

Compare the actual rendered application against the research findings and selected design principles.

Do not assume that good source code means the interface is visually polished.

Perform at least two visual refinement passes.

Fix detected issues before marking a feature complete.

Run automated accessibility tests and manual keyboard checks.

## 19. Final acceptance criteria

The redesigned CarePath must:

- Use a professional white and cool-neutral color foundation.
- Contain no cream, beige or warm off-white application backgrounds.
- Have a coherent, distinctive HealthTech visual identity.
- Support patient, clinician and administrative requirements.
- Use research-driven interaction patterns.
- Demonstrate multiple evaluated approaches for major UX problems.
- Document why each selected solution serves business and user needs.
- Use a consistent semantic design system.
- Provide working interactions and real persisted application data.
- Include complete relevant interaction states.
- Target WCAG 2.2 AA.
- Support responsive layouts.
- Preserve functioning backend integrations.
- Avoid generic AI-generated interface aesthetics.
- Avoid unsupported clinical, accessibility or compliance claims.

At completion, provide:

1. Research findings for each feature.
2. Visual identity explorations and final palette.
3. Selected UX patterns and rejected alternatives.
4. Decision matrices and supporting rationale.
5. Implemented design system.
6. Updated working application.
7. Before-and-after screenshots.
8. Accessibility and usability findings.
9. Remaining limitations.
10. Portfolio-ready product design case study.

Do not stop after creating design recommendations.

Use the research to make decisions and implement the final product.

Make reasonable decisions independently, document their rationale and ask for clarification only when a consequential unresolved decision or missing permission blocks progress.

Begin with the existing application audit and feature-specific research now.