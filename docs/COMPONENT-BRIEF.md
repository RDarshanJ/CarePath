# CarePath — Component-Level UX Research, Interaction Patterns and Design System

## 1. Objective

Extend our existing research-driven product design process beyond pages, features and user flows.

Research every meaningful UI component, interaction pattern and interface element individually before deciding how to implement it.

We are not building an interface by assembling attractive components from a component library. We are solving specific user and business problems through carefully selected interaction patterns.

Every meaningful element must have a purpose, an appropriate interaction model and a defensible design rationale.

Do not select a component merely because:

- It is available in shadcn or Radix UI.
- It looks visually appealing.
- It is currently popular.
- Another healthcare product uses it.
- It is easier to implement.
- It makes a screenshot look more sophisticated.

Select components based on the actual use case, user behavior, business requirements, accessibility, information density and interaction context.

Maintain the previously established professional HealthTech visual direction. No cream, beige or warm off-white backgrounds.

## 2. Research at six levels

Conduct research at every level of the product experience.

**Level 1 — Product experience**

Overall product positioning, user segments, navigation architecture and healthcare delivery lifecycle.

**Level 2 — User flows**

Onboarding, scheduling, treatment planning, guided rehabilitation, clinical reviews and administrative operations.

**Level 3 — Page composition**

Information hierarchy, layout, density, content grouping, primary actions and secondary actions.

**Level 4 — UX patterns**

Interaction models for searching, filtering, selecting, editing, comparing, confirming, reviewing and navigating.

**Level 5 — Components**

Buttons, inputs, cards, tables, tabs, dialogs, dropdowns, charts, sliders, calendars, progress indicators and other interface components.

**Level 6 — Individual elements**

Labels, icons, descriptions, dividers, indicators, timestamps, helper text, validation messages, tooltips, typography, spacing and interactive states.

Do not assume successful research at one level automatically validates decisions at another level.

## 3. Mandatory research sources

Use Mobbin to inspect actual production components and their surrounding interaction flows.

Search both mobile and desktop references.

Supplement Mobbin research with:

### Healthcare design systems

- NHS Design System: https://service-manual.nhs.uk/design-system
- CMS Design System: https://design.cms.gov/
- Digital Health and Care Wales Single Record Design System: https://github.com/DHCW-Digital-Health-and-Care-Wales/single-record-design-system

### General design systems and component guidance

- Material Design 3: https://m3.material.io/
- Apple Human Interface Guidelines: https://developer.apple.com/design/human-interface-guidelines/
- Carbon Design System: https://carbondesignsystem.com/
- Adobe Spectrum: https://spectrum.adobe.com/
- Atlassian Design System: https://atlassian.design/
- U.S. Web Design System: https://designsystem.digital.gov/
- GOV.UK Design System: https://design-system.service.gov.uk/
- Microsoft Fluent: https://fluent2.microsoft.design/
- Shopify Polaris: https://polaris.shopify.com/

### Usability and accessibility research

- Nielsen Norman Group
- Baymard Institute
- W3C WCAG 2.2
- WAI-ARIA Authoring Practices Guide
- Public healthcare usability studies
- Relevant human-computer interaction research

### Production products

Research suitable patterns from Hinge Health, Sword Health, SPRY, Abridge, Headway, Zocdoc, Apple Health, Oura, WHOOP, Linear, Stripe, Slack, Notion, Calendly and other relevant products.

Do not limit research to healthcare when another industry has solved the same interaction problem more effectively.

Prioritize behavioral evidence and official component guidance over purely aesthetic inspiration from Dribbble or Behance.

Do not fabricate Mobbin observations or claim to have accessed unavailable references.

## 4. Component research methodology

For each meaningful component or interaction pattern, follow this process:

1. Define the specific user task.
2. Identify its location within the user journey.
3. Determine what information the user needs.
4. Identify the action the user wants to perform.
5. Establish business and operational requirements.
6. Identify relevant healthcare constraints.
7. Research at least three relevant production examples where available.
8. Review established design-system guidance.
9. Explore two to four meaningful component alternatives.
10. Evaluate each alternative.
11. Select the most appropriate component.
12. Define its structure, behavior and states.
13. Build and test the component.
14. Evaluate it within the actual workflow.

For high-risk or complex interactions, conduct deeper research and prototype comparisons.

For straightforward elements with well-established conventions, reuse validated patterns rather than creating unnecessary alternatives.

## 5. Inventory every screen before redesigning

Inspect the existing application and create a complete interface inventory.

For each screen identify:

- Page structure
- Navigation elements
- Content sections
- Primary actions
- Secondary actions
- Input controls
- Selection controls
- Interactive components
- Data presentation components
- Feedback mechanisms
- Status indicators
- Visual assets
- Typography elements
- Supporting microcopy
- Accessibility requirements
- Relevant edge cases

Identify components that are inconsistent, duplicated, unnecessary, inaccessible or inappropriate for their use case.

Create a component-to-use-case mapping before starting implementation.

## 6. Navigation pattern research

Independently research and evaluate:

- Sidebar navigation
- Collapsible sidebar
- Navigation rail
- Top navigation
- Mobile bottom navigation
- Tab navigation
- Breadcrumbs
- Contextual navigation
- In-page navigation
- Nested navigation
- Command palettes
- Search-driven navigation
- Back navigation

Determine which navigation patterns are appropriate for patients, clinicians and administrators.

Consider:

- Frequency of switching between sections
- Number of destinations
- Depth of information architecture
- Available screen space
- Discoverability
- One-handed mobile usage
- Keyboard navigation
- Context preservation

Do not use a hamburger menu merely to save space if it hides frequently used patient tasks.

Do not use an oversized enterprise sidebar if the application has only a few destinations.

For clinician patient records, specifically evaluate how to maintain patient identity and context while navigating between record sections.

## 7. Input and form component research

Research and evaluate when to use:

- Text inputs
- Textareas
- Radio buttons
- Checkboxes
- Select menus
- Comboboxes
- Autocomplete
- Searchable dropdowns
- Toggle switches
- Segmented controls
- Selection cards
- Choice chips
- Multi-select controls
- Numeric steppers
- Range sliders
- Date inputs
- Date pickers
- Time pickers
- File upload controls
- Editable tables
- Inline editing
- Structured clinical editors

For each component, determine:

- Number of available options
- Whether one or multiple selections are allowed
- Whether options are familiar to users
- Whether search is required
- Whether exact values matter
- Whether the interaction is reversible
- Whether the selection takes effect immediately
- Whether an explicit save action is required
- Accessibility implications

### Important form decisions

Evaluate separate approaches for entering birth dates versus booking future appointments.

Evaluate searchable selection versus dropdown menus for clinician directories.

Evaluate radio buttons versus selection cards for patient intake questions.

Evaluate checkboxes versus multiselect menus for treatment preferences.

Evaluate numeric entry versus sliders for patient-reported measurements.

Do not use sliders for precise clinical input without appropriate research and validation.

Preserve required clinical scale wording and scoring when implementing an established measurement instrument.

## 8. Buttons and action hierarchy

Research:

- Primary buttons
- Secondary buttons
- Tertiary buttons
- Text buttons
- Icon-only buttons
- Split buttons
- Dropdown action buttons
- Sticky action bars
- Floating action buttons
- Inline actions
- Destructive actions
- Bulk actions

Determine:

- Which action is most important?
- Which actions are frequently used?
- Which actions require confirmation?
- Which actions are reversible?
- Which actions affect clinical records?
- Which actions should remain visible during scrolling?

Do not place multiple equally prominent primary actions in the same context.

Do not hide frequently used actions inside overflow menus merely to make the interface look cleaner.

Use icon-only actions only when they remain understandable, discoverable and accessible.

Research action wording individually.

Use meaningful labels such as Publish care plan, Save draft, Reschedule appointment or Request review instead of generic labels such as Submit, Continue or Confirm when specificity improves clarity.

## 9. Cards, lists, tables and information containers

Research and compare:

- Content cards
- Summary cards
- Selectable cards
- Expandable cards
- Structured lists
- Definition lists
- Data tables
- Data grids
- Master-detail layouts
- Timeline layouts
- Accordions
- Section-based layouts
- Plain content with whitespace

Determine the appropriate container based on information structure and the user task.

### Evaluation examples

Patient exercise library:

- Image-led cards
- Compact activity list
- Category-based grouped list

Clinician patient directory:

- Data table
- Master-detail interface
- Searchable patient list

Upcoming appointments:

- Compact appointment list
- Calendar
- Timeline

Patient record:

- Tabbed sections
- Longitudinal timeline
- Persistent summary and contextual detail

Do not wrap every section in a card.

Do not use a table for information that does not benefit from row-and-column comparison.

Do not use oversized cards for repeated clinical records that require efficient scanning.

Use borders, backgrounds and elevation only where they establish a meaningful relationship or hierarchy.

## 10. Search, filtering and sorting

Research:

- Global search
- Local search
- Autocomplete
- Search suggestions
- Recent searches
- Faceted search
- Filter bars
- Filter chips
- Advanced filter panels
- Filter drawers
- Saved views
- Column filters
- Sorting controls
- Pagination
- Infinite scrolling
- Load-more patterns

Determine the appropriate pattern based on:

- Dataset size
- Search frequency
- Complexity of filtering
- Number of active filters
- Need for exact record retrieval
- Preservation of search context
- Performance and API constraints

For every filtering experience define:

- Default state
- Active filters
- Filter removal
- Reset behavior
- Result count
- Empty results
- Loading behavior
- Search persistence
- URL synchronization where appropriate

Clinicians should be able to efficiently find a particular patient without unnecessary interactions.

Patients should not be exposed to advanced enterprise filtering complexity unless it supports their actual needs.

## 11. Dialogs, drawers and contextual interaction surfaces

Research when to use:

- Modal dialogs
- Confirmation dialogs
- Alert dialogs
- Side drawers
- Bottom sheets
- Popovers
- Dropdown menus
- Inline expansion
- Dedicated full pages
- Split-pane interfaces

Evaluate using:

- Task complexity
- Interaction duration
- Amount of content
- Need for surrounding context
- Frequency of use
- Importance of the task
- Mobile versus desktop context
- Risk of losing entered data

For example:

- Cancelling an appointment may require a focused confirmation.
- Reviewing patient information may benefit from a contextual side panel.
- Building a treatment plan may require a dedicated workspace.
- Selecting a short mobile option list may benefit from a bottom sheet.

These are candidate patterns, not predetermined decisions.

Avoid nested modals, unnecessary overlay interactions and dialogs containing excessively long workflows.

Implement appropriate focus management, keyboard behavior, dismissal rules and unsaved-change protection.

## 12. Charts and data visualization

Research visualization patterns according to the actual data and the decision it supports.

Evaluate:

- Line charts
- Area charts
- Bar charts
- Grouped bars
- Stacked bars
- Scatter plots
- Donut charts
- Progress bars
- Calendar heatmaps
- Sparklines
- Milestone timelines
- Numerical summaries
- Data tables

For every visualization determine:

- What question does it answer?
- Who is reading it?
- What is the underlying data?
- Is the user comparing values, trends, distributions or progress?
- Is the visualization necessary?
- Would plain text communicate the information more effectively?
- What happens when data is missing?
- How is the information accessible without color?
- What level of precision is required?

### Healthcare-specific requirements

Patient-reported pain trends must remain distinguishable from clinician assessments.

Activity completion must not be presented as clinical recovery.

Show meaningful units, dates, legends and contextual labels.

Avoid misleading scales, misleading trend smoothing and fabricated data.

Do not add charts simply because dashboards are expected to contain charts.

Provide accessible textual summaries or tables where appropriate.

## 13. Status indicators, badges and labels

Research:

- Status badges
- Status dots
- Text labels
- Tags
- Chips
- Icons
- Progress indicators
- Severity indicators
- Empty-state messages
- Timestamp labels

Determine when a status requires:

- Color
- Text
- Iconography
- Supporting explanation
- An associated action

Do not convert every metadata value into a colored badge.

Do not use ambiguous labels such as Active without defining what Active means.

Establish a distinct vocabulary for:

- Patient enrollment status
- Care plan status
- Appointment status
- Review status
- Administrative task priority
- AI generation status
- Clinical note status
- Message delivery status

Each status should map to actual application state.

Never rely on color alone.

## 14. Notifications and feedback patterns

Research:

- Inline validation
- Error summaries
- Toast notifications
- Snackbars
- Banners
- Persistent alerts
- Notification centers
- Confirmation messages
- Undo interactions
- Loading skeletons
- Spinners
- Progress indicators
- Optimistic updates

Evaluate based on:

- Importance
- Urgency
- Duration
- Whether action is required
- Whether the message can be dismissed
- Whether the user needs a permanent record
- Whether the operation has actually succeeded

Distinguish low-priority feedback from critical information.

Do not use temporary toast messages as the only way to communicate important clinical record errors.

Do not display a successful appointment booking before the server confirms the booking.

Use optimistic updates only where failures can be recovered safely.

Define notification priority and persistence rules.

Avoid notification fatigue.

## 15. Appointment and calendar components

Research:

- Monthly calendars
- Weekly calendars
- Daily schedules
- Date strips
- Available time-slot lists
- Calendar popovers
- Date-and-time selection
- Appointment cards
- Schedule timelines
- Availability management
- Calendar resource views

Select different patterns for different responsibilities.

Patient scheduling should optimize finding and booking a suitable appointment.

Clinician scheduling should optimize understanding the working day, appointment context and schedule conflicts.

Administrative scheduling should support capacity and availability management.

Do not force the same calendar component into all three roles.

Evaluate:

- Time-zone handling
- Available versus unavailable slots
- Past dates
- Booking conflicts
- Rescheduling
- Cancellation
- Appointment duration
- Mobile interaction
- Keyboard navigation

## 16. Clinical and AI-specific components

Research specialized healthcare elements:

- Patient identity banners
- Clinical record headers
- Medical history summaries
- Observation values
- Clinical timelines
- Treatment plan editors
- Care-team assignment controls
- Care-plan version history
- Clinical note editors
- Audit trails
- Review queues
- Evidence references
- AI generation controls
- AI-generated content indicators
- Source inspection panels
- Human approval controls

For AI-generated content, independently evaluate:

- Inline citations
- Source-linked highlights
- Side-by-side evidence panels
- Expandable source references
- Section-level approval
- Whole-document approval
- Inline editing
- Revision comparisons
- Generated-content provenance
- Unsupported-content warnings

Do not use decorative AI sparkle icons as a substitute for meaningful information about provenance.

Do not display numerical confidence percentages unless they have a defined, validated interpretation.

Clearly distinguish generated content, clinician-authored content and finalized clinical documentation.

AI recommendations or summaries must not silently overwrite clinician-authored records.

## 17. Microinteraction research

Research the behavior of individual components, including:

- Hover feedback
- Focus indicators
- Pressed states
- Selection transitions
- Expand and collapse
- Input validation timing
- Autosave
- Drag and drop
- Reordering
- Inline editing
- Undo
- Loading transitions
- Success feedback
- Error recovery
- Keyboard shortcuts
- Scroll behavior
- Sticky positioning

For every interaction determine whether animation or transition improves comprehension.

Avoid unnecessary motion.

Provide keyboard and non-drag alternatives for drag-and-drop interactions.

Ensure that important actions remain understandable with reduced-motion settings.

## 18. Microcopy and individual element decisions

Research every meaningful content element.

Evaluate:

- Page titles
- Section headings
- Field labels
- Placeholder text
- Helper text
- Instructional copy
- Button labels
- Validation messages
- Tooltips
- Empty states
- Confirmation messages
- Clinical terminology
- Date formatting
- Time formatting
- Numeric units
- Icons
- Dividers
- Avatars
- Information indicators

Determine whether each element is necessary.

Use plain language for patients and appropriate professional language for clinicians.

Avoid unexplained medical abbreviations.

Do not use placeholders as replacements for persistent field labels.

Do not hide essential information behind tooltips.

Do not add an icon beside every heading.

Use icons where they improve recognition, navigation or understanding.

Use a consistent icon library and visual weight.

## 19. Component selection decision matrix

For each important component choice, create a decision matrix.

Record:

- Component decision ID
- Screen or workflow
- User segment
- User task
- Business objective
- Candidate alternatives
- Production references
- Research evidence
- Accessibility considerations
- Clinical and privacy constraints
- Interaction complexity
- Technical feasibility
- Selected alternative
- Rejected alternatives
- Decision rationale
- Validation method

Use the following starting evaluation weights:

- Task effectiveness: 25%
- Accessibility and usability: 25%
- Error prevention and trust: 20%
- Business and operational value: 15%
- Interaction efficiency: 10%
- Implementation and maintenance cost: 5%

Adjust these weights for the individual use case.

Critical accessibility, privacy and safety requirements are mandatory gates.

Do not permit a high weighted score to override a failed essential requirement.

Do not fabricate numerical research results. Clearly identify heuristic evaluations and untested assumptions.

## 20. Component alternatives and prototypes

For complex or high-impact decisions, create comparable visual prototypes.

Use identical:

- Content
- Data
- Typography
- Color tokens
- Available screen dimensions
- User goals

Change only the interaction pattern or component structure being evaluated.

This ensures the alternatives can be compared fairly.

Examples:

- Three different patient pain-input approaches.
- Three different clinician directory layouts.
- Two AI evidence-review approaches.
- Three treatment-plan editing approaches.
- Two approaches to appointment availability.
- Two approaches to displaying longitudinal patient history.

Evaluate the prototypes before selecting one.

Do not create alternatives that differ only in cosmetic styling.

Keep exploration artifacts out of the production user experience.

## 21. Component specification

Once a component has been selected, document:

- Component name
- Purpose
- Anatomy
- Usage guidelines
- When not to use it
- Variants
- Sizes
- Design tokens
- Typography
- Spacing
- Icons
- States
- Behavior
- Responsive rules
- Accessibility requirements
- Keyboard interactions
- Screen-reader announcements
- Data dependencies
- Loading behavior
- Error behavior
- Permissions
- Testing requirements

Prefer native semantic HTML when it meets the interaction requirements.

Use established accessible primitives rather than reinventing complex keyboard and accessibility behavior.

Do not create unnecessary variants or abstractions.

## 22. Component states

Evaluate relevant states for every component:

- Default
- Hover
- Focus-visible
- Pressed
- Selected
- Unselected
- Disabled
- Read-only
- Loading
- Empty
- Error
- Warning
- Success
- Partial data
- Long content
- Missing information
- Permission restricted
- Network unavailable
- Unsaved changes
- Stale data

Test realistic content lengths, names, dates, numeric values and error messages.

Do not design only the ideal state.

Document unavailable actions and explain why they are unavailable when the reason is important to the user.

## 23. Responsive component behavior

Components must adapt to their actual interaction context.

Evaluate:

- Mobile touch interaction
- Desktop mouse interaction
- Keyboard interaction
- Tablet usage
- Narrow containers
- Zoomed interfaces
- Large text settings
- Screen readers
- Reduced motion

Do not assume that simply resizing a desktop component creates a good mobile component.

For example, evaluate whether desktop filter panels should become mobile drawers, or whether dense records should become stacked summaries.

Maintain functional equivalence when changing interaction models across devices.

## 24. Component architecture and Storybook

Create a reusable component architecture with clearly defined layers.

**Foundation tokens:** color, typography, spacing, radius, elevation and motion.

**Primitives:** buttons, inputs, labels, icons, links and feedback elements.

**Composed components:** dialogs, comboboxes, tables, calendars, filters and navigation.

**Healthcare components:** patient banners, appointment records, care-plan editors, observation displays and AI-review panels.

**Feature patterns:** complete reusable workflows and interaction compositions.

Use Storybook to document the shared component library.

Include:

- Interactive examples
- Variants
- Relevant states
- Usage guidance
- Accessibility checks
- Responsive examples
- Realistic synthetic healthcare content

Keep business logic outside generic presentation components where appropriate.

Avoid duplicating components separately for each application when a shared implementation with appropriate variants is sufficient.

## 25. Documentation requirements

Create the following research and design documentation:

docs/design/component-inventory.md

docs/design/component-research/

docs/design/component-decisions/

docs/design/pattern-library/

docs/design/interaction-specifications/

docs/design/microcopy-guidelines.md

docs/design/data-visualization-guidelines.md

docs/design/accessibility/component-audit.md

docs/design/component-usage-matrix.md

Create an index connecting each research decision to:

- The relevant screen
- Source references
- The selected design
- The implemented component
- Storybook examples
- Associated tests

This must provide a traceable relationship between research, design and real implementation.

## 26. Practical research priorities

Do not spend days researching basic buttons and dividers while major workflows remain unfinished.

Group research efficiently into related component families.

Prioritize deeper research for:

- Clinical and health-related inputs
- Patient identity
- Treatment planning
- Appointment scheduling
- Clinical data presentation
- AI verification
- Clinical documentation
- High-impact actions
- Complex tables
- Error recovery
- Accessibility-critical interactions

Reuse established, evidence-supported conventions for straightforward components.

The goal is thoughtful design, not unnecessary documentation or design-system overengineering.

## 27. Final implementation and validation

After the research and component decisions:

1. Implement the shared component system.
2. Replace inappropriate existing components.
3. Integrate components into actual workflows.
4. Preserve functional application behavior.
5. Test keyboard and touch interactions.
6. Run accessibility checks.
7. Capture real browser screenshots.
8. Compare the implemented result against the selected design.
9. Refine inconsistencies.
10. Document final decisions and remaining limitations.

Evaluate the components within complete tasks, not only in isolation.

A component that looks excellent in Storybook but creates friction inside an actual patient workflow is not a successful component.

Run automated tests and manually evaluate the most important interactions.

Do not claim actual user research results unless real participants have been involved.

## 28. Definition of done

The component-level design work is complete when:

- Every significant component has a defined use case.
- Appropriate research supports high-impact component decisions.
- Meaningful alternatives have been evaluated.
- Selected patterns align with business and user requirements.
- Components have documented usage rules.
- Important accessibility requirements have been addressed.
- Relevant interaction states have been implemented.
- Components are consistent with the HealthTech visual identity.
- The application contains no unnecessary or decorative interface elements.
- Existing functional workflows remain operational.
- Research decisions are traceable to implementation.
- Actual rendered screens have been reviewed and refined.

Do not stop at providing recommendations.

Research, make decisions, implement, test and refine the complete experience.

Begin by auditing every existing CarePath screen and building the component-to-use-case inventory.