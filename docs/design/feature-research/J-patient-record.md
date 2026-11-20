# J. Patient medical record — feature research

Protocol: `docs/design/RESEARCH-PROTOCOL.md`. Brief: `docs/DESIGN-BRIEF.md` §5–§9, §7 J. Access date for every external source: 2026-11-20. Status: provisional until advisor sign-off. Colours are not chosen here.

Evidence labels: **[Observed]** retrieved and looked at or read this session; **[Prior]** from `docs/research/*.md`; **[Judgement]** expert reasoning; **[Assumption]** untested.

## 1. User problem

Before and during a visit, the therapist needs to understand one patient: who they are, what the plan is, what the patient has done and reported since the last visit, what is waiting for review, and, just as important, what is not known. The record must never let a gap look like good news. A patient with no recent check-ins, a failed load, and a patient who is doing fine all look the same if absence is not shown.

## 2. User and context

- Segment: physical therapist on the care team (read and write). Care coordinator and admin see an administrative slice, with clinical sections hidden by the API (`clinical.read`).
- Context: desk or treatment room, desktop, often opened from a visit row, a check-in link or a review task. Reads for seconds before a visit, longer when writing a plan.
- State: switching between patients many times a day, so the risk of acting in the wrong patient's record is real. [Judgement]
- Frequency: many times a day.

## 3. Business objective

Clinicians form an accurate picture quickly and act without wrong-patient or stale-data errors. Metric names only: time to first meaningful action after opening a record; wrong-patient correction events; share of record opens with a stale or missing-data notice shown; tab/section switches per open; check-ins reviewed from the record. No targets claimed.

## 4. Constraints

Functional (`contracts/patients.ts`, `records.ts`, `care-plan.ts`, `intake.ts`, `api-phase3.md`):
- Header: `GET /patients/:id` returns `PatientHeader` (id, MRN, name, birth date, gender, status, timezone, preferred language, `onCareTeam`). It has **no allergies, medications or problem list**. Nothing in the contracts collects medications or allergies, so "relevant medications where applicable" cannot be shown as data today.
- Intake: `GET /patients/:id/intake` returns steps with answers and a `missing` list for clinical readers.
- Timeline: `GET /patients/:id/timeline` is a union of plan versions, sessions, check-ins and review tasks. Record history (`record-history`) is built from domain rows, not the audit log (ruling 3.7), with actor and detail.
- Plan: current published version with `diffFromPrevious`; versions list; draft only for clinicians.
- Provenance available today: plan versions carry `publishedBy` and time; history items carry an actor; check-in pain is patient-reported; sessions are patient-performed; review tasks are rule-generated with rule, value, threshold, source. Check-in `reviewedAt` and reviewer exist.
- Freshness available today: every item has a timestamp. The page has no "data as of" stamp, and `lastActivityAt` appears only in the directory.
- REQ-REC-01 persistent header and sections; REQ-REC-02 every record open audited; REQ-REC-03 writes refused off care team (403 `not_on_care_team`).

Safety/privacy: pain is always labelled patient-reported; no diagnostic terms (`BANNED_DIAGNOSTIC_TERMS` apply to patient input); no risk scores. AI summaries are a later phase (M) and must not be baked into the record's data. Accessibility (WCAG 2.2 AA): landmark structure, sticky header must not obscure focus (2.4.11), tab pattern per ARIA, timestamps as text, status not by colour alone.

## 5. Current CarePath implementation

Read: `apps/web/app/(clinician)/patients/[patientId]/record.tsx` (166), `tabs.tsx` (888), `appointments-tab.tsx`; screenshots `docs/screenshots/3.3/record-overview-1440.png`, `record-plan-*`, `record-activity-*`, `record-history-*`, `record-check-ins-*`.

What exists [Observed]: a sticky header with name, MRN, birth date, status, time zone and care-team names, plus "Open care plan builder" (disabled with a reason when off the care team). Tabs: Overview, Plan, Activity, Appointments, Check-ins, History. The Overview tab is a four-cell summary row (Care plan, This week, Latest check-in, Open review tasks) above a newest-first Timeline of plan versions, sessions, check-ins and review tasks.

Weaknesses [Judgement unless marked]:
1. The summary lives on the Overview tab only. On Plan, Activity or Check-ins the therapist loses it. The header is persistent, but it holds identity, not state. [Observed in code]
2. Nothing says what is not known. No medications or allergies row (not collected), no "no check-in in N days" statement, no "intake not submitted". The baseline review already flagged the tile row as weak. [Observed: baseline note in `docs/decisions/checkpoint-c2.md`]
3. No freshness stamp. Four cells are four separate queries; one can fail or lag while the others show, with no common "as of" time.
4. Provenance is partial: the timeline shows what happened but not always who or what produced each row (patient-reported versus clinician-published versus rule-generated). "Patient-reported" wording exists for pain only.
5. Six tabs split a chronology across Activity, Check-ins and History, so the therapist reconstructs the story across tabs. The Overview timeline partly covers this.
6. The tab bar and the sticky header together take vertical space at 1024.
7. The record page title includes the patient's name (`document.title`), which appears in browser history and window lists.

## 6. Production references observed

| Product | Platform | Screen / flow | URL | Access date | What was observed | Label |
|---|---|---|---|---|---|---|
| Epic Hyperspace | Web | Storyboard (public pages from UNMC and Connect Care) | https://www.unmc.edu/newsroom/2019/11/27/coming-soon-changes-to-one-chart-patient-workspace/ ; https://ehealth.connect-care.ca/epic-systems/epic-modules/storyboard | 2026-11-20 | Text: a persistent patient-context panel docked on the left shows demographics, allergies, problems, medications and social factors on every chart section; role-relevant; hover-to-act instead of screen changes; activity tabs simplified. No interface inspected. | [Observed] text |
| Heidi (clinical scribe) | Web | Patient context tab, tabs per output, past sessions (Mobbin flows) | https://mobbin.com/flows/a97b7f1d-0cc8-4934-90d6-8d452ca8ef37 ; https://mobbin.com/flows/d4e79e3b-5c1f-4d83-b096-98006a1590b7 | 2026-11-20 | Patient name and condition chips stay at the top while a tab strip switches Context, Transcript, Note and generated documents; Context shows patient facts (age, medications, history) and a "Past sessions / attachments" strip with counts; edit-profile dialog says changes apply across linked sessions; a banner reminds the clinician to review the note before use. | [Observed] |
| Stripe Dashboard | Web | Customer detail (Mobbin) | https://mobbin.com/screens/1a4aa88b-e0be-49b2-a87f-1264e0b5e786 ; https://mobbin.com/screens/731c4495-3c95-42b2-9502-5a1b60ab96eb ; https://mobbin.com/screens/fb0b91ce-234b-44d5-9f8b-18864cc63941 | 2026-11-20 | Sections stacked on one page (Subscriptions, Payments, Payment methods, Quotes, Credit grants, Recent activity) with a right rail of Details (ID, since, language) and Metadata. Empty sections show dashed boxes that say "No quotes", "No credit grants". Recent activity is a short timeline with an Add note button. | [Observed] |
| Linear | Web | Issue detail (Mobbin) | https://mobbin.com/screens/beb9d6b3-ec34-46d7-9332-320fcb32a338 | 2026-11-20 | Main column with description and an Activity log of who did what and when; right rail of Properties (status, priority, assignee, labels). | [Observed] |
| Notion, Substack, Fibery, Jasper, Productboard, WRITER | Web | Version history overlays (Mobbin) | https://mobbin.com/screens/780626a3-20f5-4795-ac3b-bdbaef325210 ; https://mobbin.com/screens/b9578385-f96c-45a2-b2e2-483bfc410cb6 ; https://mobbin.com/screens/eb05e8be-4a16-47f0-94fe-08ad3da74171 ; https://mobbin.com/screens/3ee3cebd-6fe9-4f61-a5ca-34ba40e62a5a | 2026-11-20 | Timestamped list of versions with author name, a "Current version" label, optional "Show changes" toggle, and a Restore action behind a confirm. Used for record history and provenance of plan versions. | [Observed] |
| Slack | Web | Activity row states (Mobbin) | https://mobbin.com/screens/5ce7d656-677b-4ad9-8417-127b1a822408 | 2026-11-20 | Each item states its own condition in words ("Saved for later"). | [Observed] |
| WebPT EMR | Web | Dashboard "At a Glance Alerts" (help article) | https://help.emr.webpt.com/article/1114-webpt-dashboard | 2026-11-20 | Alerts for incomplete patient profiles and pending documentation, i.e. missing information is a first-class alert. Text only. | [Observed] text |
| Medplum | Web | Charting docs (Chart Data Model, summary at each visit) | https://www.medplum.com/docs/charting | 2026-11-20 | The page says the patient summary is reviewed at each visit and lists resources behind a chart (Patient, Observation, Condition, allergies, devices, vitals). Does not describe layout. | [Observed] text, thin |
| drChrono | Web | Patient chart sidebar navigation (help article) | https://support.drchrono.com/home/patient-chart-side-navigation | 2026-11-20 | Fetched, but the body text was not returned. Nothing was learned from it. | Not inspected |
| SPRY, MedBridge, Tebra, MyChart | Web | Chart screens | n/a | 2026-11-20 | Not on Mobbin; no public chart screens retrieved. MyChart is a patient portal and not a clinician chart. | Not accessible |
| Mobbin patterns file | n/a | Pattern 13 Patient profiles and pattern 14 Data tables | `docs/research/mobbin-patterns.md` | 2026-11-19 (prior) | Earlier session found no clinician-desktop healthcare captures on Mobbin and used non-health transfers. Today's search agrees. | [Prior] |

## 7. Established patterns

1. A persistent patient context stays on screen while the work area changes: Epic Storyboard (text), Heidi (header with chips above tabs). The persistence is about identity plus the facts that change decisions. [Observed]
2. Detail pages with a main column and a right rail of key facts are common outside healthcare (Stripe, Linear). The rail holds identifiers and state; the column holds sections. [Observed]
3. Empty sections are stated, not hidden: dashed box with a sentence (Stripe). [Observed]
4. History shows who and when, with a "Current" marker and a changes toggle (version history overlays). [Observed]
5. Activity logs say actor, action and time in one line (Linear, Stripe). [Observed]
6. Where AI output is shown, a standing reminder to review it sits in the work area (Heidi). Relevant to M, not J. [Observed]
7. Missing information is raised as an alert before work starts (WebPT alerts). [Observed text]

## 8. Alternatives

### A. Tab-based record (current model, refined)

- Interaction model: header on top, a tab strip (Overview, Plan, Activity, Appointments, Check-ins, History), one section visible at a time.
- Benefits: familiar; low cost; each section has room; deep links by tab already work (`?tab=`).
- Limitations: state is hidden unless on Overview; the story is split; absence has no home. It is the model that produced weaknesses 1 to 5.
- Accessibility: well-supported ARIA tabs pattern. Easy.
- Business: neutral.
- Technical: none; exists.
- Error and recovery: per-tab errors already independent.
- Evidence: current implementation [Observed]; Heidi uses tabs for outputs [Observed].

### B. Timeline-centred record

- Interaction model: one chronological stream of everything (plan versions, sessions, check-ins, tasks, appointments, history events) with filters by type. No separate sections.
- Benefits: the story in one place; strong for "what happened since last visit"; `GET /timeline` already unions four sources.
- Limitations: **absence is not representable.** A patient who stopped doing sessions produces no rows, which looks the same as a failed load. The current plan, goals and care team have no natural place. Long streams bury the one old item that still matters (the active plan).
- Accessibility: feed pattern; long lists need landmarks and jump links.
- Business: neutral.
- Technical: low to medium; timeline lacks appointments and intake; merging more sources is client-side.
- Error and recovery: a failed source silently shortens the feed unless each source reports status.
- Evidence: Stripe "Recent activity" and Linear Activity are secondary logs, not the main model [Observed]. That a pure timeline hides absence is [Judgement], but it follows directly from how a list of events works.

### C. Persistent patient summary with contextual workspace

- Interaction model: a left or top-left summary panel stays on screen across sections: identity (name, MRN, birth date, status, time zone, language), care team, **current state lines** (current plan and version with date, this week's completion, latest check-in and whether reviewed, open review tasks, next visit, last activity), and a **"Not recorded" block** (medications and allergies: not collected; intake: submitted or not; no check-in since N days). A single "Record as of 9:02 AM" stamp sits at the top. The right workspace holds the section views (Plan, Timeline, Check-ins, Appointments, History) chosen by a simple segmented control or section list; the timeline is one view among them, and the default view is the timeline filtered to "since last visit".
- Benefits: state is visible while working in any section; absence and freshness have a fixed home; wrong-patient risk drops because identity and state never leave; matches Epic Storyboard and the Stripe rail pattern.
- Limitations: takes horizontal space (about a quarter at 1440); needs parallel fetches (header, plan, progress, check-ins, tasks, intake, appointments) and clear per-line error states; a summary that grows becomes a second page; must be limited to what changes decisions.
- Accessibility: summary as a labelled region with `aria-live` off (not chatty); sticky behaviour must not cover focused elements at 400 percent zoom; a skip link to the workspace; below 1024 collapses into an expandable header.
- Business: supports accurate review and fewer wrong-patient errors; does not itself raise any engagement metric.
- Technical: medium. All data exists except medications and allergies; per-line loading and error handling; the "since last visit" default needs a rule for "last visit" (appointments end time) [Assumption].
- Error and recovery: each summary line fails separately with "Could not load. Try again." and never shows an empty value; a line with no data says "None recorded", not blank; the "as of" stamp shows the oldest line, not the newest.
- Evidence: Epic Storyboard text [Observed], Heidi header and context strip [Observed], Stripe right rail and explicit empty sections [Observed]. Effect on accuracy is [Assumption] until tested.

### D. Modular record overview

- Interaction model: a dashboard-style overview of modules (care plan, progress, check-ins, tasks, appointments), each a card with a small chart or number, click a module to open its section.
- Benefits: fast glance; each module can be reordered later.
- Limitations: cards compress structured clinical facts into tiles and numbers; absence becomes an empty card or a zero, easy to misread (zero check-ins versus not loaded); the brief and baseline review both warn about tile rows; modules add navigation hops.
- Accessibility: many cards each with their own link; heading structure needed.
- Business: looks complete; offers little over C.
- Technical: low to medium.
- Error and recovery: each module's failure must be visible and distinct from zero.
- Evidence: Jobber and Dialpad show tile dashboards [Observed]; the baseline note says the current tile row is a weak spot [Observed]; benefit claims are [Assumption].

## 9. Mandatory gates

| Alternative | Accessibility | Privacy | Safety (misleading absence, staleness, wrong patient) | Result |
|---|---|---|---|---|
| A. Tabs | Pass | Pass | Conditional: needs a state/absence line on every tab, not just Overview | Eligible with condition |
| B. Timeline only | Pass | Pass | **Fail:** absence cannot be shown, so an inactive patient and a failed load look the same; no home for current plan, goals, "not collected" facts | **Ineligible as the whole model.** A timeline stays valid as one view inside C. |
| C. Summary + workspace | Conditional: sticky behaviour and collapse below 1024 | Pass: summary shows no more than identity, state and absence; record open stays audited | Pass if each line has a loading, error and "none recorded" state and the "as of" uses the oldest line | Eligible |
| D. Modular tiles | Pass with headings | Pass | Conditional: a zero must be told apart from not loaded and not collected | Eligible with condition |

## 10. Weighted evaluation

Weights adjusted for this feature, with reason: task 25, **safety/privacy/trust 25 (up from 20)**, usability/accessibility 20, **business 10 (down from 15)**, operational 10, technical 5, design system 5. Reason: the brief names misleading interpretation of unavailable or outdated information as the central risk here, and the business case is indirect. Scores are [Judgement]. B's row is shown for completeness; it is ineligible regardless of score.

| Criterion (weight) | A Tabs | B Timeline | C Summary + workspace | D Modular |
|---|---|---|---|---|
| Task effectiveness (25) | 3: sections have room, story split | 3: good story, no state | 5: state always visible, section on demand | 3: glance only |
| Safety, privacy, trust (25) | 3: absence only if added per tab | 2: absence unrepresentable | 5: fixed place for absence, freshness, identity | 3: zero versus unknown risk |
| Usability, accessibility (20) | 4: native pattern | 3: long feed | 4: sticky panel needs care | 3: many cards |
| Business value (10) | 3 | 3 | 4: fewer wrong-patient errors | 3 |
| Operational efficiency (10) | 3: tab switches | 3 | 4: no switch to see state | 2: extra hops |
| Technical feasibility (5) | 5: exists | 4 | 3: parallel fetches | 4 |
| Design-system consistency (5) | 5: Tabs exists | 3 | 3: new panel | 4 |
| **Weighted (out of 5)** | **3.40** | **2.80 (ineligible)** | **4.40** | **3.00** |

## 11. Recommendation

Selected: **C, persistent patient summary with a contextual workspace.** The summary carries identity, care team, current-state lines, a "Not recorded" block and one "Record as of" stamp; the workspace shows Timeline (default, "since last visit"), Plan, Check-ins, Appointments and History. Medications and allergies appear as "Not collected in CarePath" until the product collects them; do not invent fields.

Why it beats the runner-up A: A cannot give absence and freshness a permanent place without repeating the same block on every tab, which is C in all but name; C does it once and keeps the persistent identity that guards against wrong-patient actions.

Runner-up: **A, tabs**, with the summary promoted into a sticky strip. It is the lower-cost route and uses the same data and states.

Rejected: B as the whole model (fails the safety gate; kept as a view), D (tiles, ambiguous zero). Drop the "Activity" versus "Check-ins" versus "History" split in favour of the timeline with filters plus a History view for audit-style entries.

Trade-off: about a quarter of the width and a more demanding loading model in exchange for visible state and absence. Provenance: every row states its source in words ("Patient-reported", "Published by T. Demo, PT", "Created by clinic rule: reported pain 7 or higher").

## 12. Requirement alignment row

| Field | Entry |
|---|---|
| User segment | Physical therapist on the care team; coordinator and admin see the administrative slice |
| Job to be done | Understand one patient fast and know what is missing before acting |
| Pain point | State only on one tab; no statement of what is unknown; no freshness stamp; story split over three tabs |
| Business objective | Accurate decisions, fewer wrong-patient or stale-data errors |
| Functional requirement | REQ-REC-01 persistent header, sections and time-ordered timeline; REQ-REC-02 audit; REQ-REC-03 write refusal |
| Success metric | Time to first action; wrong-patient correction events; share of opens showing a missing or stale notice; section switches per open |
| Design hypothesis | [Assumption] A constant summary with an explicit "not recorded" block reduces misreading of gaps compared with tabs |
| Selected pattern | Persistent summary with contextual workspace |
| Technical dependency | `GET /patients/:id`, `intake`, `care-plan`, `progress`, `check-ins`, `review-tasks`, `appointments`, `timeline`, `record-history`; no new endpoint for the first slice; medications/allergies need a data model if wanted |
| Validation method | Scenario test where one source is withheld and the therapist must say what is unknown (not run); keyboard and zoom test at 400 percent; axe; comparison of switches per task against current tabs |

## 13. States to design

| State | Microcopy (draft) | Recovery |
|---|---|---|
| Default | "Record as of 9:02 AM" and each line with its own time | None |
| Hover / focus / active / selected | Timeline row focus ring; selected section in the workspace control | Esc closes any drawer |
| Loading | Each summary line skeleton with "Loading" label; header first | Lines load independently |
| Empty line | "None recorded" (care plan: "No published plan yet") | Link to the action that creates it |
| Not collected | "Medications: not collected in CarePath" | None |
| Partial data | "Could not load latest check-in. Try again." beside the line | "Try again" per line; the "as of" stamp shows the oldest loaded line |
| Validation error | n/a (read-mostly) except notes: field-level text | Focus to field |
| Server error | "This record could not be loaded." | "Try again" |
| Network loss | "You are offline. This record is from 9:02 AM." | Auto-refresh |
| Permission denied | Off care team: writes disabled with "Only members of this patient's care team can change the plan." Reading allowed. No access at all: "You do not have access to this record." | Link to directory |
| Stale information | "Check-in data is 3 hours old" when a line is older than its normal refresh | Refresh |
| Success | Toast "Check-in marked reviewed" and the line updates with reviewer and time | None |
| Interrupted workflow | Returning to the record restores the section and scroll | None |
| Unsaved changes | n/a here (plan edits live in K) | n/a |
| Cancellation | n/a | n/a |

Provenance text pattern: source word + actor + time, for example "Patient-reported, Nov 19, 9:00 AM" or "Published by Terry Demotherapist, PT, Nov 3".

## 14. Responsive behaviour

| Width | Behaviour |
|---|---|
| 1920 | Summary panel fixed width, workspace wide; no extra modules added to fill space |
| 1440 | Summary about a quarter, workspace the rest |
| 1024 | Summary narrows; identity and one-line state stay, the rest in an expandable section |
| 768 | Summary becomes a sticky compact header (name, MRN, status, as-of time) with a "Details" disclosure; workspace full width |
| 390 and 375 | Compact header; sections as a horizontally scrollable control or select; timeline rows stack; clinician mobile is secondary [Assumption] |

Always stays: patient name, MRN, birth date, status, as-of stamp. Moves to panels: care team, not-recorded block, state lines. Changes model: below 1024 from side panel to expandable header.
