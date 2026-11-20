# L. Clinician review queue

Protocol: `docs/design/RESEARCH-PROTOCOL.md`. Brief: `docs/DESIGN-BRIEF.md` section 7 L, sections 5, 8, 9. Access date for every source: 2026-11-20. Status: provisional until the advisor signs off. No colours are chosen here.

## 1. User problem

A therapist (or a coordinator, for administrative rules) opens the queue to find out which patients need a human look, why each one is there, who is dealing with it, and what to do next. Today the rules fire correctly, but the list is hard to scan: the reason text is cut off, two different "ages" appear side by side, one patient can appear in several rows, and nothing on screen tells a reader that the order is an administrative rule order and not a clinical risk ranking. When a task is closed, the reader cannot see easily who closed it, when and why.

## 2. User and context

- **Therapist (T1, caseload therapist).** Desktop, keyboard-heavy, between patients or in a block at the start or end of the day. Interrupted often. Wants the fewest reads to decide: act now, hand over, or close with a note. Several times per day.
- **Coordinator (C1).** Desktop. Resolves only administrative rules (missing intake, upcoming follow-up). A few times per day.
- **Clinic admin (A1).** Reads the queue to check that rules produce sensible work; edits rules elsewhere (`/review-rules`).
- Cognitive state: split attention, mild time pressure. A wrong dismissal is the costly error, not a slow review.
- Source: PRD section 4 personas T1, A1 (`docs/product/prd.md`); the interruption and attention points are expert judgement, not measured.

## 3. Business objective

Make sure no patient who crossed a clinic-set threshold goes unseen, and make that traceable. Metric names only: pending review items by age band (PRD metric), time from task creation to first assignment, time from creation to resolution, share of tasks closed with a note, share of tasks reopened or re-created for the same rule and source, queue-view-to-action steps. No target values are claimed.

## 4. Constraints

**Functional (checked in `packages/shared/src/contracts/review.ts`, `overview.ts` and `docs/architecture/api-phase3.md` section 6):**
- `GET /review-tasks` filters: `status`, `assignedTo` (me, unassigned, id), `ruleKey`, cursor, limit up to 100. Returns `total`, `lastCheckedAt`, `rulesLastRunAt`.
- A task carries rule, `explanation`, `value`, `threshold`, `unit`, `sources[]` (type, id, field, apiPath), `priority` (int), `assignedTo`, `createdAt`, `dueAt`, `ageHours`, `resolvedAt`, `resolvedBy`, `resolutionNote`, `onCareTeam`, `kind` (clinical or administrative).
- States: `open`, `in_review`, `resolved`, `dismissed`. Actions: assign or unassign, resolve with required note, dismiss with required note. One open task per rule and source. Clinical tasks need care-team membership to assign, resolve or dismiss; administrative tasks can be resolved by a coordinator.
- There is no score (REQ-RVQ-04). Rule defaults are arbitrary demo values and must be described as such.
- **Gaps in the contract:** (a) no server-side group-by or per-rule counts, so grouping can only be computed over loaded pages and would give wrong counts on a partial page; (b) a task exposes only its final resolution, not a sequence of events (created, assigned, reassigned, reviewed, closed); (c) no "snooze" or "defer" state, which the PRD cut ("queue snooze"); (d) no way to list tasks by patient other than `GET /patients/:patientId/review-tasks`.

**Technical:** Next.js app, TanStack Query, URL carries filters and the selected task. Keyboard list navigation already exists. Time rules run every 15 minutes, so the list can be up to 15 minutes stale for time-based rules.

**Safety and privacy:** Task content shows patient name and MRN to staff already authorised for the organisation. Cross-organisation reads return 404. Never present rule priority as validated risk. Never allow a close without a note. Banned diagnostic terms (`BANNED_DIAGNOSTIC_TERMS`) must not appear in explanation copy.

**Accessibility (WCAG 2.2 AA):** status and kind must not rely on colour alone (1.4.1); targets at least 24 by 24 CSS px (2.5.8, tested against the W3C text: spaced smaller targets are an exception); focus not obscured by the sticky detail pane (2.4.11); reflow at 320 px (1.4.10); live announcement when a task leaves the list (4.1.3); consistent help and identification.

## 5. Current CarePath implementation

Read from `apps/web/app/(clinician)/review-queue/queue.tsx` and screenshots `docs/screenshots/3.4c/review-queue-task-1440.png`, `docs/screenshots/4.3b/review-queue-empty-1440.png`. (`docs/screenshots/3.2a/` and `3.4b/` show an older placeholder, "Review queue is not built yet", and are out of date.)

What exists:
- Three filter selects (Show, Assigned, Rule), URL-backed. Table with Patient, Why it appeared, Age, Assigned to; open tasks show no status chip, in-review shows a chip, administrative tasks carry an outlined "Administrative" tag.
- Right detail pane at 1280 px and wider, drawer below that. Detail: "Why this appeared" sentence, rule, value read, clinic threshold, created, due, assigned to, the unvalidated-rules notice, source link, actions (Assign to me, Mark check-in reviewed, Resolve with a note, Dismiss with a note). Actions the user may not take are shown unavailable with a reason.
- After an action the next neighbour is selected and focus returns to the list. Empty state: "Nothing needs attention" with last-checked time and last time-rule run.

Weaknesses observed in the screenshot and code:
1. The reason column is cut at about 48 characters ("Reported pain 8 of 10. Clinic ..."), so the threshold half of the explanation is not readable in the list.
2. The "Age" column (task age, 19 h) sits next to text such as "Not reviewed for 70 hours", which is a different duration. The two read as contradictory.
3. A patient with several tasks appears in several rows ("Flynn Flarepatient" twice) with no sign they are the same person.
4. The header says "Highest priority first, then oldest" but never says that priority comes from the rule, not from a clinical judgement. The page description covers this, the list does not.
5. The `dueAt` value is only in the detail pane, so overdue tasks cannot be spotted in the list.
6. Resolution history is limited to the resolved fields; the closed view cannot show who assigned what and when.
7. No count by rule or by assignee, so a reader cannot see the shape of the queue without opening filters.

## 6. Production references observed

Mobbin has no clinical work queue for rehab. The comparison set is enterprise issue and ticket tools plus one healthcare scribe's task list, and public documentation. `[Observed]` means I opened the screen or page; `[Assumption]` means inference.

| Product | Platform | Screen or flow | URL | Observed |
|---|---|---|---|---|
| Linear | Web (Mobbin) | Inbox with detail panel | https://mobbin.com/screens/beb9d6b3-ec34-46d7-9332-320fcb32a338 | [Observed] Left list of notifications with unread dot, relative time, and an overdue marker on one item; right pane shows the item with properties (status, priority, assignee, labels, project) and a dated activity log ("created", "moved from Todo to In Progress"). |
| Linear | Web (Mobbin) | Project issues list, grouped by status | https://mobbin.com/screens/937fc32e-04c6-4c39-bcd6-17a42b4fe83c | [Observed] Rows grouped under In Progress, Todo and Done with counts per group; each row shows ID, status icon, title, labels, due date, assignee. Group headers collapse. |
| Linear | Web (Mobbin) | Display options popover | https://mobbin.com/screens/94bb4d3b-a8e3-41e8-b8f1-b82d1f904b03 | [Observed] User chooses grouping, sub-grouping, ordering (Priority), whether completed items show, and which properties show as columns. |
| Linear | Web (Mobbin) | Filtered list with "hidden by filters" notice | https://mobbin.com/screens/49b30f29-aae5-42d5-a09a-1e2ce6f4fe09 | [Observed] A footer line says how many issues are hidden by filters and offers "Clear Filters". |
| Linear | Web (Mobbin) | My issues flow (4 screens) | https://mobbin.com/flows/c03d421c-861f-45e9-9e0f-1f1947a46563 | [Observed] Tabs Assigned, Created, Subscribed, Activity; same row anatomy in each. |
| Linear | Web (Mobbin) | Assigned issues flow (3 screens) | https://mobbin.com/flows/9480ddeb-4430-4509-abc9-413667034774 | [Observed] Side panel summarises the same list by label, priority, project with counts; clicking a label filters the list and the panel offers "Clear filter". |
| Linear | Web (Mobbin) | Enabling an agent: Triage Intelligence settings | https://mobbin.com/flows/d67e265d-a278-47af-bb77-d7f57229b346 | [Observed] AI suggestions for assignee, label and duplicates are off by default and each can be shown, hidden or auto-applied by rule. |
| Linear | Official docs | Triage | https://linear.app/docs/triage | [Observed] Shared team inbox. Per issue: accept (with comment), decline (with reason), mark duplicate (merges into another), snooze. Any member can work it; designated members can be auto-assigned in rotation, skipping people who are out of office, without considering workload. A dedicated history view for triage decisions is not described on the page. |
| Zendesk | Web (Mobbin) | Agent dashboard | https://mobbin.com/screens/6d092d6c-e458-4351-9bf5-d88a8d095750 | [Observed] Counters for open tickets "you" and "groups"; list grouped by status category (New, Open); columns for status, requester, requested, updated, group, assignee. |
| Vanta | Web (Mobbin) | Tests list | https://mobbin.com/screens/eb1d71b4-2b3c-4a83-8435-bdc0e7cbb9e2 | [Observed] "Needs attention" card splits into Overdue, Due soon, Needs remediation (no SLA assigned), each with a count and an icon, next to an OK card; below, a filterable table with owner, type, status with icon and text. |
| Zoho CRM | Web (Mobbin) | Workqueue | https://mobbin.com/screens/0cff0008-a6ac-4bd8-b022-a7aefcbb3112 | [Observed] Left rail of named queues with counts (my open activity, leads assigned in last 3 hours); main table with due date shown as text "Late by 3 days", "Today", "Tomorrow", plus status and priority columns. |
| Aboard | Web (Mobbin) | Approvals table | https://mobbin.com/screens/9ce069a2-2cbe-4c94-a7f5-b57050e50ca0 | [Observed] Table with Status (Pending, Approved), "Next approver" and "Requested by" columns; ownership is a column, not a hidden detail. |
| Heidi | Web (Mobbin) | Tasks table | https://mobbin.com/screens/97b84dad-6a86-4f60-b81b-439375d4fa16 | [Observed] Clinical-scribe product task list: title, linked patient chip, category, created ("3 days ago"); an overflow menu per row; note that unfinished tasks are archived after 30 days. |
| Medplum | Official docs | Task resource | https://www.medplum.com/docs/careplans/tasks | [Observed] A queue is a filtered view of Tasks. Fields: status, a finer business status, reason for hold or cancel, owner (person or group), focus resource, planned and actual periods, priority codes. Claiming a task uses a version check; if the record changed first, the claim fails and the user reloads. |
| MedBridge | Official page | RTM alerts | https://www.medbridge.com/enterprise/remote-therapeutic-monitoring-solution | [Observed] Per-patient entry shows alerts, session notes and status; actions include message the patient, adjust the program, open the patient dashboard. The page does not describe how alerts are ranked. |
| Abridge, Ambience, DAX | n/a | n/a | n/a | Not relevant to a work queue; see M. |

## 7. Established patterns

1. **List left, detail right, same URL** (Linear Inbox, Zendesk, Zoho). It keeps the reader's place while they read detail, and survives refresh and sharing. CarePath already does this.
2. **Ownership as a visible column or property** (Aboard, Zendesk, Linear properties). Unowned work is findable.
3. **Group headers with counts** (Linear grouped list, Vanta, Zendesk). The shape of the queue is readable before any item is opened.
4. **Due or overdue shown as words** ("Late by 3 days"; Vanta "Overdue", "Due soon" with icons). Colour is not the carrier.
5. **Activity log on the item** (Linear inbox). The history of who did what sits beside the item, not in another system.
6. **Closing needs a reason** (Linear decline with comment; Medplum status reason). CarePath already requires a note.
7. **Automation is opt-in and per-rule** (Linear Triage Intelligence settings). Fits CarePath's admin-set rules.
8. **Honest filter feedback** ("n issues hidden by filters", Clear Filters). Prevents a false "all clear".
9. **Ranking is rarely explained** (MedBridge page does not say; Linear sorts by user-chosen ordering). A gap CarePath can fill by stating the order in words.

## 8. Alternatives

Evidence tags: **R** research evidence (a reference I observed), **E** expert judgement, **U** untested assumption. No usability test of any alternative has been run.

### A. Table with contextual detail pane (current model, refined)

- **Problem addressed:** find a task, understand it, act, without losing place.
- **Interaction model:** sortable table (patient, rule, value against threshold, due, age, assignee) at 36 px rows; click or arrow keys select; detail pane (drawer below 1280 px) shows why, source, history, actions; filters plus per-rule count chips.
- **Benefits:** one screen, dense, keyboard friendly; supports many tasks per day; no contract change needed for the core.
- **Limitations:** the table must be wide to show reason text; two panes are tight at 1024 px.
- **Accessibility:** native table semantics with a caption, `aria-selected`, roving arrow-key navigation (already built); focus must stay visible beside a sticky pane.
- **Business implications:** supports "time to first assignment" and "share closed with a note" directly.
- **Technical complexity (current API):** low. Count chips need `total` per rule; the API gives one `total` per query, so either one extra request per rule or a contract request (CR) for rule counts.
- **Error and recovery:** action failure shows a toast with whether input was kept; a 409 `invalid_transition` (someone else closed it) refreshes the row and says so.
- **Evidence:** R Linear Inbox, Zendesk, Zoho (list plus detail); R Aboard (owner column); E density need from T1.

### B. Inbox-style sequential review

- **Problem addressed:** work through the queue one task at a time without scanning.
- **Interaction model:** a narrow list of tasks and a large single-task view; actions (accept into my review, hand to someone, resolve, dismiss) with automatic advance to the next task, like Linear Triage; optional "snooze".
- **Benefits:** lowest decisions per task; calm; fits a daily sweep.
- **Limitations:** hides queue size and age distribution; encourages speed; snooze is cut from the PRD and would add a state; harder to compare two tasks for the same patient.
- **Accessibility:** focus management after advance must be announced; large single-task view reflows well on small screens.
- **Business implications:** may reduce time per task; risk that dismissals rise if the interface rewards throughput (U).
- **Technical complexity:** medium. Snooze needs new state and job behaviour; "accept" maps to assign to me.
- **Error and recovery:** undo window after close is desirable but closed tasks are immutable history, so undo would need a reopen action that does not exist.
- **Evidence:** R Linear Triage docs; R Linear Inbox; E throughput risk is judgement.

### C. Grouped attention categories

- **Problem addressed:** show the shape of the queue by kind of reason before any item is opened.
- **Interaction model:** collapsible groups by rule (Reported pain, Missed sessions, Unreviewed check-in, Upcoming follow-up, Missing intake) or by clinical versus administrative, each header with a count and the oldest age; rows inside the group.
- **Benefits:** orients quickly; matches how the clinic thinks about rules; puts administrative tasks in their own place.
- **Limitations:** a patient with several reasons is split across groups; group order implies priority (a safety issue, see gate G-L2); long groups need their own paging.
- **Accessibility:** headings and `aria-expanded` groups; counts must be text.
- **Business implications:** helps admins see which rule produces the load.
- **Technical complexity:** medium to high. Correct counts need server-side counts per rule (CR). Client-side grouping of a paged list gives wrong totals.
- **Error and recovery:** if counts and rows disagree after an action, the group header refreshes with the list.
- **Evidence:** R Linear grouped list, Vanta "Needs attention", Zendesk status categories.

### D. Ranked card list with severity bands (rejected model)

- **Problem addressed:** put the "worst" first with a coloured urgency band.
- **Interaction model:** stacked cards ordered by a composite urgency, each with a red/amber band and a label such as High or Critical.
- **Benefits:** looks decisive.
- **Limitations:** CarePath has no validated risk model; a band would imply one. Four-line cards take about 1,800 px for 20 tasks (checkpoint C2 finding, `docs/decisions/checkpoint-c2.md`).
- **Accessibility:** colour-only severity fails 1.4.1 unless words are added.
- **Business implications:** liability and trust: a demo product must not display risk it cannot defend.
- **Technical complexity:** low.
- **Error and recovery:** none specific.
- **Evidence:** E; the brief says do not rely only on colour and distinguish administrative priority from validated risk. R Vanta shows the safer variant: words and icons for overdue and due soon, with no severity score.

## 9. Mandatory gates

Gate definitions: **G-L1 accessibility** (WCAG 2.2 AA, no colour-only meaning, keyboard complete); **G-L2 safety** (administrative priority is never presented as validated risk; a task cannot be closed without a note; the reason is readable without opening the task); **G-L3 privacy** (organisation-scoped data only; no new PHI shown in the list beyond name and MRN).

| Alternative | G-L1 | G-L2 | G-L3 | Eligible |
|---|---|---|---|---|
| A. Table plus detail pane | Pass | Pass, provided the reason is not truncated | Pass | Yes |
| B. Inbox-style sequential | Pass | Conditional: hides queue size, so a "N more, oldest X" line is required; no snooze without a state and due date | Pass | Yes, with conditions |
| C. Grouped categories | Pass | Conditional: group order must be fixed and neutral, not by perceived severity | Pass | Yes, with conditions |
| D. Ranked cards with severity bands | Fail (colour band) | Fail (implies validated risk) | Pass | No |

## 10. Weighted evaluation

Weights are the protocol defaults: task effectiveness 25, clinical safety/privacy/trust 20, usability/accessibility 20, business value 15, operational efficiency 10, technical feasibility 5, design-system consistency 5. No adjustment: the safety weight is already enforced as a gate. Scores 1 to 5. D is not scored (ineligible).

| Criterion (weight) | A. Table plus pane | B. Inbox sequential | C. Grouped categories |
|---|---|---|---|
| Task effectiveness (25) | 4: reason, value, source and actions in one view; reader still scans a list | 4: fastest per task, weaker for comparing or spotting the oldest | 3: orients by kind, but one patient's tasks scatter |
| Safety, privacy, trust (20) | 5: full reason visible, note required, no score | 4: one-at-a-time hides queue size and age | 4: group order can imply priority if not fixed |
| Usability, accessibility (20) | 4: dense but proven keyboard model | 4: simple, reflows well | 3: more landmarks and paging to manage |
| Business value (15) | 3: supports first-assignment and resolution metrics | 3: same metrics, risk of rushed closes | 3: gives admins rule-level load |
| Operational efficiency (10) | 4: few clicks per task, filter by assignee | 5: auto-advance | 3: extra expand and collapse steps |
| Technical feasibility (5) | 5: built; counts are an optional CR | 4: snooze would need a new state | 3: needs server-side per-rule counts |
| Design-system consistency (5) | 5: uses Table, Tag, StatusChip, Drawer | 3: needs a new single-task layout | 4: needs a collapsible group pattern |
| **Weighted total (of 5)** | **4.15** | **3.90** | **3.25** |

Arithmetic: A = (25x4 + 20x5 + 20x4 + 15x3 + 10x4 + 5x5 + 5x5) / 100 = 4.15. B = (100 + 80 + 80 + 45 + 50 + 20 + 15) / 100 = 3.90. C = (75 + 80 + 60 + 45 + 30 + 15 + 20) / 100 = 3.25. All scores are expert judgement informed by the observed references; none comes from testing with users.

## 11. Recommendation

**Selected: A, table with contextual detail pane, refined.** Keep the model that is built and fix what the screenshots show.

Changes inside A (each is a design hypothesis, untested):
1. Show the full explanation, or at least value against threshold as two short columns ("Value 8 of 10", "Rule 7 or higher"), so no cut-off sentence is needed.
2. Label the age column "In queue" and show "Condition: 70 h" separately where the rule has its own duration, so the two numbers stop colliding.
3. Add a "Due" column in words ("Overdue by 3 h", "Due in 5 h"), with an icon plus text, never colour alone.
4. Mark rows of the same patient with a small "2 tasks" text link that filters to that patient, rather than merging rows.
5. Add rule count chips above the table as filters (borrowed from C, no grouping), once the API returns per-rule totals.
6. Add a "History" block to the detail pane: created, assigned or unassigned, check-in marked reviewed, resolved or dismissed with note, in time order, each with person and time. Needs a contract request (see section 4 gap b); until then show created and resolution only.
7. Put one fixed line above the list: "Order: rule priority, then oldest. Set by clinic rules, not a measure of medical risk."
8. Keep Tag (outlined, text) for administrative and StatusChip (filled, icon, words) for clinical, as the design system requires.

**Why A beats the runner-up (B):** the queue is a place to see the whole load (age, owner, kind) and then act; B optimises the act and hides the load. In a safety-relevant queue, hiding how many tasks are older than the clinic's own thresholds is the wrong trade. B also needs a snooze state the PRD cut. B's auto-advance is already present in A (focus moves to the neighbour after an action).

**Runner-up: B**, valuable later as a "Review next" button inside A for sweeps, if a test shows therapists work the queue sequentially.

**Rejected:** D (implies risk, fails gates). C as the primary layout (wrong counts without server support, order can imply severity); its count chips are taken instead.

**Trade-off accepted:** A needs width; below 1280 px the detail becomes a drawer, which costs one extra tap and loses side-by-side context.

## 12. Requirement alignment row

| Field | Content |
|---|---|
| User segment | Caseload therapist (T1); coordinator (C1) for administrative rules; admin (A1) as reader |
| Job to be done | Decide for each flagged patient whether to act, hand over or close, and leave a reason |
| Pain point | Reasons cut off, two ages that conflict, repeat rows for one patient, no visible history, nothing says the order is not clinical risk |
| Business objective | No threshold crossing goes unseen; every closure traceable |
| Functional requirement | REQ-RVQ-02 to -05 (explanation, assign and resolve with note, rule-based wording, empty state); new: history block, due in words, per-rule counts |
| Success metric | Time to first assignment; time to resolution; share closed with a note; pending review items by age band |
| Design hypothesis | If value, threshold, due and owner are readable in the row and history sits in the detail pane, therapists will open fewer tasks just to find out why they exist |
| Selected pattern | Table plus contextual detail pane |
| Technical dependency | `GET /review-tasks` (exists); CR for per-rule totals; CR for task event history |
| Validation method | Keyboard-only run and axe on the queue at 390, 768, 1440; a moderated task test with a few clinicians is not yet done and is the planned validation; AC-D1 to D6 stay green |

## 13. States to design

| State | Behaviour and microcopy | Recovery |
|---|---|---|
| Default | Table with fixed ordering line | n/a |
| Hover | Row tint; pointer on the patient link | n/a |
| Focus | 2 px ring on the patient link; row also shows selected bar | Arrow keys move between rows |
| Selected | Row bar plus `aria-selected`; detail pane opens | Esc closes the drawer below 1280 px |
| Loading | Skeleton rows that match the table: "Loading review tasks" | n/a |
| Empty (none open) | "Nothing needs attention. No open review tasks in the clinic. Last checked 9:00 AM MST. Time-based rules last ran at 8:45 AM." | Link to the closed view |
| Empty (filtered) | "No tasks match these filters." plus "n tasks hidden by filters" | "Clear filters" |
| Partial data | "Showing 50 of 63. Last checked 9:00 AM." | "Load more tasks" |
| Stale information | If last checked is older than 15 minutes and the tab was hidden: banner "This list may be out of date. Last checked 9:00 AM." | "Refresh" |
| Disabled action | Button unavailable with reason in text: "Only this patient's care team can resolve this. Care team: ..." | "Open patient record" or ask a care-team member |
| Validation error | Note empty on resolve or dismiss: "Add a note before you resolve this task. Your note is saved in the record." | Focus moves to the note field |
| Server error | Banner: "We could not load review tasks. Nothing was changed." | "Try again" |
| Action error | Toast: "Could not resolve this task. Your note is still here." | "Try again" |
| Conflict | 409: "This task was already closed by A. Smith at 9:12 AM." Row refreshes | Next task selected |
| Network loss | Banner: "You are offline. Actions are paused. Nothing was sent." | Reconnect retries the read; actions are not queued |
| Permission denied | 403: "You do not have access to review tasks." | Contact the clinic admin |
| Success | Toast "Task resolved" with the next task selected and focus kept in the list; announced politely | n/a |
| Cancellation | Closing the note dialog keeps the task open and keeps the typed note until the page unloads | Reopen the dialog |
| Interrupted workflow | Selected task is in the URL; reload returns to it | n/a |
| Unsaved changes | Leaving with a typed note asks: "Discard your note?" | "Keep editing" |

## 14. Responsive behaviour

| Width | Behaviour |
|---|---|
| 375 and 390 | Single column. Filters collapse behind one "Filters (n)" button. Each task becomes a two-line row: patient and "value against threshold", then due and owner as text. Detail opens as a full-height drawer; actions sit at the bottom. Table scroll is not used. Targets at least 24 px, 44 px preferred for the drawer buttons. |
| 768 | Same list; detail as a right drawer over the list. Filters inline in two rows. |
| 1024 | Table with fewer columns (patient, value against threshold, due, owner); detail as drawer. |
| 1280 to 1440 | Table plus sticky detail pane (current breakpoint is 1280). All columns. |
| 1920 | Same two-pane model with a max content width so the table does not stretch; extra width goes to the reason text, not to a third pane. |

Models change at two points: below 768 the table becomes a stacked list, and below 1280 the detail pane becomes a drawer.
