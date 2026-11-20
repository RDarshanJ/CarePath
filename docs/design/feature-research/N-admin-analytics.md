# N. Administrative analytics

Protocol: `docs/design/RESEARCH-PROTOCOL.md`. Brief: `docs/DESIGN-BRIEF.md` section 7 N, sections 5, 8, 9. Metric definitions: `docs/product/prd.md` section 10 and REQ-ADM-06. Access date for every source: 2026-11-20. Status: provisional until the advisor signs off. No colours are chosen here.

Scope note: no metrics screen or endpoint exists yet. The permission `metrics.read` exists (`packages/shared/src/contracts/permissions.ts`, granted to coordinator and admin in `apps/api/src/core/authz/permissions.ts`), but there is no metrics contract in `packages/shared/src/contracts` and `/admin` currently redirects to the patient list.

## 1. User problem

A clinic coordinator or administrator needs to know whether the clinic's operations are working: are new patients finishing sign-up, are they being assigned and given a plan, are appointment slots being used, are cancellations piling up, is review work waiting too long. A page of numbers does not help unless each number says what it counts, over what period, compared with what, and what the reader can do about it. Today they have only a patient list, so they answer these questions by hand or not at all.

## 2. User and context

- **Care coordinator (C1) and clinic admin (A1).** Desktop; office hours; a few minutes at the start of the day or week, and ad hoc when something looks wrong. Reads, decides who to chase or what to change, then leaves for the assignment, availability or appointment screens.
- Not for therapists (their overview is work lists with no KPI tiles, REQ-OVR-01) and not for patients.
- Cognitive state: calm, scanning for what changed or what is stuck. Likely to share numbers with others, so definitions must travel with the number. Source: PRD personas A1 and C1; behaviour described is expert judgement.

## 3. Business objective

Let administrators find and fix operational friction between sign-up and first care, and keep the clinic's schedule and review load under control, with numbers they can trace to rows. Metric names only (these are also the success measures for the screen itself): the six PRD metrics; plus screen-level measures: time from opening the page to opening a drill-down, share of metric views followed by a drill-down, share of metric views that open the definition. No improvement percentage is claimed anywhere, and none can be until it is measured.

## 4. Constraints

**Functional (PRD section 10, AC-H3, AC-H4):**
- Six defined metrics, organisation-scoped, computed from rows on request in the organisation's time zone, no stored snapshots:

| Metric | Numerator | Denominator | Window |
|---|---|---|---|
| Enrollment completion | Onboardings `submitted` | Accounts created | Created in last 30 days |
| Appointment utilisation | Booked, checked-in or completed minutes | Published availability minutes | Last 30 days |
| Cancellations | Appointments cancelled | Appointments booked | Booked in last 30 days |
| Care plan activation | Patients with a published version | Patients `assigned` or `active` | Now |
| Activity completion | Items `done` | Items scheduled by published versions | Trailing 7 days |
| Pending review items | Open and assigned tasks by age band | Count, not a ratio | Now |

- Acceptance: on the seed each metric equals an independent SQL count (AC-H3); a new cancellation changes the cancellation metric on next load (AC-H4).
- **Contract gaps:** no metrics endpoint or schema; no drill-down list endpoints keyed to each numerator (some lists exist: patient directory with filters, appointment operations for coordinators, `GET /review-tasks`); age-band edges for "pending review items" are not defined in the PRD.
- **No history in Core:** "Now" metrics (care plan activation, pending review) have no stored past values, so they cannot be compared with an earlier period without adding snapshots. Windowed metrics can be recomputed for the preceding window, with the caveats in section 11.
- **No peer data.** There is no benchmark source; any "compared with similar clinics" figure would be invented and is out of scope.

**Technical:** metrics are computed from rows on request; performance for a demo-size seed is a non-issue but the query count per page load should stay small. Time zone is the organisation's, shown on the page.

**Safety, privacy and trust:** coordinator and admin see administrative data; clinical content (pain values, notes) stays out of metrics. Activity completion is a count of assigned items done, not a measure of recovery, and must be labelled that way. Comparisons between named clinicians are a privacy and fairness risk (small numbers, no case-mix adjustment) and are excluded. Do not state or imply compliance, accreditation or outcome claims.

**Accessibility (WCAG 2.2 AA):** every chart has an equal-value table (design-system rule: "every chart has a table alternative"); no information in a tooltip only (tooltips are supplementary); colour not the only carrier; comparison direction stated in words ("4 points lower than the previous 30 days"), not only arrows; 24 px targets; reflow at 320 px; keyboard operable date or period controls if any.

## 5. Current CarePath implementation

- The admin shell has one working screen, the patient list (`apps/web/app/(admin)/admin/patients`). `apps/web/app/(admin)/admin/page.tsx` redirects to it with a comment that Phase 6 adds the rest.
- No metric, chart or analytics component for admin exists. Patient-side progress charts with table alternatives exist in the patient app (`apps/web/app/(patient)/_components/charts.tsx`), with an open issue about SVG text scaling (checkpoint C2).
- The `Table` component (caption, sortable headers with `aria-sort`, tabular numerals, selected row) and `Tag`, `StatusChip`, `Banner`, `EmptyState`, `Skeleton` exist (`docs/design-system/components.md`).
- Admin screenshots (`docs/screenshots/3.2a/admin-care_coordinator-1440.png`, `admin-clinic_admin-1440.png`) show an empty-state admin home from before the patient list; they are out of date.

Weaknesses of the starting point: no metric exists in the UI at all; the risk is to build the easy thing, a row of big numbers, which the PRD wording ("six defined metrics computed on request") does not define as tiles but which is the default reflex.

## 6. Production references observed

Mobbin has no healthcare operations dashboard; the retrievable references are analytics and operations products. One healthcare public source (PhysiData) was read but is thin.

| Product | Platform | Screen or flow | URL | Observed |
|---|---|---|---|---|
| Stripe Dashboard | Web (Mobbin) | Home: "Organisation performance" | https://mobbin.com/screens/ed214911-d939-4369-b40a-2ebd4c0be155 | [Observed] Grid of metric cards (Gross volume, Net volume, MRR, Active subscribers); each shows the value, the previous-period value as text ("US$0.00 previous period"), a small info icon beside the title, and a chart; controls for Accounts, Date range, Compare (Previous period), Currency. |
| Stripe Dashboard | Web (Mobbin) | "Your overview" | https://mobbin.com/screens/fc5d4bcd-1d9a-4cf1-b2f0-cdecac3a1abf | [Observed] Customisable cards with date range and interval; "Updated 29 minutes ago" under charts; "More details" and "View all" links per card; a Failed payments card lists the rows with a Failed label. |
| Stripe Dashboard | Web (Mobbin) | Radar overview | https://mobbin.com/screens/63b47007-2529-42d0-8701-6ef4ff10342e | [Observed] Three columns (Authenticated, Screened by Radar, Disputed) each with a rate, an info icon, bars and a legend with counts; controls for period, grouping and "Compared to: Similar businesses" with a toggle. The only reference here that shows a peer benchmark. |
| Stripe Dashboard | Web (Mobbin) | Payment methods report | https://mobbin.com/screens/268d429c-0b02-46f6-b3a6-c5bfa29da2dc | [Observed] "View report for" filter, period selector, line chart with tooltip, a bar comparing "All methods" with the selected one, and a share chart with legend. |
| Stripe Dashboard | Web (Mobbin) | Billing overview with date picker | https://mobbin.com/screens/266228e3-d7ac-436a-bb53-c0a89ae421af | [Observed] Presets (Today, Last 7 days, Last 4 weeks, Last month, and so on) beside a calendar range picker with Apply; tabs Revenue, Subscribers, Trials, Churn, Collections, Benchmarking (Preview); "Updated" time under charts; "Report downloads" section below. |
| Mixpanel | Web (Mobbin) | Funnel report | https://mobbin.com/screens/647846ee-9587-4317-aecb-4abf5aece206 | [Observed] Two-step funnel as bars with conversion percentages; a table below with per-step counts and conversion; window setting ("7 days"), compare control, breakdown. |
| Google Analytics | Web (Mobbin) | Funnel exploration | https://mobbin.com/screens/557e0f62-e958-4b13-9be6-09930a6e76e2 | [Observed] Steps defined in a side panel; funnel bars with abandonment rate per step; a table of active users, completion rate and abandonments by step and device. |
| Zoho CRM | Web (Mobbin) | Analytics gallery: sales funnel | https://mobbin.com/screens/1e4a6562-64ce-4fd3-b084-dbca596cc589 | [Observed] Funnel by source with counts at each stage and the conversion between them as text; table by lead source below. |
| Steep | Web (Mobbin) | Metric as heatmap table | https://mobbin.com/screens/a7433994-2124-46c2-9d91-047ac34e08a7 | [Observed] "User Conversion Rate" rows by day and columns by segment, values printed in each cell; left rail "Metrics catalog" lists named metrics by group; period presets at the foot. |
| Vanta | Web (Mobbin) | Tests with "Needs attention" | https://mobbin.com/screens/eb1d71b4-2b3c-4a83-8435-bdc0e7cbb9e2 | [Observed] Counts of Overdue, Due soon and Needs remediation as text with icons; the table below is the drill-down. |
| Zendesk | Web (Mobbin) | Agent dashboard | https://mobbin.com/screens/6d092d6c-e458-4351-9bf5-d88a8d095750 | [Observed] "Open tickets" counts (you, groups) and weekly statistics (good, bad, solved) above the list that those counts summarise. |
| Fresha | Web (Mobbin) | Client forms table | https://mobbin.com/screens/77260bad-dd3d-4ba6-8db8-cd9fefa57982 | [Observed] Plain table with date columns, a text status ("Completed", "To be completed", "Not completed") as a pill, sortable columns, "Load more". Shows the shape of an operational drill-down in a service business. |
| Navan | Web (Mobbin) | Admin table by state | https://mobbin.com/screens/691ae050-b43b-44b2-9687-471bca63dd9a | [Observed] Admin report as a table with column headers that carry the definition ("Vaccinated population (at least a single dose)"), a download icon per row, and a "View by" toggle. |
| Physitrack | Official support | Introduction to PhysiData | https://support.physitrack.com/article/649-introduction-to-physidata | [Observed] The page points to outcome measures, patient-reported pain and adherence, and to Benchmarking, Cohort Analysis, Rankings and Export; filters and drill-down are not described on that page. |
| Qualtrics | Article | Action-centric dashboard design | https://www.qualtrics.com/articles/customer-experience/action-centric-dashboard-design/ | [Observed] Four principles: design for specific roles; keep only what matters; structure with the most actionable insights first; apply sound visual design. A vendor article, not research. |
| MedBridge | Official page | RTM dashboard | https://www.medbridge.com/enterprise/remote-therapeutic-monitoring-solution | [Observed] Which patients are on track for RTM milestones and which should be prioritised; no definitions or calculation described on the page. |
| Not retrieved | | | | Healthcare operations dashboards (Epic, Press Ganey, Tableau healthcare galleries) were not searched on Mobbin because it does not carry them; no peer-reviewed dashboard-usability study was fetched. |

## 7. Established patterns

1. **A metric card shows the value and the comparison as text** ("previous period"), not only a chart (Stripe). The reader gets the change without reading a line.
2. **A definition is attached to the metric** (Stripe info icon; Navan column headers with the definition in the header text; Steep "Metrics catalog"). Strongest when the definition is visible text, weakest when it is a hover icon only.
3. **Freshness is stated** ("Updated 29 minutes ago", Stripe). The reader knows whether to trust that it is current.
4. **Period is a control with presets plus a custom range** (Stripe, Mixpanel). For CarePath the periods are fixed by definition, so presets would change the metric; the control must not exist for fixed-window metrics.
5. **Every number leads to its rows** ("More details", "View all", Vanta counts above a table, Zendesk counts above the list). The drill-down is a table, and the table's row count equals the number.
6. **Funnels show counts and step conversion together** (Mixpanel, GA, Zoho), with a table under the graphic that carries the same values.
7. **Attention is split by kind** (Vanta Overdue, Due soon) with icons and words.
8. **Comparison to peers appears in Stripe Radar** ("Compared to: Similar businesses"). [Assumption] It relies on the vendor's own cross-customer data; CarePath has none.
9. **Healthcare references are thin:** PhysiData's page names benchmarking and rankings but does not explain definitions or drill-down, so no healthcare-specific pattern is copied.

## 8. Alternatives

Evidence tags: **R** research evidence, **E** expert judgement, **U** untested assumption.

### A. KPI-oriented overview

- **Problem addressed:** see all six numbers at a glance.
- **Interaction model:** a grid of six metric cards (value, previous-period text where computable, small chart, info icon), a freshness line.
- **Benefits:** familiar; fast scan; shareable screenshot.
- **Limitations:** a big number invites reading without the denominator or window; "Now" metrics have no previous value; charts are decoration unless tied to a decision; definitions slide into hover icons.
- **Accessibility:** needs a table alternative for each chart; hover-only definitions fail the rule that tooltips are not the sole carrier.
- **Business implications:** easy to build and demo; the default, and the one most likely to be decorative.
- **Technical complexity:** low to medium (six queries; previous-window recompute for four).
- **Error and recovery:** per-card failure states; a failed card must not show a stale number as current.
- **Evidence:** R Stripe home and "Your overview". E risk of single-number reading.

### B. Operational funnel

- **Problem addressed:** find where people stall between sign-up and first care.
- **Interaction model:** a stepped view: accounts created, onboarding submitted, assigned to a clinician, plan published, with counts at each step and the conversion between steps, plus a table under it.
- **Benefits:** answers "where do we lose people" better than isolated numbers; maps to enrollment completion and care plan activation.
- **Limitations:** covers only two or three of the six metrics; utilisation, cancellations, activity completion and review backlog are not funnels. A funnel of current statuses ("where patients are now") is a snapshot, not a conversion, and mixing the two misleads; a true cohort funnel needs status history (the `StatusTransition` data exists but is not read by any endpoint yet).
- **Accessibility:** funnel graphic must be duplicated by a table; step labels are words.
- **Business implications:** directly supports follow-up on stalled onboarding and unassigned patients.
- **Technical complexity:** medium to high for a true cohort funnel; low for a status snapshot.
- **Error and recovery:** if a step count cannot be computed, show the step as "Not available" and break the arrow.
- **Evidence:** R Mixpanel, GA, Zoho funnels. E the snapshot-versus-conversion caution.

### C. Definition-first metric table with drill-down tables

- **Problem addressed:** let the reader see each metric with its definition and go straight to the rows behind it.
- **Interaction model:** a table with one row per metric: name, value with numerator and denominator ("31 of 45"), period in words, comparison where computable, a "Definition" disclosure (visible text, not hover), and a "View the 14 not submitted" link. The link opens a drill-down table (filtered patients, appointments or tasks) with the same row count as the numerator or denominator. Optionally one small chart per metric, with its table.
- **Benefits:** every number is checkable; the definition cannot be missed; directly testable (AC-H3: count equals SQL, drill-down rows equal numerator); fits a mixed set of six metrics.
- **Limitations:** less glanceable than cards; looks plain; relies on drill-down lists for each metric.
- **Accessibility:** native tables with captions and sortable headers; definitions as `details` or an inline paragraph; comparison in words.
- **Business implications:** builds trust; supports decisions at the point of action (go from "14 not submitted" to the people).
- **Technical complexity:** medium: a metrics endpoint plus filtered list endpoints (directory and appointment lists exist with some filters; review tasks exist; onboarding-not-submitted and unpublished-plan lists need filters or new routes).
- **Error and recovery:** per-row failure state; drill-down shows its own error and keeps the metric row.
- **Evidence:** R Navan (definition in header), Steep (metrics catalog), Vanta and Zendesk (counts above the list they summarise), Fresha (plain operational table); R Stripe (period text and "More details").

### D. Exception-based dashboard

- **Problem addressed:** show only what needs attention.
- **Interaction model:** a list of exceptions drawn from the six metrics: patients awaiting assignment past the clinic's intake threshold, assigned patients without a published plan, review tasks older than a band, appointments cancelled in the last 7 days; each with a count and a link to the rows; if nothing is wrong, "Nothing needs attention".
- **Benefits:** least reading; matches the action-first principle; the existing review rules already supply thresholds set by the clinic.
- **Limitations:** a threshold implies a norm; for utilisation or cancellations CarePath has no clinic-set threshold and no evidence for one, so an exception would be an invented benchmark; hides context when everything is "fine".
- **Accessibility:** words and icons for exception kinds; counts as text.
- **Business implications:** good for daily use; weak for monthly review.
- **Technical complexity:** medium; needs thresholds from settings for any new exception.
- **Error and recovery:** if a rule has not run, say so ("Time-based rules last ran at 8:45 AM").
- **Evidence:** R Vanta "Needs attention". R Qualtrics "most actionable first" (vendor opinion).

### E. Comparative reporting

- **Problem addressed:** see change over time, between clinicians, and against peers.
- **Interaction model:** period-over-period deltas for every metric, a by-clinician breakdown table with ranking, and a peer benchmark row.
- **Benefits:** answers "better or worse than before" and "who is carrying the load".
- **Limitations:** no peer data; ranking clinicians on small numbers without case-mix adjustment is unfair and can be misused; "Now" metrics have no history; recent windows look worse because recent bookings and sign-ups have had less time to be cancelled or submitted.
- **Accessibility:** deltas must be words.
- **Business implications:** risks reputational and staff-relations harm if used for performance management.
- **Technical complexity:** high (snapshots for "Now" metrics; clinician aggregation).
- **Error and recovery:** n/a.
- **Evidence:** R Stripe Radar (peer comparison option; data source is an assumption), R PhysiData (names benchmarking and rankings, no definition shown), E on fairness and small numbers.

## 9. Mandatory gates

**G-N1 accessibility** (WCAG 2.2 AA; every chart has an equal-value table; no information in hover only). **G-N2 privacy and trust** (no clinical content in metrics; no unsupported benchmarks; no per-clinician ranking; definitions visible). **G-N3 integrity** (every metric shown has definition, source, period, calculation and a drill-down whose count reconciles to the number; no fabricated or estimated values).

| Alternative | G-N1 | G-N2 | G-N3 | Eligible |
|---|---|---|---|---|
| A. KPI overview | Pass if tables added and definitions visible | Pass | Conditional: fails if cards omit denominator, window and drill-down | Yes, with conditions |
| B. Operational funnel | Pass with table | Pass | Conditional: must label snapshot versus cohort; covers only part of the metric set | Yes, with conditions |
| C. Definition-first table with drill-down | Pass | Pass | Pass | Yes |
| D. Exception-based | Pass | Pass | Conditional: only exceptions with a clinic-set or definitional threshold; no invented norms | Yes, with conditions |
| E. Comparative (peer benchmark, clinician ranking) | Pass | Fail (staff ranking; no peer data) | Fail (peer figures would be fabricated) | No. Previous-period comparison alone is folded into C. |

## 10. Weighted evaluation

Default weights: task effectiveness 25, clinical safety/privacy/trust 20, usability/accessibility 20, business value 15, operational efficiency 10, technical feasibility 5, design-system consistency 5. No adjustment: metric honesty is covered under trust and enforced by G-N3. E is not scored (ineligible).

| Criterion (weight) | A. KPI overview | B. Funnel | C. Definition-first table + drill-down | D. Exception-based |
|---|---|---|---|---|
| Task effectiveness (25) | 3: shows values; the decision link is weak without drill-down | 4: strong for onboarding and activation, silent on the other metrics | 5: each metric tied to rows an admin can act on | 4: points at what to act on, thin on routine monitoring |
| Safety, privacy, trust (20) | 3: single numbers read without denominator or window | 3: snapshot versus conversion confusion | 5: numerator, denominator, window and definition visible | 3: thresholds can imply norms |
| Usability, accessibility (20) | 3: chart plus table pairs add load | 3: funnel graphic must be duplicated in a table | 4: plain tables, easy to read at zoom | 4: short list, simple |
| Business value (15) | 4: familiar, demo-friendly | 4: supports follow-up on stalled onboarding | 4: supports trust and daily action | 4: fast daily use |
| Operational efficiency (10) | 3: needs drill-down after the glance | 4: shows the stall point directly | 4: one click from number to rows | 5: least reading |
| Technical feasibility (5) | 4: six queries | 3: cohort funnel needs status history | 4: metrics endpoint plus filtered lists | 3: needs settings-backed thresholds |
| Design-system consistency (5) | 3: no metric card component | 3: no funnel component | 5: Table, Tag, Banner exist | 4: lists and Tag exist |
| **Weighted total (of 5)** | 3.20 | 3.50 | **4.50** | 3.85 |

Arithmetic: A = (75 + 60 + 60 + 60 + 30 + 20 + 15) / 100 = 3.20. B = (100 + 60 + 60 + 60 + 40 + 15 + 15) / 100 = 3.50. C = (125 + 100 + 80 + 60 + 40 + 20 + 25) / 100 = 4.50. D = (100 + 60 + 80 + 60 + 50 + 15 + 20) / 100 = 3.85. Scores are expert judgement informed by observed references; none is measured.

## 11. Recommendation

**Selected: C, definition-first metric table with drill-down tables,** with a short exception strip from D on top, limited to exceptions that already have a clinic-set threshold or are plain facts.

Why it beats the runner-up (D, exception-based): D's weakness is that most of the six metrics have no clinic-set threshold, so an exception list would either leave them out or invent norms. C shows all six honestly and still lets an admin act from each; the strip takes D's strength where a defensible threshold exists (review tasks past the unreviewed-check-in rule, patients awaiting assignment past the intake rule's days).

**Runner-up: D**, which becomes the main view if admins say they only want the exceptions.

**Rejected:** A as the main view (decorative risk; hover-only definitions); B as the main view (partial coverage, snapshot versus conversion confusion), though a labelled "Where patients are now" table by status can be a drill-down; E (fails gates). Previous-period comparison is kept inside C where computable.

**Trade-offs accepted:** less glanceable than cards; plain look; some metrics show "No comparison available" because there are no stored snapshots; recent windows carry a visible maturity note.

### Metric specification (each metric tied to a decision)

All calculations are from PRD section 10. "Source" names the data the PRD names; the exact table names are not restated here beyond what the PRD and the domain model use. All periods are in the organisation's time zone, which the page states. Drill-down row counts must equal the number shown (reconciles with AC-H3).

| Metric | Administrative decision it supports | Definition (plain words) | Data source | Period | Calculation | Comparison | Drill-down actions |
|---|---|---|---|---|---|---|---|
| Enrollment completion | Whether to chase stalled sign-ups or change how eligibility codes and reminders are handled (coordinator) | Of the accounts created in the last 30 days, how many have submitted onboarding | Account creation and onboarding status | Accounts created in the last 30 days | Onboardings `submitted` divided by accounts created; shown as "n of m" | Previous 30-day window by creation date, recomputed from current rows; note that the newest accounts have had less time to finish | List accounts not submitted: last completed step, days since sign-up; link to the patient row |
| Appointment utilisation | Whether to add, remove or move availability | Share of published availability minutes that are booked, checked in or completed | Published availability and appointments | Last 30 days | Booked, checked-in or completed minutes divided by published availability minutes | Previous 30 days, recomputed from current availability (edited availability changes past values; stated on the page) | By clinician and week; list unbooked blocks; link to availability editor |
| Cancellations | Whether cancellation volume or source warrants a policy or outreach change | Of appointments booked in the last 30 days, how many were cancelled | Appointments | Booked in the last 30 days | Cancelled divided by booked; split text by "cancelled by patient" and "cancelled by clinic" | Previous 30-day window by booking date; the newest bookings may still be cancelled later (stated) | List cancelled appointments: who cancelled, reason if given, patient link |
| Care plan activation | Which assigned patients still need a plan (assign build work to a therapist) | Of patients assigned or active, how many have a published plan version | Patients and care plan versions | Now | Patients with a published version divided by patients `assigned` or `active` | None: no stored history in Core. Text "No comparison: this metric is a snapshot." | List assigned patients without a published plan: days since assignment, assigned clinician; link to assignments |
| Activity completion | Whether assigned exercise is being done enough to prompt outreach or a plan check | Of items scheduled by published plans, how many were marked done | Exercise session items and published plan schedule | Trailing 7 days | Items `done` divided by items scheduled; skipped items are not counted as done | Previous 7 days, recomputed | List patients with the lowest counts (counts only, no pain values); link to the patient's activity; labelled "A count of assigned items, not a measure of recovery" |
| Pending review items | How much review work is waiting and whether to reassign it | Open and assigned review tasks, by how long they have waited | Review tasks | Now | Count by age band. Band edges are not defined in the PRD. Proposal, to be confirmed: under 24 h, 24 to 48 h, over 48 h, using the existing 48-hour unreviewed-check-in rule as one edge (assumption) | None: snapshot | Opens the review queue filtered by the band; administrative tasks are resolvable by the coordinator |

The page states for every row "Computed from current records at {time}" so that stale data is visible.

## 12. Requirement alignment row

| Field | Content |
|---|---|
| User segment | Care coordinator (C1); clinic admin (A1) |
| Job to be done | Spot and fix operational friction between sign-up, assignment, plan, scheduling and review |
| Pain point | No numbers at all today; a first version risks decorative cards without definitions |
| Business objective | Operational control with traceable numbers |
| Functional requirement | REQ-ADM-06 (six defined metrics computed on request), AC-H3, AC-H4; new: definition disclosure, drill-down lists, comparison where computable, freshness line |
| Success metric | Time from opening the page to opening a drill-down; share of metric views followed by a drill-down; share opening the definition; AC-H3 reconciliation passes |
| Design hypothesis | If each number states its window and denominator and leads to its rows, administrators will act on the rows instead of quoting the number |
| Selected pattern | Definition-first metric table with drill-down tables, plus an exception strip limited to defensible thresholds |
| Technical dependency | Metrics endpoint and schema (to be defined; `metrics.read` exists); filtered list endpoints for not-submitted onboardings and assigned-without-plan patients; age-band definition from the advisor |
| Validation method | Automated: AC-H3, AC-H4, drill-down count equals numerator, axe, keyboard-only run, 200 percent zoom at 390, 768, 1440. Human: a short task test with a coordinator ("who has not finished sign-up") is planned and not yet run. No result is claimed. |

## 13. States to design

| State | Behaviour and microcopy | Recovery |
|---|---|---|
| Default | Table of six metrics with "Computed from current records at 9:00 AM MST" | n/a |
| Hover, focus, active | Row actions and disclosures show the 2 px ring; no hover-only content | Keyboard reachable |
| Selected | Drill-down open: metric row marked, drill-down table below or in a drawer | Esc or "Back to metrics" |
| Loading | Skeleton rows mirroring the table: "Loading metrics" | n/a |
| Empty (no data in window) | "No accounts were created in the last 30 days, so enrollment completion cannot be calculated." Value shows "Not available" and never 0 percent | Link to enrollment |
| Partial data | A metric that failed shows "Not available" with its own error; others show | "Try again" per metric |
| Stale information | "Computed at 8:10 AM. Reload to update." If older than 15 minutes in an open tab, banner | "Reload" |
| Comparison unavailable | "No comparison: this metric is a snapshot." or "Previous window has no data" | n/a |
| Maturity note | "The newest sign-ups have had less time to finish, so this window may rise later." | n/a |
| Validation error (filter) | Drill-down filter with invalid date: "Choose a start date before the end date." | Focus on the field |
| Server error | Banner: "We could not calculate metrics. Nothing was changed." | "Try again" |
| Network loss | "You are offline. The numbers shown were computed at 9:00 AM." Drill-down links disabled | Auto-retry on reconnect |
| Permission denied | "Metrics are available to coordinators and clinic admins." | Contact the clinic admin |
| Success (export, if added) | Toast "Export started". Not in Core scope | n/a |
| Cancellation | Closing the drill-down returns focus to its link in the metric table | n/a |
| Interrupted workflow | Selected metric and filters are in the URL; reload restores them | n/a |

## 14. Responsive behaviour

| Width | Behaviour |
|---|---|
| 375 and 390 | Each metric becomes a stacked block: name, value "31 of 45", period in words, comparison, Definition disclosure, drill-down link. Drill-down tables become two-line rows or scroll horizontally inside a focusable named region; no information lives only in the scrolled part. Exception strip stays on top. |
| 768 | Metric table with Metric, Value, Period, Comparison; definition and drill-down actions in an expandable row. Drill-down opens as a full-width view with a back link. |
| 1024 | Full table with all columns except freshness details; drill-down as a right drawer or in-page section. |
| 1440 | Full table; drill-down opens beside it or below, with the metric row kept visible. |
| 1920 | Same, with a maximum reading width; extra width is used for drill-down columns, not for more cards. |

The model changes at 768: below it the table becomes stacked blocks.
