# H. Clinician workspace (Overview) — feature research

Protocol: `docs/design/RESEARCH-PROTOCOL.md`. Brief: `docs/DESIGN-BRIEF.md` §5–§9, §7 H. Access date for every external source: 2026-11-20. Status: provisional until advisor sign-off. Colours are not chosen here.

Evidence labels used throughout: **[Observed]** retrieved and looked at or read this session; **[Prior]** taken from `docs/research/*.md` (not re-checked today); **[Judgement]** expert reasoning; **[Assumption]** untested.

## 1. User problem

A physical therapist starts the day needing to know three things fast: who is coming in today and when, which patients have sent something that needs a clinical decision, and which patients are missing information that blocks care. Today those answers sit in separate lists on one page and in a separate Schedule page. The therapist has to read all of them, notice that the same patient appears in several, and navigate away to act on any item.

## 2. User and context

- Segment: physical therapist on a care team (`clinical.read`, `clinical.write`, care team only). Secondary: care coordinator sees a different, administrative slice (not designed here).
- Where and device: clinic desk or treatment room, desktop or laptop, 1024 to 1920 wide. Phone/tablet occasionally between rooms [Assumption].
- State: interrupted constantly between patients, often one hand on the mouse, time-boxed. Low tolerance for decoration; high cost of missing a pain report. [Judgement]
- Frequency: first screen after sign-in and return point many times a day. [Judgement]
- Caseload size in the seeded data is 8 patients; real caseloads are larger, so the design must not depend on the seed size. [Observed: `docs/screenshots/3.3/overview-1440.png` says 8 patients.]

## 3. Business objective

Clinicians act on patient-reported signals before they go stale, and spend less time navigating. Metric names only: time to first action after sign-in; time from check-in submitted to reviewed; share of review tasks resolved from the Overview without opening another page; unreviewed check-in age (oldest); navigation depth per resolved item. No targets are claimed.

## 4. Constraints

Functional (checked in `packages/shared/src/contracts/overview.ts`, `scheduling.ts`, `review.ts`, `docs/architecture/api-phase3.md`):
- `GET /overview` returns `ClinicianOverview`: `openTasks`, `unreviewedCheckIns`, `missedActivity`, `messages` (counts only), `recentPublishes`, each `{count, items}`. REQ-OVR-01 says each count equals its list length and there are no KPI tiles or judgement labels.
- Visits come from a second call `GET /appointments?date&practitionerId` (CR-1).
- Actions that exist without leaving: `POST /patients/:id/check-ins/:id/review` (care team only), review-task `assign`, `resolve`, `dismiss` (note required).
- No endpoint returns a merged, ranked feed. Ranking and merging would be client-side. Server push does not exist; schedule polls every 60 s, Overview refresh is manual.
- Checkpoint C2 ruling: day agenda list, no week grid, no drag (`docs/decisions/checkpoint-c2.md` §6.4).

Technical: Next.js app, TanStack Query, `@carepath/ui` primitives. Safety/privacy: every record open is audited (REQ-REC-02); lists show patient names and pain scores, so they are PHI-like even with synthetic data; "Demonstration product. Synthetic data" banner stays. Rules are administrative thresholds that "predict nothing" and every task must say why it appeared (rule, value, threshold, source). No score, no risk colour language. Accessibility (WCAG 2.2 AA): full keyboard operation, visible focus, 2.5.8 target size, status not by colour alone, `aria-live` for list changes, no drag-only interaction (2.5.7).

## 5. Current CarePath implementation

Read: `apps/web/app/(clinician)/overview/overview.tsx` (393 lines), `schedule/schedule.tsx`; screenshots `docs/screenshots/3.3/overview-1440.png`, `overview-1024.png`.

What exists [Observed in code]: header sentence with caseload size and an "as of" time; a 3/2 column grid. Left: "Your review tasks" then "Check-ins not yet reviewed". Right: "Visits today", "Unread messages" (one sentence), "Missed activity", "Plan updates". Lists collapse after 6 rows. Only direct action is "Mark reviewed" on check-ins; everything else is a link to another page. Manual "Refresh lists".

Note: the 3.3 screenshot is older than the code. It shows "Review queue 11" described as clinic-wide and a "Review queue" sidebar item only; the code now says "Your review tasks" for the caseload. Re-capture before using it as a baseline. [Observed]

Weaknesses [Judgement, from the code and screenshot]:
1. Seven sections, no single order of attention. The therapist must decide which list to read first.
2. Same patient repeats across sections (in the screenshot one patient appears in four rows of review tasks). Nothing groups by patient.
3. Visits are in a side column below the tasks. The day's time structure, the thing a clinic day runs on, has no visual priority and no "next up".
4. Almost every item needs navigation to act. Resolving a task requires leaving for the review queue.
5. "Unread messages" is a count sentence, not a list, so it cannot be acted on here.
6. "What information is missing" is only visible if a `missing_intake` task exists; no place states "nothing missing" versus "not loaded".
7. Lists are as of one timestamp for the whole page, but visits refresh separately; the page can show two different "nows".

## 6. Production references observed

| Product | Platform | Screen / flow | URL | Access date | What was observed | Label |
|---|---|---|---|---|---|---|
| WebPT EMR | Web | Dashboard (help article) | https://help.emr.webpt.com/article/1114-webpt-dashboard | 2026-11-20 | Landing screen after sign-in with an Agenda of today's appointments, an "At a Glance Alerts" area for incomplete profiles and pending documentation, a "New Patients" list of patients whose initial exam is not yet finalised, patient search, an internal message inbox. Text source only; no screenshot inspected. | [Observed] |
| WebPT EMR | Web | Tasking overview (help article) | https://help.emr.webpt.com/article/1725-tasking-overview | 2026-11-20 | Tasks have type, assignee, due date, status, priority, optional patient link. Table with My Tasks and Group Tasks, saved views, filters including patient and days open. Overdue shown in red, completed with a check. | [Observed] |
| Linear | Web | Inbox with issue detail (Mobbin) | https://mobbin.com/screens/beb9d6b3-ec34-46d7-9332-320fcb32a338 | 2026-11-20 | Two panes. Left: inbox list of items with unread dot, title, reason line and age. Right: the selected item with properties and an activity log. | [Observed] |
| Linear | Web | Inbox, notification deleted toast (Mobbin) | https://mobbin.com/screens/14cbb61d-2120-46fa-b29c-b7678e4b85cc | 2026-11-20 | Dismissing an item shows a toast with Undo and the list stays in place. | [Observed] |
| Linear | Web | My issues flow (Mobbin) | https://mobbin.com/flows/b72025a8-0e51-4cf9-ae26-b78aa008bdea | 2026-11-20 | Tabs Assigned, Created, Subscribed, Activity. Empty state explains the page and gives a keyboard shortcut. Rows are one line each with status, id, title, labels, dates. | [Observed] |
| Linear | Web | Searching shortcuts flow (Mobbin) | https://mobbin.com/flows/7f061cb3-54c7-48de-a070-6c6cde5f443f | 2026-11-20 | Searchable shortcut sheet with "go to" chords and single-key actions (assign, change status). | [Observed] |
| Slack | Web | Activity with thread; Unreads (Mobbin) | https://mobbin.com/screens/590fc209-9e67-4e49-844a-bd686db981d4 ; https://mobbin.com/screens/8182658a-7b28-4ab0-8a55-5e6187166a94 | 2026-11-20 | Activity feed on the left, selected thread on the right with reply box. Unreads view has "Mark All Messages Read" and an Esc-to-mark shortcut. | [Observed] |
| Slack | Web | Activity, "Saved for later" (Mobbin) | https://mobbin.com/screens/5ce7d656-677b-4ad9-8417-127b1a822408 | 2026-11-20 | Item row shows a labelled state and a hover menu to save for later. | [Observed] |
| Heidi (clinical scribe, not on the brief list) | Web | Sessions list with session and Tasks panel (Mobbin) | https://mobbin.com/flows/617eab3e-2cc7-46f5-a948-0559fa3fdb69 ; https://mobbin.com/flows/a97b7f1d-0cc8-4934-90d6-8d452ca8ef37 | 2026-11-20 | Left list of Upcoming / Past sessions, centre note, optional right Tasks panel with checkable tasks, a Tasks page with status, category, date filters. Patient name and chips at the top of the work area. | [Observed] |
| Square | Web | Staff Workday timeline (Mobbin) | https://mobbin.com/screens/9eba6531-f7ba-44e9-b6c0-07ccf28d85c8 | 2026-11-20 | Day timeline by person across hours, a time-zone notice at the top, date stepper. | [Observed] |
| Calendly | Web | Calendar list with detail panel (Mobbin) | https://mobbin.com/screens/650758ab-9387-4db1-b3f5-37b68d81cd45 | 2026-11-20 | Upcoming meetings grouped by day with an "Up next" label; selecting one opens a right panel with Reschedule and Cancel. | [Observed] |
| Jobber | Web | Home (Mobbin) | https://mobbin.com/flows/2c6b6820-702f-4e98-a5f4-a04cc9064188 | 2026-11-20 | "To do" list above "Today's appointments" with Total/Active/Completed/Overdue/Remaining, an "Overdue" count, and a row warning "Job form incomplete". Includes large summary tiles, which CarePath should not copy. | [Observed] |
| Dialpad, Zendesk, Twenty (Mobbin dashboards) | Web | Dashboards | https://mobbin.com/flows/33da5e85-69b1-4907-901d-b46c190a0bea ; https://mobbin.com/flows/51a9e120-0d6b-40b3-b3d3-6fd7ec6e1fcd ; https://mobbin.com/flows/ae5b8dc1-7e1b-45ce-9c3d-3bc07615202c | 2026-11-20 | KPI card and chart dashboards. Used as the counter-example the brief warns against. | [Observed] |
| Epic (Hyperspace) | Web | Storyboard (UNMC and Connect Care public pages) | https://www.unmc.edu/newsroom/2019/11/27/coming-soon-changes-to-one-chart-patient-workspace/ ; https://ehealth.connect-care.ca/epic-systems/epic-modules/storyboard | 2026-11-20 | Text descriptions only: a persistent patient context panel, hover-to-act instead of screen changes, fewer clicks. No Epic interface inspected. Relevant to J more than H. | [Observed] text |
| Medplum | Web | Provider app README and charting docs | https://www.github.com/medplum/medplum-provider ; https://www.medplum.com/docs/charting | 2026-11-20 | README lists chart, tasks, scheduling, messaging as workflows; neither page describes a screen layout. No UI observed. | [Observed] text, thin |
| MedBridge | Web | RTM "needs-attention" description | `docs/research/competitor-analysis.md` item 7 | 2026-11-19 (prior) | A ranked needs-attention queue for remote monitoring. Not re-checked. | [Prior] |

Not accessible: WebPT, SPRY, MedBridge, Tebra, Medplum and Epic/MyChart returned no screens on Mobbin (searches for the names returned unrelated products). Tebra produced search results only; no Tebra page was read. Details are in the final report.

## 7. Established patterns

1. A clinical product opens on today's agenda plus an "alerts" area (WebPT). The day's visits are the spine; alerts are about incomplete or pending items. [Observed]
2. Work-management tools for personal work use a list with a detail pane (Linear Inbox, Slack Activity, Calendly, Heidi). The list stays visible while the detail changes, so triage does not lose its place. [Observed]
3. Per-item state is a labelled word, not only colour (Slack "Saved for later", Jobber "Job form incomplete", WebPT overdue in red plus due date). [Observed]
4. Dismiss and complete are reversible: toast with Undo (Linear). [Observed]
5. Keyboard first: chord navigation and single-key actions are documented in a searchable sheet (Linear). [Observed]
6. KPI tile dashboards exist everywhere (Dialpad, Zendesk, Twenty, Jobber) and tell the user little about what to do next; the brief rejects them. [Observed, Judgement]
7. Every list explains its empty state and says when it was last updated. [Judgement, partly observed in Linear My issues empty state]

## 8. Alternatives

### A. Schedule-first dashboard

- Interaction model: the day's visits as a time-ordered spine, "next up" highlighted. A slim strip above or beside it lists items needing review, as links.
- Benefits: matches how a clinic day runs; visit list already exists; WebPT precedent. Low build cost.
- Limitations: review items are subordinate, so a pain report can sit below the fold on a busy day. A day with no visits looks empty even when three patients need review.
- Accessibility: simple list; time labels need text, not position. Easy.
- Business: supports on-time visits; weaker on time-to-review.
- Technical: low. `GET /appointments` plus the existing overview. No new API.
- Error and recovery: appointments call can fail independently; the page must still show the review items and say "Visits could not be loaded. Try again."
- Evidence: WebPT dashboard [Observed]; Square, Calendly [Observed]; that review items get missed is [Judgement].

### B. Patient-centred caseload board

- Interaction model: one row per patient on the caseload showing every outstanding signal for that patient (visit today, unreviewed check-in, missed sessions, open tasks, missing intake). Sorted by patient or by count of open items.
- Benefits: removes the repeated-patient problem; supports "which patient needs me" thinking; good context before opening a record.
- Limitations: the therapist must scan every patient to find the urgent one; no ordering by time or age; row gets wide. Needs a client-side join of five sources.
- Accessibility: a table of patients with several status cells; text labels required in each cell.
- Business: neutral.
- Technical: medium. Join by `patient.id` across lists; no server change, but counts per patient are derived, and REQ-OVR-01 count equality must be shown per list elsewhere.
- Error and recovery: partial data per source must show "Not loaded" in that cell, never blank.
- Evidence: Stripe customer detail groups by customer [Observed]; WebPT "New Patients" list [Observed]. That clinicians think per patient is [Assumption].

### C. Action-oriented work queue

- Interaction model: a single full-width list of things to do, ordered by a stated rule (due or age first), each row carrying the reason, the patient, the age and a primary action. Visits appear as rows with a time. Filter chips by type.
- Benefits: answers "what needs me now" directly; maps to Linear My Issues, WebPT Tasking, Slack Unreads; resolves items without leaving if rows hold the action.
- Limitations: a flat feed loses the structure of the day; ordering rules must be explained or the queue looks like a hidden score (REQ-RVQ-04: no score). Navigating to detail is still a page change.
- Accessibility: a list with row-level buttons, needs a roving focus model and `aria-live` when rows leave.
- Business: strongest on time-to-review.
- Technical: low to medium. Client-side merge and sort. Row actions use existing endpoints.
- Error and recovery: undo toast after "Mark reviewed" is not possible server-side (review is recorded and `already_exists` on repeat). Say so honestly and confirm before the write, or show "Reviewed by you at 10:42" with no undo. Task resolve and dismiss require a note, so they cannot be one click.
- Evidence: Linear, Slack, WebPT tasking [Observed]; MedBridge RTM queue [Prior].

### D. Split-view workspace

- Interaction model: left column is one list in two groups, "Today" (visits in time order, next up marked) and "Needs your attention" (review tasks, unreviewed check-ins, missed activity, missing information), each group with its count. Selecting a row opens its context on the right: for a check-in, the check-in and the patient's last sessions with "Mark reviewed"; for a task, the explanation (rule, value, threshold, source) with Assign, Resolve, Dismiss; for a visit, the visit and a link to the record. Below 1024 the right pane becomes a full-screen step.
- Benefits: triage in one place without losing position; combines the day structure of A with the queue of C; the "why" of a task is shown at the point of the decision.
- Limitations: more moving parts; two-pane focus management; narrow widths need a different model; a long pane can hide the list's counts.
- Accessibility: list as `listbox` or list with `aria-current`; moving selection should not steal focus; the pane needs a labelled region and a way to return focus to the list item; 1024 px needs the stacked fallback.
- Business: best fit for resolving items without navigation; supports the metric on share of tasks resolved from the Overview.
- Technical: medium. Merge and sort client-side; pane content reuses existing queries (check-in detail, task detail, record timeline slice). No new endpoint required; one nice-to-have would be a merged feed, which is not needed for the first slice.
- Error and recovery: pane fails independently from the list ("This check-in could not be loaded. Try again."); a stale selected item (resolved elsewhere) shows "Someone else resolved this at 10:42" and moves selection to the next row.
- Evidence: Linear Inbox, Slack Activity, Calendly, Heidi [Observed]. That the combination suits a PT's day is [Judgement].

## 9. Mandatory gates

| Alternative | Accessibility | Privacy | Safety | Result |
|---|---|---|---|---|
| A. Schedule-first | Pass | Pass | Conditional: review items must stay visible without scrolling on a normal day; a pain report must never be below a long agenda | Eligible with the condition |
| B. Patient-centred board | Pass if each cell carries text | Pass | Pass if "Not loaded" is explicit | Eligible |
| C. Action queue | Pass with roving focus and live region | Pass | Conditional: ordering rule shown in words, no score, no urgency colours not backed by a rule | Eligible with the condition |
| D. Split-view | Conditional: needs stacked fallback below 1024 and a focus return rule | Pass | Pass if the task's rule, value, threshold and source stay visible in the pane | Eligible with the condition |

No alternative fails a gate outright. A failing detail would be a drag-only reorder or colour-only urgency; neither is proposed.

## 10. Weighted evaluation

Weights: default (task 25, safety/privacy/trust 20, usability/accessibility 20, business 15, operational efficiency 10, technical feasibility 5, design-system consistency 5). No adjustment: the default already favours task and safety, which is right for this screen. All scores are [Judgement] informed by the observations above; none is a measured result.

| Criterion (weight) | A Schedule-first | B Patient board | C Action queue | D Split-view |
|---|---|---|---|---|
| Task effectiveness (25) | 3: answers "who today" only | 3: answers "who needs me" by scanning | 4: answers "what now" directly | 5: answers all three and lets you act |
| Safety, privacy, trust (20) | 3: review items subordinate | 4: all signals per patient in one place | 4: reasons shown per row | 4: reason shown at the decision |
| Usability, accessibility (20) | 4: simple list | 3: wide rows, many cells | 4: simple list, needs live region | 4: two-pane focus work, fallback needed |
| Business value (15) | 3: helps punctuality | 3: neutral | 4: best time-to-review | 4: best share resolved in place |
| Operational efficiency (10) | 3: leaves for every action | 2: scan every patient | 4: one pass | 5: no navigation for common actions |
| Technical feasibility (5) | 5: API exists | 3: client join of five sources | 4: client merge | 3: merge plus pane content |
| Design-system consistency (5) | 4 | 3 | 4 | 3: new pane pattern |
| **Weighted (out of 5)** | **3.35** | **3.10** | **4.00** | **4.25** |

## 11. Recommendation

Selected: **D, split-view workspace**, built as C plus a detail pane. The left list keeps the two groups and per-group counts that REQ-OVR-01 requires; the right pane resolves the common actions. Visits sit first in time order with "Next up" in words.

Why it beats the runner-up C: C answers "what now" but still sends the therapist to another page to decide, and it flattens the day. D keeps C's ordering and adds the pane, so the decision happens beside the evidence. If the pane proves too costly, C is the fallback and shares the list, so no work is lost.

Runner-up: **C, action queue.**

Rejected: A as the whole screen (review items too subordinate), but keep its time-ordered visit group. B as the main model (forces a scan of everyone), but keep its idea of grouping repeated patients: when a patient has more than one open item, show one row with the reasons listed and the count visible. KPI tiles (Dialpad, Zendesk, Jobber style) stay rejected per the brief.

Trade-off: more interaction complexity and a stacked fallback under 1024 in exchange for fewer page changes per item. "Mark reviewed" has no undo on the server; the pane must say what it records before writing.

## 12. Requirement alignment row

| Field | Entry |
|---|---|
| User segment | Physical therapist on a care team |
| Job to be done | Decide what to do next, see who is coming, and act on review items between patients |
| Pain point | Seven separate sections, repeated patients, navigation to act, no single order of attention |
| Business objective | Reviews happen sooner; fewer clicks per resolved item |
| Functional requirement | REQ-OVR-01 lists with counts equal to list length, no KPI tiles; in-place mark-reviewed and task actions; visits in time order |
| Success metric | Time from check-in submitted to reviewed; share of tasks resolved without leaving; oldest unreviewed check-in age |
| Design hypothesis | [Assumption] A time-ordered visit group plus a reasoned attention group, with the decision pane beside the list, reduces navigation per item without hiding anything |
| Selected pattern | Split-view list and detail pane |
| Technical dependency | `GET /overview`, `GET /appointments`, check-in review, review-task assign/resolve/dismiss; client-side merge |
| Validation method | Task-based usability test with PTs (not yet run); keyboard-only walkthrough; axe and Playwright on list-pane focus; compare navigation depth against the current page |

## 13. States to design

| State | Microcopy (draft) | Recovery |
|---|---|---|
| Default | "Today, Nov 20. 3 visits. 5 items need your attention." | None |
| Hover / focus / active / selected | Row highlight with a text "Selected" for assistive tech; focus ring distinct from selection | Esc returns focus to list |
| Loading | "Loading your day" skeleton for each group separately | Groups load independently |
| Empty, attention group | "Nothing needs your attention. Checked at 9:02 AM." | Refresh |
| Empty, visits | "No visits today. Nothing is booked with you." | Link to Schedule |
| Partial data | "Visits could not be loaded." with the attention group still shown | "Try again" |
| Validation error | Task resolve without note: "Write a short note about what you decided." | Focus moves to the note field |
| Server error | "This could not be saved. Nothing was recorded." | "Try again", row keeps its place |
| Network loss | Banner "You are offline. This list is from 9:02 AM." and actions disabled with reason | Auto-refresh on reconnect |
| Permission denied | "Only members of this patient's care team can mark this reviewed." (reuse existing reason text) | Link to the record |
| Success | Row shows "Reviewed by you, 9:05 AM" and moves to a "Done in this session" fold | No undo; says so before confirming |
| Stale information | "This list is from 9:02 AM." plus "Refresh"; selected item resolved elsewhere shows who and when | Selection moves to next row |
| Cancellation | Closing the pane with an unsaved note asks "Discard this note?" | Keep editing / Discard |
| Interrupted workflow | Unsaved note held in the pane until the item leaves the list | Restored on return |
| Disabled | A blocked action always shows its reason in text. Checkpoint C2 ruling 7 prefers an enabled button that moves focus to the reason over a disabled one; follow that | None |

Not applicable: unsaved changes beyond the note, selected multiples (no bulk review on purpose, see I).

## 14. Responsive behaviour

| Width | Behaviour |
|---|---|
| 1920 | Two panes with a wider detail; list column keeps a readable maximum width; no extra tiles to fill space |
| 1440 | Two panes, list about one third |
| 1024 | Two panes if the detail can be at least a readable column; otherwise list with a slide-over detail |
| 768 | Single column: list, then detail as a full-screen step with a Back control and focus returned to the row |
| 390 and 375 | Single column, groups collapsible, large touch targets, detail full screen. Clinician mobile is secondary [Assumption], so this is a graceful fallback, not a designed mobile product |

Always stays: group order (Today first), counts, "as of" time, patient name on every row. Moves to panels: explanation, history, actions. Changes model: below 1024 from split to list-then-detail.
