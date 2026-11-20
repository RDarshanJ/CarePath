# I. Patient directory — feature research

Protocol: `docs/design/RESEARCH-PROTOCOL.md`. Brief: `docs/DESIGN-BRIEF.md` §5–§9, §7 I. Access date for every external source: 2026-11-20. Status: provisional until advisor sign-off. Colours are not chosen here.

Evidence labels: **[Observed]** retrieved and looked at or read this session; **[Prior]** from `docs/research/*.md`; **[Judgement]** expert reasoning; **[Assumption]** untested.

## 1. User problem

Someone in the clinic needs to find a specific patient quickly, or find a group of patients who share a situation (no activity for two weeks, plan still a draft, open review, no upcoming visit), and open the right record. The current page does this, but six dropdowns take the top of the screen, rows offer one action, and the clinician cannot save "my patients who need a follow-up".

## 2. User and context

- Segments: physical therapist (clinical rows), care coordinator and clinic admin (administrative rows: intake status, missing intake). Different data by role is enforced by the API (`view: "clinical"` or `"administrative"`).
- Context: desktop at a desk; search is the dominant entry (name or MRN spoken or read from a card), filtering is the second. [Judgement]
- State: mid-task, short attention; often has one patient name in mind. Sometimes a worklist question ("who has gone quiet?").
- Frequency: many times a day for search, a few times a week for cohort filters. [Assumption]

## 3. Business objective

Faster, error-free retrieval of the right patient; fewer wrong-patient opens. Metric names only: time from page load to record open; search-to-open rate; wrong-record backtrack rate (open record then immediately return); filter use per session; saved-view use; zero-result search rate. No targets claimed.

## 4. Constraints

Functional (`packages/shared/src/contracts/patients.ts`, `api-phase3.md`):
- `GET /patients` with `PatientDirectoryQuery`: `q` (name or MRN substring), `status`, `clinicianId`, `lastActivityBefore`, `hasUpcomingAppointment`, `planStage`, `hasOpenReview`, `sort` (name, lastActivity, status, each asc/desc), cursor pagination, `limit` up to 100. Response includes `total` for the query (CR-3).
- Clinical row: id, MRN, name, birth date, status, primary clinician, lastActivityAt, nextAppointmentAt, planStage, currentVersionNumber, openReviewCount. Administrative row adds createdAt, intakeStatus, missingIntake and drops clinical counts.
- No bulk endpoint exists. Bulk enrolment is explicitly out of scope in the C2 decision. Assignment is one patient at a time (`POST /patients/:id/care-team/assignments`).
- REQ-DIR-01 core; REQ-DIR-02 saved filters is Stretch-Could with no API.
- Server-side filtering means no client-side fuzzy search across the whole set; sort options are limited to name, last activity and status.

Safety/privacy: every directory row is PHI-like. Show the minimum columns needed to identify and triage. Never put names in URLs (current URL holds filter values, not names; keep it so). Document titles for records currently include the patient name; shared screens and browser history can expose it, so keep an eye on that. Accessibility (WCAG 2.2 AA): real table semantics, sortable headers with `aria-sort`, labelled filters, 2.5.8 target size, visible focus (2.4.11), no information by colour alone, and a pagination status message.

## 5. Current CarePath implementation

Read: `apps/web/app/(clinician)/patients/directory.tsx` (419 lines); screenshots `docs/screenshots/3.3/patients-1440.png`, `patients-1024.png`, `patients-filtered-1440.png`.

What exists [Observed in code and screenshot]: a filter form with a search box and five selects (Status, Clinician, Plan stage, Activity, Review); a table with Patient, MRN, Status, Clinician, Care plan, Last activity, Next visit, Open reviews; sort on name, status, last activity; filters live in the URL; `/` focuses search; ArrowUp/Down moves between patient links; whole-row click opens the record; cursor pagination with page size 25, 50, 100; "Patients 1 to 25 of N matching" status.

Weaknesses [Judgement unless marked]:
1. Six controls in a wrapped form push the table down. At 1440 the table starts about 230 px from the top [Observed in screenshot].
2. The API's `hasUpcomingAppointment` filter has no control. [Observed in code]
3. No row actions beyond open. Opening the plan builder or the record at a specific tab needs a second click inside the record.
4. Only three of eight columns sort; the others look sortable by habit but are not. "Open reviews" and "Next visit" are the useful ones for triage and cannot be sorted. The sort set is an API limit, so it needs an API change if wanted.
5. The Directory silently drops administrative rows: `rows = items.flatMap(r => r.view === "clinical" ? [r] : [])`. A role that receives administrative rows would see an empty table and the empty-state copy. [Observed in code]
6. Arrow-key movement works only between name links, not across cells; it is a link-list pattern, not a grid, which is acceptable but not documented to the user.
7. No saved views, no way to return from a record to the same filtered page except the browser Back button. [Observed: filters are in the URL, so Back works; there is no visible "Back to results".]
8. Status chips and plan stage text repeat the same word for most rows, so the page reads as a wall of "Active" and "Version 3 published". [Observed in screenshot]

## 6. Production references observed

| Product | Platform | Screen / flow | URL | Access date | What was observed | Label |
|---|---|---|---|---|---|---|
| Stripe Dashboard | Web | Customers list with saved-view pills, search, Filter (Mobbin) | https://mobbin.com/screens/ab9ed449-1e64-4dbe-8be4-b98b53831762 | 2026-11-20 | Row of named views above the table (All, Top customers, First-time customers, High refunds, High disputes, Remaining balances), one wide search field, a Filter button, a column settings button, a result count under the table. | [Observed] |
| Stripe Dashboard | Web | Customers with a selected row (Mobbin) | https://mobbin.com/screens/d412df8a-c1d6-4d9c-af5d-04fd317f627f | 2026-11-20 | Filter chips (Email, Card, Created date, Type, More filters), sortable column headers, row checkbox, a bar showing "1 selected", Deselect, Copy and a destructive action with a keyboard hint, a per-row overflow menu. | [Observed] |
| Stripe Dashboard | Web | Transactions filter popovers (Mobbin) | https://mobbin.com/screens/4bbb46ff-471b-494d-a543-4e5075d63788 ; https://mobbin.com/screens/373146e1-8686-43b0-8a10-5da707dc8873 | 2026-11-20 | Each filter is a chip that opens a small popover with an Apply button; active filters show their value in the chip; "Clear filters" appears; status counts at top act as tabs. | [Observed] |
| Stripe Dashboard | Web | Global search results grouped by object (Mobbin) | https://mobbin.com/screens/9a241073-d70a-41ef-937e-2c3db273fb34 | 2026-11-20 | Results grouped under Subscriptions, Quotes, Payments with "View N results", matched text highlighted. | [Observed] |
| Notion | Web | Database table with selected rows (Mobbin) | https://mobbin.com/screens/f49ef73e-f5ea-4da3-b785-f9c768aaca1b ; https://mobbin.com/screens/f63163ee-9eaa-4c17-9095-9e00d896a659 | 2026-11-20 | Two rows selected with a floating toolbar of property actions; row action menu with Duplicate, Move, Archive, Move to Trash and shortcuts. | [Observed] |
| Linear | Web | Active issues grouped by status; shortcut sheet (Mobbin) | https://mobbin.com/flows/7f061cb3-54c7-48de-a070-6c6cde5f443f | 2026-11-20 | A group header "Todo 10" over dense single-line rows; a shortcut sheet with single-key row actions (A assign, S status). Grouped list with keyboard row actions. | [Observed] |
| Fresha | Web | Appointments table (Mobbin) | https://mobbin.com/screens/e169cd60-917a-4a4c-8266-f2f421c1c122 | 2026-11-20 | Search by reference or client, date range dropdown, Filters button, sort control, a table whose reference and client are links, "Viewing 1 to 7 of 7 results". | [Observed] |
| Calendly | Web | Contacts table with filter builder (Mobbin) | https://mobbin.com/screens/a633760b-536f-4387-af06-8056089fa6cc | 2026-11-20 | Quick-filter pills (All contacts, New contacts, No activity in next 30d), "Show columns", an advanced "Where field is value" filter panel with Add condition and Reset filters, rows-per-page select. | [Observed] |
| folk (CRM) | Web | People table with filter (Mobbin) | https://mobbin.com/screens/5bdd96ea-2d5f-453c-8363-586c5733f071 | 2026-11-20 | Saved views in the left list (Pipeline, All applicants, All people), a filter row with field, operator, value and Applied/Reset; coloured status labels. | [Observed] |
| Employment Hero | Web | Bulk document issue, step 1 select personnel (Mobbin) | https://mobbin.com/screens/5cc27a92-8943-4040-bb5e-d16accf703fc | 2026-11-20 | A wizard stepper over a filtered people table with select-all checkbox and a "Selected personnel: 0" counter. | [Observed] |
| Wix | Web | Booking list with right filter panel (Mobbin) | https://mobbin.com/screens/3d24fd4c-4f1e-44b1-b86d-11a734f43b17 | 2026-11-20 | Filters in a right-hand panel with accordion sections and "2 filters selected, Clear, Apply". | [Observed] |
| Heidi | Web | Sessions list and Tasks page (Mobbin) | https://mobbin.com/flows/617eab3e-2cc7-46f5-a948-0559fa3fdb69 | 2026-11-20 | Left list of sessions with patient initials; Tasks page with search "for a task or patient", Status, Category, Date filters and Reset filters. | [Observed] |
| WebPT EMR | Web | Dashboard patient search (help article) | https://help.emr.webpt.com/article/1114-webpt-dashboard | 2026-11-20 | Quick search by partial name or patient ID with an option to open Patient Manager for more fields. Text only. | [Observed] text |
| WebPT HEP | Web | Program builder (help article) | https://help.hep.webpt.com/article/232-home-exercise-program-overview | 2026-11-20 | A separate "Find a Patient" bar at the top and icons by the patient name opening overview or progress tracking: row-level shortcuts into the record. Text only. | [Observed] text |
| SPRY, MedBridge, Tebra, Medplum, Epic | Web | Patient list screens | n/a | 2026-11-20 | Not on Mobbin and no public screens retrieved for a patient list. Medplum Provider README does not mention a patient list. | Not accessible |

## 7. Established patterns

1. For structured records with many attributes, the table wins. Every reference that lists people, customers or bookings uses one. [Observed]
2. Named views as pills above the table (Stripe, Calendly, folk) put the common questions one click away without a filter form. [Observed]
3. Filters appear as chips that show their current value and open a small popover (Stripe) or as a condition builder (Calendly, folk) once the common ones are not enough. [Observed]
4. Search is one wide field. Result counts are stated as text below the table. [Observed]
5. Row selection and a contextual action bar appear only after a row is selected (Stripe, Notion). Row overflow menus hold secondary actions. [Observed]
6. Grouped dense lists exist where one attribute dominates, with a count in the header (Linear). [Observed]
7. Keyboard: one key to focus search is the minimum; richer tools publish a shortcut sheet (Linear). [Observed]

## 8. Alternatives

### A. Dense sortable table with named views and filter chips

- Interaction model: one table, one wide search, named view pills (All, My patients, Needs review, No activity in 14 days, Awaiting assignment, Intake incomplete), filter chips for the rest, sortable headers, per-row overflow menu, optional selection column. Enter opens the record; a peek drawer (a read-only preview) opens on a key or a row control.
- Benefits: best scanning and comparison; every field the API returns is sortable or filterable in one view; maps to nearly every reference; the current table is a short step from it.
- Limitations: a table is harder at narrow widths; dense data needs careful hierarchy to avoid the "wall of Active" the screenshot shows.
- Accessibility: real `<table>`, `aria-sort`, chips as buttons with the popover as a dialog, selection with a count announced politely.
- Business: fastest retrieval; saved views create a reason to return without engagement tricks.
- Technical: low. API supports every filter and sort already; named views are client-side presets of query parameters until REQ-DIR-02 gets an endpoint.
- Error and recovery: filter errors keep the previous results visible and dimmed (already done with `keepPreviousData`); zero results offers "Clear filters".
- Evidence: Stripe, Calendly, folk, Fresha, Notion [Observed]; the current screenshot problems [Observed].

### B. Master-detail layout

- Interaction model: compact list on the left (name, status, one line of signal), selected patient's summary on the right; the record opens from the summary.
- Benefits: context preserved while moving down a list; works for a small caseload.
- Limitations: a narrow list shows far fewer columns, so comparison and sorting by a second attribute is weak; duplicates the record summary (J); more PHI visible on screen at once. At 100 rows per page it is a poor fit.
- Accessibility: two-pane focus management; list/detail fallback below 1024.
- Business: neutral.
- Technical: medium; needs a summary fetch per selection (record header, plan, latest check-in).
- Error and recovery: summary pane fails on its own.
- Evidence: Linear Inbox, Heidi sessions [Observed]; those are item lists of one or two attributes, not registries [Judgement].

### C. Grouped patient list

- Interaction model: patients grouped under collapsible headings (by status, by clinician or by plan stage) with counts, each row one line.
- Benefits: helps when one attribute drives work (for example "Awaiting assignment" for a coordinator).
- Limitations: grouping by one attribute hides the others; a patient can only be in one group; long groups still need search. Group collapse state adds hidden information.
- Accessibility: headings with expand buttons; manageable.
- Business: neutral.
- Technical: low to medium. Server returns a flat sorted page; grouping a paginated list on the client breaks across pages unless sorting equals grouping.
- Error and recovery: grouping and pagination conflict; needs a warning.
- Evidence: Linear groups [Observed]; the pagination conflict is [Judgement].

### D. Prioritised operational queue

- Interaction model: the directory sorted by need (open reviews first, then oldest activity), shown as a ranked list with the reason for each position.
- Benefits: good for "who needs me"; reduces scanning.
- Limitations: poor for finding a named patient; ranking rules look like hidden scoring (REQ-RVQ-04 forbids a score); the API sort options do not include open reviews or next visit, so a server-side ranked sort needs an API change; it duplicates the Overview (H).
- Accessibility: ranked list needs the rule written out.
- Business: strong for follow-up, weak for retrieval.
- Technical: medium (API sort change) or poor (client-side ranking breaks pagination).
- Error and recovery: if the rule changes, order changes without notice; must state the rule.
- Evidence: WebPT tasking, Linear My issues [Observed]; overlap with H [Judgement].

## 9. Mandatory gates

| Alternative | Accessibility | Privacy | Safety | Result |
|---|---|---|---|---|
| A. Table + views + chips | Pass | Pass: minimal columns; bulk limited to non-clinical actions | Pass: no bulk "mark reviewed", views name their rule in words | Eligible |
| B. Master-detail | Conditional on fallback | Conditional: more PHI visible at once; needs the same minimal rule in the preview | Pass | Eligible with conditions |
| C. Grouped list | Pass | Pass | Pass | Eligible |
| D. Operational queue | Pass if rule is written | Pass | Conditional: no score or hidden ranking | Eligible with conditions |

Added rule from this research: **bulk actions on clinical items are barred.** A bulk "mark reviewed" or bulk resolve would let a clinician record a clinical review without reading the item. This is a safety judgement, not a technical limit. Administrative bulk (for coordinators) is a later question and needs an API.

## 10. Weighted evaluation

Weights adjusted for this feature, with reason: task 25, safety/privacy/trust 20, usability/accessibility 20, **business 10 (down from 15)**, **operational efficiency 15 (up from 10)**, technical 5, design system 5. Reason: retrieval speed is mostly an efficiency question here, and the business case beyond that is thin. Scores are [Judgement] from the observations above.

| Criterion (weight) | A Table | B Master-detail | C Grouped | D Queue |
|---|---|---|---|---|
| Task effectiveness (25) | 5: search, scan, compare, open | 3: few columns, weak compare | 3: grouping hides other attributes | 3: poor for named search |
| Safety, privacy, trust (20) | 4: minimal columns, rule-named views | 3: more PHI on screen | 4 | 4: but ranking risks looking like a score |
| Usability, accessibility (20) | 4: native table, chips | 3: two panes | 3: group state to track | 3: rule explanation needed |
| Business value (10) | 4: faster retrieval, saved views | 3 | 3 | 3 |
| Operational efficiency (15) | 5: Enter to open, views, shortcuts | 3 | 3 | 4: for follow-up only |
| Technical feasibility (5) | 5: API supports all | 3: summary fetches | 4 | 2: API sort change |
| Design-system consistency (5) | 4: Table exists | 3 | 3 | 4 |
| **Weighted (out of 5)** | **4.45** | **3.00** | **3.25** | **3.45** |

## 11. Recommendation

Selected: **A, dense sortable table**, with named views as pills, filter chips for the remaining filters, a per-row action menu, a "Back to results" link from the record that restores the same filters, and a peek drawer on demand. Columns stay minimal: name, MRN, status, clinician, plan stage, last activity, next visit, open reviews. Add the missing `hasUpcomingAppointment` filter control. Handle administrative rows properly (separate columns: intake status, missing intake) instead of dropping them.

Why it beats the runner-up D: D answers "who needs me" but loses name search and needs an API sort change. A can include D's question as a named view ("Needs review", sorted by what the API can sort) without making ranking the model, and H already carries the work-queue job.

Runner-up: **D, operational queue**, kept as the "Needs review" view and as H's territory.

Rejected: B (not a fit for a registry, more PHI on screen), C (conflicts with server pagination). Cards for the directory are rejected on the brief's rule: dense structured information stays in a table.

Trade-off: some density remains; the design must use weight and spacing to stop the table reading as a wall of identical words, for example by showing status only when it is not the default. Saved personal views need an API (REQ-DIR-02); until then the named views are fixed presets.

## 12. Requirement alignment row

| Field | Entry |
|---|---|
| User segment | Physical therapist; care coordinator and admin (administrative rows) |
| Job to be done | Find one patient fast, or find a group sharing a situation, and open the right record |
| Pain point | Six dropdowns above the table, one action per row, three sortable columns, administrative rows dropped |
| Business objective | Faster retrieval, fewer wrong-patient opens |
| Functional requirement | REQ-DIR-01 server-side search, sort, filters, pagination; REQ-DIR-02 saved filters (stretch) |
| Success metric | Time to record open; search-to-open rate; wrong-record backtrack rate; zero-result rate |
| Design hypothesis | [Assumption] Named views and chips reach the common questions in one click and free vertical space, without losing any current filter |
| Selected pattern | Dense table with views, chips, row menu and optional peek |
| Technical dependency | `GET /patients` (exists); API change only for new sort fields or saved views |
| Validation method | Timed find-this-patient and find-this-cohort tasks against the current page (not run); keyboard-only run; axe on table semantics and chip popovers |

## 13. States to design

| State | Microcopy (draft) | Recovery |
|---|---|---|
| Default | "Patients 1 to 25 of 87" | None |
| Hover / focus / active / selected | Row highlight plus visible focus on the name link; selected row announces "Selected, 1 of 87" | Esc clears selection |
| Loading | "Loading patients" skeleton; changing a filter dims the old rows | None |
| Empty, no patients | "No patients in your clinic yet." | None |
| Empty, filtered | "No patients match. Try fewer filters." | "Clear filters" |
| Partial data | A column that could not load shows "Not loaded", never blank | "Try again" |
| Validation error | Not applicable (no free-text entry beyond search) | n/a |
| Server error | "Patients could not be loaded." | "Try again", previous rows stay if present |
| Network loss | "You are offline. Showing results from 9:02 AM." | Retry on reconnect |
| Permission denied | Role without `patient.read`: "You do not have access to the patient directory." | Link to the home screen |
| Stale information | "Results as of 9:02 AM" with refresh | Refresh |
| Success | Row action (for example "Open plan builder") navigates; no toast needed | None |
| Disabled | "Open plan builder" disabled for non-care-team with the existing reason text | None |
| Cancellation | Closing the peek drawer returns focus to the row | None |
| Interrupted workflow | Leaving to a record and returning restores filters, sort, page and the selected row | "Back to results" |

Not applicable: unsaved changes, bulk success (no bulk clinical actions).

## 14. Responsive behaviour

| Width | Behaviour |
|---|---|
| 1920 | Full table, all columns, peek drawer on the right without reflow |
| 1440 | Full table; filter chips on one line |
| 1024 | Hide MRN and care plan version detail behind the row (still reachable in peek); views pills scroll |
| 768 | Table keeps Patient, Status, Next visit, Open reviews; other fields in the peek drawer |
| 390 and 375 | Table changes model to a stacked list of rows (name, status, one line of signal), not cards with decoration; filters in a bottom sheet; search always visible. Clinician mobile is secondary [Assumption] |

Always stays: search, view pills (scrollable), result count text, patient name. Moves to panels: filter popovers, peek drawer. Changes model: below 768 from table to a stacked row list.
