# 09. Complex tables, search, filter and sort

Protocol: `docs/design/component-research/PROTOCOL.md`. Brief section 10 and sections 9, 21 to 23. Builds on `docs/design/feature-research/I-patient-directory.md` (selected there: dense sortable table with named views, filter chips, row menu, peek) and `L-review-queue.md` (selected there: table with contextual detail pane). Access date for every external source: 2026-11-20. Colours are not chosen; semantic token roles only. Decision records: CD-330 to CD-343. Prototype spec: `docs/design/design-alternatives/prototypes/clinician-directory.md`.

Labels: **[Observed]** retrieved and read or viewed this session; **[Prior]** carried from the feature research files, not re-retrieved; **[Code]** repository today; **[Judgement]**; **[Assumption]**. Scores are heuristic 1 to 5 judgements, not measurements. Default weights: task 25, accessibility 25, error prevention and trust 20, business and operational 15, interaction efficiency 10, implementation and maintenance 5.

## 0. Facts from code that bound the decisions

1. **Patient names can reach the URL.** `directory.tsx` writes the search term `q` to the query string (`params.get("q")`), and the admin patients screen does the same [Code]. The directory feature research states the URL "holds filter values, not names" [Prior I section 4]. That statement is wrong whenever the clinician searches by name or MRN. Browser history, server logs, referrers and screen-shares then carry a patient identifier. Decision CD-333 addresses this.
2. Directory page position is not in the URL: the cursor stack and page index live in component state (`useState`) [Code]. Filters, sort and page size are in the URL. "Back" from a record therefore restores filters but not the page.
3. Two paging models: cursor Previous and Next with a range line in the directory and admin tables; "Load more" in the review queue, library, record tabs, appointments tab and thread, in five visual variants [Code, matrix A3 and G4]. The two pagination blocks are near copies (`directory.tsx` about 375 to 415, `patients.tsx` about 305 to 330).
4. Filter fields are built five ways: `Filter` (queue), `FilterField` (directory), raw label and control (library, admin), `DayStepper` (schedule) [Code, matrix A3].
5. Sorting works on three columns only (name, status, last activity), an API limit. Headers for unsortable columns must not look sortable [Prior I].
6. Whole-row `onClick` on `Tr` in directory and queue; truncated cells rely on `title`; header rows built with raw `<tr>` in five tables and `Tr` in two [Code, matrix A3].
7. `DropdownMenu`, `Popover` and `Tooltip` exist in `ui` but no route uses them [Code, matrix A1]. Using them is a deliberate change.
8. The API has no "suggest" endpoint, no saved-view endpoint (REQ-DIR-02 is stretch), and does not sort by next visit or open reviews [Prior I section 4].

## 1. Decision: directory layout (CD-330)

### 1.1 Task, journey, information, action
A therapist or coordinator finds a specific patient fast (name or MRN heard or read from a card), or finds a group sharing a situation (no activity for two weeks, draft plan, open review, no upcoming visit), and opens the right record. Desktop, many times a day for search, a few times a week for cohorts [Assumption].

### 1.2 Requirements and constraints
Business: faster retrieval, fewer wrong-patient opens. Healthcare and privacy: every row is PHI-like; show the minimum columns needed to identify and triage; bulk actions on clinical items are barred (a bulk "mark reviewed" would let a review be recorded without reading) [Prior I section 9]. Server-side filtering, cursor paging, three sortable columns.

### 1.3 Production examples
| Product | Platform | Screen | URL | Observation | Label |
|---|---|---|---|---|---|
| Stripe | Web | Product catalogue | https://mobbin.com/screens/3bbdc1d4-e374-424b-93e7-b25ba0cedfec | Section tabs, a row of pill filters (All, Forever, Once, Repeating), a Filter button and a view settings button, a table with a plain-text status label, footer text "1 to 16 of 16 results" with Previous and Next chevrons. | [Observed] |
| Mercury | Web | Transactions | https://mobbin.com/screens/5ffa41d6-621d-409d-b2fc-34914afe0458 | A "Saved views" menu, a Filters panel with a category list, removable chips for active filters ("Anything matching Apple", "Money out"), Reset, Create view, row checkboxes. | [Observed] |
| Meetup | Web | Members | https://mobbin.com/screens/c9704a3c-644d-4aba-8780-128aabb8921b | Search field, quick pills (Active organizers, Joined past 30 days), a row of dropdown filters (Role, Groups, Location, RSVP count, Join date, Last visit), sortable column headers with arrows, row checkboxes, bottom bar with member count and actions. | [Observed] |
| Browserbase | Web | Sessions | https://mobbin.com/screens/7f018244-22df-44fb-832a-4f883773bb49 | Active filter chip "Status is Completed" with remove, a "+" menu to add filters (Status, Region, Date with presets and a custom range), Clear filters, a Sort dropdown "Newest", footer "25 per page", "Viewing 1 to 3 results" and Previous and Next. | [Observed] |
| Calendly | Web | Contacts | https://mobbin.com/screens/a633760b-536f-4387-af06-8056089fa6cc | Search by name and email, Show columns, a Filter popover with "Where field is value", Add condition, Reset filters and Apply, quick pills (All contacts, New contacts, No activity in next 30d), "Items per page 25", "Showing 1 to 5 of 5". | [Observed] |
| n8n | Web | Data table | https://mobbin.com/screens/0874afd0-bcf6-4801-a14c-a601be68cdc8 | Search, Add Row, typed column headers, row checkboxes, footer "Total 3", page buttons and a "20/page" select. | [Observed] |
| Stripe Customers, Notion, Linear, Fresha, folk, Wix, Heidi, WebPT | Web | List and table screens | see I section 6 | Saved-view pills, chips with popovers, selection bars, grouped lists, simple counts. | [Prior I] |
| Epic, Tebra, MedBridge, SPRY, Medplum | Web | Patient lists | n/a | No public patient-list screens retrieved. | Not accessible |

### 1.4 Design-system guidance
Carbon data table: sort by header with an arrow on the sorted column; a toolbar for global actions with at most five actions; expandable rows for supplementary detail; density by row height with header, toolbar and pagination matched to it; pagination at the bottom with items per page and range (https://carbondesignsystem.com/components/data-table/usage/) [Observed]. APG: native `table` is preferred, a table's cells are not focusable, `aria-sort` goes on the sorted header cell (https://www.w3.org/WAI/ARIA/apg/patterns/table/) [Observed]. DHCW's repository lists a Search component and a patterns folder that covers tables but its page gave no detail [Observed, thin]. Brief section 9: do not use a table for information that does not benefit from row and column comparison, and do not use oversized cards for repeated clinical records [brief]. Polaris index-filters page redirected to a different site and was not read; Apple HIG, Material 3, NN/g and Baymard pages for tables and filters were not retrievable.

### 1.5 Alternatives
Layout A: dense table with named view pills, a collapsible filter panel and removable chips. Layout B: master-detail, a compact list left and the selected patient's summary right. Layout C: searchable stacked list, single-line rows (name, status, one signal line) with search on top. The three structurally different layouts are the subject of the prototype spec.

### 1.6 Gates
| Alt | Accessibility | Privacy | Safety | Result |
|---|---|---|---|---|
| A | Pass: native table, `aria-sort`, labelled controls | Pass: minimal columns; names not placed in the URL (CD-333) | Pass: no clinical bulk action; each view states its rule in words | Eligible |
| B | Conditional: two-pane focus management and a list or detail fallback below 1024 | Conditional: more PHI visible at once; the summary pane must show only what the row shows plus the minimum | Pass | Eligible with conditions |
| C | Pass | Pass | Pass | Eligible |

### 1.7 Weighted evaluation
| Criterion (weight) | A Dense table, views, chips | B Master-detail | C Searchable stacked list |
|---|---|---|---|
| Task effectiveness (25) | 5 | 3 | 3 |
| Accessibility and usability (25) | 4 | 3 | 4 |
| Error prevention and trust (20) | 4 | 3 | 3 |
| Business and operational (15) | 4 | 3 | 3 |
| Interaction efficiency (10) | 5 | 3 | 3 |
| Implementation and maintenance (5) | 5 | 3 | 4 |
| **Total (of 5)** | **4.40** | **3.00** | **3.30** |

Order matches I, which scored A 4.45, B 3.00, C-grouped 3.25 under slightly different weights.

### 1.8 Selected and rejected
Selected: **A, dense sortable table** with named view pills, a collapsible filter panel (CD-331), removable filter chips, one wide search (CD-342), a row overflow menu (CD-337), "Back to results" restoring filters, sort and page (CD-333), and a peek drawer on demand. Columns: name, MRN, status shown only when not the default, clinician, plan stage (CD-305 vocabulary), last activity, next visit, open reviews. Why not B: a registry with eight attributes and sort needs columns; a two-pane list drops the columns that make comparison possible and puts more PHI on screen; B's summary duplicates the record header. Why not C: it is the mobile model, not a better desktop one; kept as the stacked layout below 768 (CD-339). Cards were not offered: the brief rules them out for dense clinical records.

### 1.9 Spec: `PatientTable` (directory) and the shared `DataTable` it uses
- **Anatomy:** page header with count ("Patients 1 to 25 of 87"), search, view pills, "Filters (n)" disclosure and panel, removable chip row, table with caption and sortable headers, row primary link in the first cell, trailing row menu, footer with range text, Previous and Next, rows per page.
- **Use / not use:** any list of structured records compared across attributes: directory, admin patients, appointments table, record tab tables. Not for feeds (CD-335) or a single record's facts (description list).
- **Variants:** `clinical` and `administrative` column sets chosen from the API `view` field; the administrative set has intake status and missing intake and replaces the current silent drop of administrative rows [Code, Prior I weakness 5].
- **States:** default; loading (skeleton rows on first load; on refetch keep previous rows with `aria-busy` and a polite status); empty with no patients ("No patients in your clinic yet."); filtered empty (CD-336); partial (a column that failed shows "Not loaded", never blank); error ("Patients could not be loaded." with Try again, previous rows stay if present); permission denied; stale ("Results as of 9:02 AM" with refresh); row hover and focus-visible; selected row when the peek is open; long names wrap at two lines (no `title` truncation); offline.
- **Behaviour:** changing a filter, view, sort or search returns to the first page (GOV.UK practice for lists [Observed]); the page stays in the URL as an opaque cursor token and the page index, never a name; view pills set query parameters and name their rule in a visible line ("Needs review: patients with one or more open review tasks").
- **Keyboard:** `/` focuses search (existing); Tab reaches search, pills, Filters, chips, sortable headers, each row's primary link, each row menu button; ArrowUp and ArrowDown between first-cell links stay as an enhancement only (CD-338); Enter opens.
- **Screen reader:** `table` with caption "Patients"; sorted header has `aria-sort`; count and range are a polite status; chips are a labelled list ("Active filters") whose remove buttons are named ("Remove filter Status: Active").
- **Responsive:** see CD-339.
- **Data:** `GET /patients` (filters, sort, cursor, limit, view), clinicians list for the filter. **Permissions:** `patient.read`; row menu items follow care-team rules with visible reasons. **Testing:** axe on table semantics and chip controls; keyboard-only retrieval task; long and short name fixtures; administrative rows; URL contains no `q`; Back restores page.

## 2. Decision: filter pattern (CD-331)

### 2.1 Task
Narrow the directory (and the queue, library, admin list) by status, clinician, plan stage, activity, review, upcoming visit. Common cohorts should be one click; rarer combinations a few; the table must stay in view.

### 2.2 Constraints
Six selects wrapped over the table push it about 230 px down at 1440 [Prior I, from a screenshot]. The API supports `hasUpcomingAppointment` with no control. Patients never see enterprise filtering (brief section 10). Filter controls are built five ways today (0.4).

### 2.3 Production examples
Mercury (saved views plus Filters panel plus chips), Meetup (quick pills plus a row of dropdown filters), Browserbase (chip with remove plus "+" add menu), Calendly Contacts (pills plus Filter popover with Apply and Reset), Stripe catalogue (pills plus Filter button) [all Observed, 1.3]. Wix right-hand filter panel with "2 filters selected, Clear, Apply" and Stripe chip popovers [Prior I].

### 2.4 Guidance
Carbon: reserve the toolbar for global actions and complex filters, at most five (https://carbondesignsystem.com/components/data-table/usage/) [Observed]. GOV.UK: applying a filter or sort applies to the whole list and returns to the first page (https://design-system.service.gov.uk/components/pagination/) [Observed]. Polaris and NN/g filter guidance not retrieved.

### 2.5 Alternatives
A. Always-visible filter bar of labelled selects (current). B. View pills, a "Filters (n)" disclosure that opens an inline panel of labelled native selects, and removable chips for active filters. C. Chip popovers, each filter its own popover with Apply. D. A modal or side filter drawer.

### 2.6 Gates
A pass. B pass: native selects, a disclosure button with `aria-expanded`. C conditional: popovers with select-like lists need focus return, Escape and a custom listbox or radio group; the product has never used `Popover`. D conditional: a modal drawer hides the results while filtering, so the effect of each choice is not visible; needs an Apply step.

### 2.7 Evaluation
| Criterion (weight) | A Always-visible filter bar (current) | B Views, inline panel, removable chips | C Chip popovers | D Filter drawer |
|---|---|---|---|---|
| Task effectiveness (25) | 3 | 5 | 4 | 3 |
| Accessibility and usability (25) | 5 | 5 | 3 | 3 |
| Error prevention and trust (20) | 4 | 4 | 4 | 4 |
| Business and operational (15) | 3 | 4 | 4 | 3 |
| Interaction efficiency (10) | 3 | 4 | 5 | 2 |
| Implementation and maintenance (5) | 5 | 4 | 2 | 3 |
| **Total (of 5)** | **3.80** | **4.50** | **3.75** | **3.10** |


### 2.8 Selected and rejected
Selected: **B**, one shared `FilterBar` replacing the five hand-built variants: search and view pills always visible; "Filters (n)" opens an inline panel (not an overlay) of labelled `Select`s built on the existing `FilterField`; active filters appear as removable chips under the bar with a "Clear filters" button; changes apply immediately (no Apply) and the count updates. The panel is closed by default when no filter is active, open and showing chips when some are. Rejected: A (keeps six controls on screen permanently); C (higher cost, more accessibility risk, no gain for six fields; may return if filters multiply); D (hides results while filtering; reserve a drawer for the stacked mobile list only if the inline panel proves too tall, see CD-339).

### 2.9 Spec: `FilterBar`
- **Anatomy:** `role="search"` form: labelled search input, view pills (`ToggleChip`-style buttons in a group named "Views"), "Filters (n)" button, panel, chips list, "Clear filters".
- **Reset behaviour:** "Clear filters" resets filters and search but keeps the sort; resets to the first page; focus moves to the search field and the result count is announced.
- **Defaults:** each screen declares its default view and the default is not counted as an active filter (admin patients defaults to "Awaiting assignment", which is a default and shows as the selected pill, not a chip).
- **States:** default, active filters, loading (control stays enabled, results dim), error (filter options failed to load: the select shows "Not loaded" with Try again), disabled when offline.
- **Keyboard:** Tab order search, pills, Filters, panel fields, chips; Enter or Space toggles the panel; Escape inside the panel closes it and returns focus to "Filters".
- **Screen reader:** the count of active filters is part of the button name ("Filters, 2 active"); chip removal announced ("Status: Active removed. 87 patients").
- **Responsive:** CD-339.
- **Testing:** axe, chip removal focus (focus goes to the next chip or to "Clear filters"), reset behaviour, URL round trip.

## 3. Decision: saved views (CD-332)

### 3.1 Task and constraints
Return to a recurring question ("my patients who need a follow-up") in one click. REQ-DIR-02 saved filters is stretch with no API [Prior I]. Named views as pills exist in Stripe, Calendly and folk; Mercury has a Saved views menu with Create view [Observed 1.3, Prior I].

### 3.2 Alternatives
A. Fixed system-defined views as pills that are presets of query parameters. B. Personal saved views (create, rename, delete) stored on the server. C. Views as tabs above the table. D. No views.

### 3.3 Gates and evaluation
B needs an API and a privacy review (a saved view's filter could encode a patient name if search text is saved: saved views must never store `q`). C passes but tabs imply separate pages and are keyboard-heavier with many views.
| Criterion (weight) | A Fixed named views (pills) | B Personal saved views | C Views as tabs | D No views |
|---|---|---|---|---|
| Task effectiveness (25) | 4 | 5 | 3 | 2 |
| Accessibility and usability (25) | 5 | 4 | 3 | 5 |
| Error prevention and trust (20) | 4 | 4 | 3 | 3 |
| Business and operational (15) | 4 | 5 | 3 | 2 |
| Interaction efficiency (10) | 5 | 5 | 4 | 2 |
| Implementation and maintenance (5) | 5 | 1 | 4 | 5 |
| **Total (of 5)** | **4.40** | **4.35** | **3.15** | **3.10** |


A and B are within 0.05, and the order is heuristic: the decision turns on the missing API and the privacy rule, not on the score.

### 3.4 Selected
**A.** Views for the directory: All patients, My patients, Needs review (open reviews), No activity in 14 days, No upcoming visit, Awaiting assignment, Intake incomplete (administrative roles see the last two). Each is a preset of existing query parameters; each states its rule in a visible line under the pills; the number 14 is a clinic-configurable default to be confirmed [Assumption]. Pills appear for the roles that can use them. The selected pill is `aria-pressed` with the word state kept visible. B is deferred behind the API (REQ-DIR-02) and the rule that a saved view never stores search text. C rejected, D rejected.

## 4. Decision: URL synchronisation (CD-333)

### 4.1 Task and finding
Filters, sort and page should survive reload, Back, and sharing a link between colleagues without sharing patient identifiers. Finding 0.1: `q` is written to the URL; finding 0.2: page position is not.

### 4.2 Alternatives
A. Everything in the URL, including `q` (current for `q`). B. Filters, view, sort, page size and an opaque page token in the URL; `q` kept out of the URL and restored from `sessionStorage` for "Back to results". C. Nothing in the URL; all in memory. D. Everything in the URL but `q` hashed.

### 4.3 Gates
A **fails the privacy gate**: a patient identifier (name or MRN) enters browser history, access logs, referrers and screenshots. C passes privacy and fails usability (no reload, no share, Back loses filters). D: a hash of a short name is trivially reversible for lookup and adds nothing for a reader. B passes if `sessionStorage` is tab-scoped, cleared on sign out and on tab close, and holds only the search text and nothing returned by the API.

| Criterion (weight) | A Everything in URL including search text | B Filters, sort, page in URL; search text kept out | C Nothing in URL | D Search text hashed in URL |
|---|---|---|---|---|
| Task effectiveness (25) | 4 | 4 | 2 | 3 |
| Accessibility and usability (25) | 4 | 5 | 3 | 4 |
| Error prevention and trust (20) | 1 | 5 | 3 | 2 |
| Business and operational (15) | 3 | 4 | 2 | 3 |
| Interaction efficiency (10) | 4 | 4 | 2 | 3 |
| Implementation and maintenance (5) | 5 | 3 | 5 | 3 |
| **Total (of 5)** | **3.30** | **4.40** | **2.60** | **3.05** |


### 4.4 Selected
**B.** URL keeps `view`, filter keys, `sort`, `limit` and `page` as an opaque token (a short server cursor or the page index with the sort and filters it is valid for); `q` lives in component state and `sessionStorage` under a per-screen key. "Back to results" in the record header returns to the URL and rehydrates `q`. Opening a record in a new tab shows the filters but not the search term, which is acceptable and stated in testing. Document titles and breadcrumbs of record pages keep patient names (existing) and are listed as a related privacy risk for shared screens [Prior I section 4]. The review queue's `task` parameter is an id, not a name, and stays. The admin patients screen follows the same rule. `sessionStorage` use is [Assumption: needs advisor view on storing a search term client side for the lifetime of a tab].

(The weighted scoring for this decision is secondary to the gate result: A is excluded, C fails the usability need, D adds nothing; B is the only remaining pattern, with scores in the table above shown for completeness.)

## 5. Decision: pagination model (CD-334)

### 5.1 Task and evidence
Let people move through more rows than one page holds, know where they are, and keep their place. API: cursor pages with limit 25, 50 or 100, and a total of matching rows [Prior I, Code].

### 5.2 Guidance
GOV.UK, NHS, USWDS, CMS and Atlassian all describe pagination for search results, directories and table listings; all use a navigation landmark with a label, mark the current page, and hide Previous on page one and Next on the last page. GOV.UK and NHS advise against infinite scroll because of keyboard users; GOV.UK says a changed filter or sort returns to page one and the page number belongs in the page title. CMS: move focus to the main heading after a page change, and use a compact "Page X of Y" on small screens. Atlassian: at most seven controls on small screens. Carbon: a table pagination variant with items per page and a range line, and a nav variant with numbered pages (https://design-system.service.gov.uk/components/pagination/, https://service-manual.nhs.uk/design-system/components/pagination, https://designsystem.digital.gov/components/pagination/, https://design.cms.gov/components/pagination/, https://atlassian.design/components/pagination/usage, https://carbondesignsystem.com/components/pagination/usage/) [all Observed]. Baymard and NN/g pages on load more versus pagination were not retrievable, so no research claim about preference is made here; the decision relies on the official guidance and on the API.

### 5.3 Alternatives
A. Previous and Next with a range line and rows per page (cursor). B. Numbered pages. C. Load more. D. Infinite scroll. Evaluated separately for tables (where position and comparison matter) and feeds (chronological or task lists that are worked top down).

### 5.4 Gates
D fails accessibility: automatic loading near the bottom causes the problems the NHS and GOV.UK pages warn about, and it removes the footer and any end of list. B fails feasibility, not accessibility: a cursor API cannot jump to page n or state "of Y" pages except by counting; the matching total exists, so "of N rows" is possible but numbered links are not without an API change.

### 5.5 Evaluation: tables (directory, admin patients, record history, appointments tables)
| Criterion (weight) | A Previous and Next with range text, cursor | B Numbered pages | C Load more | D Infinite scroll |
|---|---|---|---|---|
| Task effectiveness (25) | 4 | 4 | 3 | 3 |
| Accessibility and usability (25) | 5 | 5 | 4 | 1 |
| Error prevention and trust (20) | 4 | 4 | 3 | 2 |
| Business and operational (15) | 4 | 4 | 3 | 3 |
| Interaction efficiency (10) | 4 | 4 | 3 | 4 |
| Implementation and maintenance (5) | 5 | 1 | 5 | 3 |
| **Total (of 5)** | **4.30** | **4.10** | **3.35** | **2.40** |


### 5.6 Evaluation: feeds (review queue, exercise library, record timeline, thread, appointments list)
| Criterion (weight) | A Previous and Next | B Numbered pages | C Load more | D Infinite scroll |
|---|---|---|---|---|
| Task effectiveness (25) | 3 | 2 | 4 | 3 |
| Accessibility and usability (25) | 4 | 4 | 5 | 1 |
| Error prevention and trust (20) | 3 | 3 | 4 | 2 |
| Business and operational (15) | 3 | 3 | 4 | 3 |
| Interaction efficiency (10) | 2 | 2 | 4 | 4 |
| Implementation and maintenance (5) | 5 | 1 | 5 | 3 |
| **Total (of 5)** | **3.25** | **2.80** | **4.30** | **2.40** |


### 5.7 Selected
**Two components, chosen by list type, each used everywhere that type appears:** `TablePagination` (A) for directory and admin patients and any table where a clinician compares rows; `LoadMore` (C, CD-335) for feeds and task lists. Duplicate pagination blocks in `directory.tsx` and `patients.tsx` are replaced by `TablePagination`. B is deferred behind an API that can jump. D is rejected.

### 5.8 Spec: `TablePagination`
Anatomy: `nav` labelled "Pagination of patients", range line "Patients 26 to 50 of 87 matching" (polite status), Previous and Next buttons (hidden on first and last page per the design systems above, not disabled with no reason), rows per page select (25, 50, 100). Behaviour: page change moves focus to the table caption, keeps sort and filters, and announces the new range; changing rows per page returns to page one; the last page may be partial. Keyboard: native buttons. Screen reader: current range text is the only status; no page numbers exist so no `aria-current`. Responsive: below 768 the range and two buttons fill the width, rows per page moves under them. States: loading (buttons disabled for the pending request with the range text kept), error (inline message, previous rows stay), single page (the nav is not rendered but the range line remains). Testing: cursor stack edge cases (Previous after a filter change), focus after page change, axe.

## 6. Decision: load-more component (CD-335)

### 6.1 Task and finding
Five visual variants exist (secondary sm, quiet sm, secondary sm, secondary sm, secondary md) and different wording ("Load more", "Show more visits", "Show earlier messages", "Show later days") [Code, matrix A3]. Calendly shows a "View more meetings" button after a day-grouped list and "No more past meetings" at the start [Observed 3.3 of file 04]. No design-system page retrieved today documents a load-more pattern (GOV.UK does not mention it; Carbon does not compare it).

### 6.2 Decision (conventional element: reuse an established button pattern)
No invented alternatives. One `LoadMore` component in `ui`: a secondary button, medium size, label names what loads and in which direction ("Show more tasks", "Show earlier messages", "Show later days"), a count line ("Showing 25 of 87") when the total is known, and at the end of the list the text "End of the list" (never a disabled button).
- **Behaviour:** pressing loads the next page and keeps focus on the button's position by moving focus to the first newly added item (the button moves below it); a polite status says "25 more tasks loaded"; on error an inline message with Try again appears above the button and the items already shown remain.
- **States:** default, loading (button disabled with text "Loading"), error, end of list, empty (handled by the list).
- **Responsive:** full width below 600, auto width above. **Keyboard:** native button. **Testing:** focus movement, status text, error retry, end state.
Variants beyond direction wording: none.

## 7. Decision: result counts, empty results and loading (CD-336)

### 7.1 Decision (conventional elements: reuse)
Counts are text, not badges: the range line for tables, "N matching" for filtered lists, "Showing 25 of 87" for load-more lists. Empty states are distinguished: no data at all ("No patients in your clinic yet."), filtered empty ("No patients match. Try fewer filters." with "Clear filters"), search empty ("No patients match 'Smi'." only on screen, never in the URL or document title, with "Clear search"), closed-queue empty (existing image and text). One `EmptyState` (merging the clinician `Empty` wrapper, matrix A2) with padding and image props. Loading: skeleton rows on first load, previous rows dimmed with `aria-busy` on refetch (existing `keepPreviousData`). Errors: inline alert with Try again, previous rows kept, never a toast alone. Stale: "Results as of 9:02 AM" with refresh where data can change under the user (queue, schedule).
- **Gate:** nothing relies on colour; counts and empties are text. The echo of a search term in an empty state is screen-only.
- **Testing:** each empty variant, offline, error with retained rows.

## 8. Decision: row actions (CD-337)

### 8.1 Task and finding
Open a patient from the directory (primary) and sometimes jump to the plan builder or the appointments tab without a second click inside the record. Whole-row click exists on `Tr` for pointer users, with a real link in the first cell for keyboard users [Code]. No bulk actions on clinical items (I).

### 8.2 Guidance
Carbon: row-specific actions go in an overflow menu; with fewer than three actions show inline buttons; the menu stays visible on touch; while batch mode is active, row actions are disabled [Observed]. Stripe, Notion and Linear row menus and Stripe's selection bar [Prior I]. WCAG 2.5.8: targets at least 24 px or enough spacing [Observed].

### 8.3 Alternatives
A. Primary link only. B. Primary link plus one "Actions for {name}" overflow menu with deep links. C. Inline text links per row ("Plan", "Visits"). D. Whole-row click only.

### 8.4 Gates
D **fails** accessibility: mouse-only. A, B, C pass. B requires `DropdownMenu`, unused today, so its keyboard behaviour (arrow keys inside, Escape returns focus) comes from Radix and must be tested.

### 8.5 Evaluation
| Criterion (weight) | A Primary link only | B Link plus row overflow menu | C Inline text links per row | D Whole-row click only |
|---|---|---|---|---|
| Task effectiveness (25) | 3 | 4 | 4 | 3 |
| Accessibility and usability (25) | 5 | 4 | 3 | 1 |
| Error prevention and trust (20) | 4 | 4 | 3 | 2 |
| Business and operational (15) | 3 | 4 | 3 | 3 |
| Interaction efficiency (10) | 3 | 4 | 4 | 5 |
| Implementation and maintenance (5) | 5 | 3 | 5 | 5 |
| **Total (of 5)** | **3.80** | **3.95** | **3.45** | **2.60** |


### 8.6 Selected
**B.** Carbon's "fewer than three actions go inline" rule would suggest C for two secondary actions; this table repeats the actions up to 100 times, and inline links would add 200 tab stops, so one menu button per row is chosen deliberately, as a recorded deviation. Menu items: "Open record", "Open care plan builder" (`aria-disabled` with a visible reason line in the menu for non-care-team clinicians: "Only this patient's care team can edit the plan."), "Open appointments". The patient name stays the primary link and the only element in the first cell. Whole-row click stays as a pointer convenience only where the first-cell link exists, with `cursor` styling removed from non-clickable rows; it is documented as non-essential. No selection column and no bulk actions on the clinical directory; an administrative selection column is a later question with an API.
- **Spec:** menu button name "Actions for Dana Smith"; 32 px minimum target; focus returns to the menu button on close; menu closes on selection. **Testing:** keyboard open, arrow, Escape, disabled item reason, touch.

## 9. Decision: table keyboard model and semantics (CD-338)

### 9.1 Decision (conventional element: reuse)
Native `<table>` with `<caption>`, `<th scope>` and a single `Tr` header implementation (consolidating raw `<tr>` headers in five files). APG: a static table is not a grid; cells are not focusable, and interactive cells in a table add tab stops, in which case the grid pattern can shorten the tab sequence [Observed]. Here each row has one link and one menu button, which is two tab stops per row; the grid pattern would add cell navigation, roving tabindex and a custom model for little saving at 25 rows. Reuse the table; do not adopt `role="grid"`.
- **Enhancement kept:** `/` focuses search; ArrowUp and ArrowDown move between row primary links (existing), never the only way. The behaviour is announced once in the page's keyboard note ("Press / to search. Use the arrow keys to move between patients.") placed in the caption help text, not in a placeholder.
- **Alternatives considered and not scored:** ARIA grid (cost, no need); table without the arrow enhancement (kept as the fallback).
- **Testing:** Tab sequence length per row; arrow enhancement never traps focus; screen reader table navigation commands work.

## 10. Decision: mobile and narrow behaviour (CD-339)

### 10.1 Task
Clinicians use phones for quick lookups (secondary) [Assumption]. Brief section 23 asks whether desktop filter panels become drawers and whether dense records become stacked summaries, with functional equivalence.

### 10.2 Alternatives
A. Horizontally scrolling table. B. Columns drop at 1024 and 768, and below 768 the table becomes a stacked row list (name, status when notable, one signal line) with the same filters and sort. C. Cards.

### 10.3 Gates and evaluation
A is acceptable for a table that is already reduced, but the matrix found a scroll region elsewhere and its keyboard reach is a risk (a scrolling region needs focusability). C is oversized for repeated clinical records (brief section 9).
| Criterion (weight) | A Scrolling table | B Stacked row list below 768, columns drop above | C Cards |
|---|---|---|---|
| Task effectiveness (25) | 2 | 4 | 3 |
| Accessibility and usability (25) | 3 | 4 | 3 |
| Error prevention and trust (20) | 3 | 4 | 3 |
| Business and operational (15) | 3 | 4 | 3 |
| Interaction efficiency (10) | 3 | 4 | 2 |
| Implementation and maintenance (5) | 5 | 3 | 3 |
| **Total (of 5)** | **2.85** | **3.95** | **2.90** |


### 10.4 Selected
**B.** At 1024 hide MRN and plan detail (both reachable in the peek and record); at 768 keep Patient, Status, Next visit, Open reviews; below 768 render a list (`ul`) with the name as link, a text line "Next visit Fri Nov 21, 2 open reviews", and the row menu. Sort is a labelled `Select` ("Sort by") in this layout because header buttons no longer exist. The filter panel stays inline and stacks to one column, so the same controls and chips exist at every width (functional equivalence); a filter drawer was considered (CD-331, D) and not needed. Search stays visible. Table caption becomes the list's heading. The stacked list keeps the same cursor `TablePagination`. Admin and queue follow the same rules; the queue's detail is a drawer below 1280 (L).
- **Spec:** touch targets 44 px in the stacked list rows' controls (clinician theme minimum 24 px by WCAG; 44 px chosen for touch layouts) [Judgement]; text at 200 percent zoom must not clip; the row menu remains reachable.
- **Testing:** 375, 390, 768, 1024, 1440 and 1920 captures, 200 percent zoom, screen reader order matches visual order.

## 11. Decision: sorting (CD-340)

### 11.1 Decision (conventional element: reuse)
Sort by header buttons on the table (Carbon: arrow on the sorted column [Observed]; APG: `aria-sort` on the sorted header only [Observed]); only API-sortable columns (name, status, last activity) render as buttons, other headers are plain text, so nothing looks sortable that is not (fixes Prior I weakness 4). Sort control as a "Sort by" `Select` in the stacked layout. A sort change returns to page one. The sorted column's direction is announced on activation ("Sorted by last activity, newest first"). Sorting by next visit or open reviews needs an API change and is requested, not designed (I section 8 limits).
- **Spec:** header button name "Last activity, sortable, currently sorted newest first"; default sort stated in the caption help; sort persisted in the URL. **Testing:** `aria-sort` values, announcements, page reset.

## 12. Decision: review queue table behaviour (CD-341)

### 12.1 Decision (follows L; component-level fixes only)
L selected the table with a contextual detail pane and this file does not reopen it. Component decisions: (1) replace `title` truncation of "Why it appeared" and age with wrapped visible text up to two lines and the full text in the detail pane (a `title` attribute is not reachable by keyboard or touch, matrix A3); L's own change 1 (value against threshold as columns) removes most cut-off text. (2) Replace the two-option "Show" select with a segmented control of two buttons ("Open and in review", "Closed") using `aria-pressed` or a radio group; it is a two-state switch behind a dropdown today (matrix A3). (3) Use `Tr` for the header row. (4) Keep arrow-key movement between task buttons and `aria-selected`. (5) Use the shared `FilterBar` for Assigned and Rule, and `LoadMore` for further tasks. (6) Show the numeric priority only if the product defines a visible meaning; L keeps the order statement and forbids an implied risk score. Alternatives were not generated: the model is settled by L and the changes are conventional.
- **Testing:** axe; keyboard flow of select, act, focus to neighbour; truncated text fixtures; segmented control semantics.

## 13. Decision: search field (CD-342)

### 13.1 Task and constraints
Find one patient by name or MRN quickly. Search is server side; no suggestion endpoint exists; suggestions would display patient names in a dropdown on a shared screen.

### 13.2 Alternatives
A. One labelled search field with debounced submit-on-type and an explicit "Search" semantics through `role="search"`, no suggestions. B. Autocomplete suggestions. C. Search plus recent searches. D. A global command palette.

### 13.3 Gates
B conditional on an API that does not exist and on a privacy rule (names in a dropdown, a log of queries). C **fails** privacy by default: stored recent searches are a client-side list of patient names. D is outside the table family and not needed with few destinations (brief section 6).

### 13.4 Evaluation
| Criterion (weight) | A Search field with submit on type, no suggestions | B Autocomplete suggestions | C Search plus recent searches | D Global command palette |
|---|---|---|---|---|
| Task effectiveness (25) | 4 | 4 | 3 | 3 |
| Accessibility and usability (25) | 5 | 3 | 4 | 3 |
| Error prevention and trust (20) | 4 | 2 | 2 | 3 |
| Business and operational (15) | 4 | 4 | 3 | 3 |
| Interaction efficiency (10) | 4 | 5 | 4 | 5 |
| Implementation and maintenance (5) | 5 | 2 | 3 | 1 |
| **Total (of 5)** | **4.30** | **3.35** | **3.15** | **3.10** |


### 13.5 Selected
**A.** A visible text label "Search patients" (not a placeholder; the placeholder may carry the example "Name or MRN"), debounce 300 ms [Assumption: default to tune], a clear button, results announced politely with the count, `/` to focus. Matches Stripe (one wide field), Calendly and Meetup search fields [Observed 1.3]. WebPT quick search by partial name or ID is the closest healthcare example, text only [Prior I]. Rejected: B, C, D.
- **Testing:** label present, debounce does not drop keystrokes, empty search state, URL carries no `q` (CD-333).

## 14. Decision: clinician filter control, select versus combobox (CD-343)

### 14.1 Task and constraints
Filter patients by clinician. Brief section 7: evaluate searchable selection against dropdowns for directories. A clinic's therapist count is small in the demo and likely tens at most [Assumption].

### 14.2 Alternatives
A. Native select (current). B. Searchable combobox. C. Chips of names.

### 14.3 Gates and evaluation
B passes only with the APG combobox keyboard model and announcements, which the product has not built (cost). C scales poorly.
| Criterion (weight) | A Native select | B Searchable combobox | C Chips of names |
|---|---|---|---|
| Task effectiveness (25) | 4 | 4 | 3 |
| Accessibility and usability (25) | 5 | 3 | 3 |
| Error prevention and trust (20) | 4 | 4 | 3 |
| Business and operational (15) | 3 | 3 | 3 |
| Interaction efficiency (10) | 3 | 4 | 3 |
| Implementation and maintenance (5) | 5 | 2 | 3 |
| **Total (of 5)** | **4.05** | **3.50** | **3.00** |


### 14.4 Selected
**A**, native `Select`, with the rule that a combobox replaces it only when the option list exceeds about 15 items (an assumption to revisit with real clinic sizes). The same rule applies to the admin therapist selector (CD-313). Reuse the native control: it meets the need, has platform keyboard and screen-reader behaviour, and the brief says to prefer native semantics where they suffice.

## 15. Consolidation of duplicates

The pagination copies, load-more variants, filter fields and plan-diff and exercise-row copies are consolidated in `docs/design/component-usage-matrix.md`, new section H, which lists each duplicate, the single component that replaces it (`TablePagination`, `LoadMore`, `FilterBar`, `ExerciseSummary`, `PlanDiff`) and the files affected. Verdicts there are findings and not code changes.

## 16. References and inaccessible sources
Retrieved today: GOV.UK, NHS, USWDS, CMS and Atlassian pagination pages; Carbon data table and pagination usage; WAI-ARIA APG table pattern; WCAG 2.2 Understanding 2.5.8; Mobbin screens cited. Not retrievable or no relevant content: Shopify Polaris index filters (redirected to another site, not read); NN/g infinite-scroll and item-list pages (fetch failed or rate limited; only search-result titles seen); Baymard pagination and load-more pages (no findings in the retrieved text); Apple HIG tables (fetch failed); Material 3 pages (JavaScript shell); Fluent and Spectrum (not reached for this family); DHCW repository (names Search and patterns only). Epic, Tebra, MedBridge, SPRY, Medplum patient-list screens: no public screens.
