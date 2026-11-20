# K. Care-plan builder — feature research

Protocol: `docs/design/RESEARCH-PROTOCOL.md`. Brief: `docs/DESIGN-BRIEF.md` §5–§9, §7 K. Access date for every external source: 2026-11-20. Status: provisional until advisor sign-off. Colours are not chosen here.

Evidence labels: **[Observed]** retrieved and looked at or read this session; **[Prior]** from `docs/research/*.md`; **[Judgement]** expert reasoning; **[Assumption]** untested.

## 1. User problem

A therapist needs to turn a patient's situation into a clear, safe set of exercises with doses and a weekly schedule, change it as the patient progresses, and be certain what the patient sees now versus what is still being edited. The costs of getting it wrong are a patient doing the wrong thing, or a patient never seeing a change the therapist believes was sent.

## 2. User and context

- Segment: physical therapist on the patient's care team (`clinical.write`, `careplan.publish`, care team only). Others read.
- Context: desktop at a desk, often between visits or right after one; sometimes with the patient in the room. [Assumption]
- State: focused, building something that has clinical weight; needs to move quickly for routine edits (swap an exercise, change a dose) and carefully for a first plan.
- Frequency: first plan once per patient, small edits weekly or per visit. [Assumption]

## 3. Business objective

Plans reach patients quickly and correctly, edits are cheap, and unpublished work is never mistaken for published work. Metric names only: time to first publish; time to publish an edit; edits per plan version; draft-abandonment rate (draft untouched for N days, with N defined later); publish-time validation errors; "draft was saved somewhere else" conflicts; share of version 2+ publishes with a note on the first attempt. No targets claimed.

## 4. Constraints

Functional (`contracts/care-plan.ts`, `exercises.ts`, `api-phase3.md`; ADR-10 in the plan):
- One mutable **draft** per plan (`CarePlan.draftContent`) and immutable **published versions**. `PUT /care-plan/draft` with `expectedUpdatedAt` (409 `draft_stale`), `GET /care-plan/draft/preview` renders the patient serializer, `POST /care-plan/publish` needs `changeNoteForPatient` from version 2 (400 otherwise, AC-B4), 409 on concurrent publish, 403 `not_on_care_team`.
- `PatientCarePlan` carries `diffFromPrevious` (added, removed, changed exercises), author, publish date, change note. Versions list and detail endpoints exist.
- Draft item: exercise id, position, dose (sets, reps, hold, duration, rest; at least one of reps, duration or hold), schedule (days of week, times per day), instructions up to 1000 characters; plan title, instructions, goals.
- Exercise library: search by name, body area, category, cursor paging; `defaults` per exercise. All exercises are fictional and not medically reviewed.
- Reordering is by move up and move down buttons (AC-B8, REQ-PLN-02); a session in progress keeps its version (AC-B5).
- **No template endpoint, no copy-from-previous endpoint, no archive endpoint, no plan-level retire or discharge state.** A search of contracts, API and schema for "archive", "template", "superseded" found nothing. The four states the brief asks for therefore map as: *draft* (exists), *published* (exists), *updated* (derived: a draft exists on top of a published version), *archived* (not in the data model).

Safety/privacy: preview must be the exact patient rendering; a plan never shows to the patient before publish (AC-B1); plan text is clinician-authored, but fixed copy must not use banned diagnostic terms; "Set by your care team" labels exist for patient view (REQ-PLN-06). Accessibility (WCAG 2.2 AA): no drag-only reordering (2.5.7); focus kept on the control after reorder; live announcements; field labels, requirement text and error text tied to fields (3.3.1, 3.3.2); autosave status as text; leaving with unsaved changes warns.

## 5. Current CarePath implementation

Read: `plan/builder.tsx` (896), `item-editor.tsx`, `library.tsx`, `builder-state.ts`, `publish-dialog.tsx`; `tabs.tsx` PlanTab and VersionList; screenshots `docs/screenshots/3.3/plan-builder-1440.png`, `plan-builder-edited-1440.png`, `plan-builder-preview-1440.png`, `plan-builder-library-1024.png`, `record-plan-1440.png`.

What exists [Observed]: a split-pane. At 1280 and above a sticky exercise library on the left (search, body area, type, Add with suggested dose); below 1280 the library is a drawer. The right side has Build, Patient preview and Versions tabs. Build holds Plan details (title, instructions), Exercises (ordered, each with sets, reps, hold, duration, rest, weekly schedule, instructions, move up/down, Remove) and Goals. A sticky status bar shows "Unsaved changes. Saving automatically." or "Draft saved at 9:02 AM" and the button "Review and publish version N". Autosave runs 900 ms after an edit. A stale-draft banner offers "Load the saved draft". The publish dialog shows the API's diff against the current version and requires a patient note from version 2. Leaving with unsaved edits triggers the browser's warning.

Strengths worth keeping: autosave with honest status; draft stays clinician-only and the header sentence says so; diff at publish; keyboard-safe reorder with focus management; independent error banners.

Weaknesses [Judgement unless marked]:
1. Draft versus published is explained in one sentence in the page header and a status line. While editing there is no persistent marker of "the patient currently sees version 3" versus "your draft differs by these changes". The diff appears only inside the publish dialog.
2. The record's Plan tab does show a notice ("An unpublished draft was saved ... by ... The patient does not see it") with a Continue editing link [Observed in code], but it gives no count of what differs, and the Overview summary and the directory's plan stage is one of none, draft or published, so a draft on top of a published version is probably not distinguishable there [Assumption: API logic not checked].
3. Starting a plan is always blank (or, if a version exists, a copy of it). No starting points: nothing like "copy last plan", nothing like a saved protocol.
4. Dose editing is five number fields per exercise in a large form; routine edits (change reps) take reading through the whole card.
5. The library "Add" does not preview media or full instructions before adding, and an exercise already in the plan is just ignored on a second Add. [Observed in code: `addExercise` returns early silently]
6. Archived or retired plans have no representation (API gap, see §4).
7. The 3.3 screenshots predate later changes and should be recaptured before use as a baseline.

## 6. Production references observed

| Product | Platform | Screen / flow | URL | Access date | What was observed | Label |
|---|---|---|---|---|---|---|
| WebPT HEP | Web | Home exercise program overview (help article) | https://help.hep.webpt.com/article/232-home-exercise-program-overview | 2026-11-20 | Content tab with exercise search (including alternate exercise names) on one side and a Care Plan panel on the right that holds the selected exercises; add by hover-Add or drag; sets, reps, frequency set through a Preview step; "save as template" beside Submit Care Plan; later add a template's exercises into a new plan; Submit assigns and emails the plan; edits by the therapist appear for the patient automatically; the article describes no version history. Text only. | [Observed] text |
| MedBridge | Web | Blog "5 shortcuts" and HEP Template Center | https://www.medbridge.com/blog/5-shortcuts-to-save-time-building-home-exercise-programs ; https://www.medbridge.com/care/home-exercise-program/templates | 2026-11-20 | Templates saved for common conditions can be dragged into a patient's plan and adjusted; enterprise accounts can share templates across the organisation; prebuilt programs with progressions by recovery phase; a builder with filters and a large video library. Customisation steps are not described. Text only. | [Observed] text |
| SPRY | Web | Help: how to create an exercise program | https://help.spryhealth.ai/how-to-create-an-exercise-program | 2026-11-20 | A program is named and described, exercises added with a plus, saved to a Programs list, then assigned to a patient from the HEP section or from the Plan section of documentation. A program is built independently of a patient, then assigned. The page says nothing about library, templates or dose editing. | [Observed] text, thin |
| Heidi | Web | Creating a template flow (Mobbin) | https://mobbin.com/flows/fd747a45-a7f5-4d74-a854-23395bad062a | 2026-11-20 | A picker with search, Sort, Type, Creator filters and a Pinned group; a template editor with a side helper explaining placeholders and instructions, a Visibility setting (Only me or Community), and two commit actions, "Save for later" and "Save & use". | [Observed] |
| Linear | Web | Inline issue create (Mobbin) | https://mobbin.com/screens/953e88d0-de6c-4eaf-9921-cd0c55bb8412 | 2026-11-20 | A compact quick-create with title, description and property chips (priority, assignee, estimate, labels) and Cancel / Create. A structured single-surface form with optional fields as chips. | [Observed] |
| Retool | Web | App builder (Mobbin) | https://mobbin.com/screens/9d79bc14-9681-470d-8f32-6f02fb2de205 | 2026-11-20 | Three regions: component library on the left, canvas in the middle, properties panel on the right, with a persistent Share and Run area. The split-pane library plus editor pattern. | [Observed] |
| Employment Hero | Web | Bulk issue documents wizard (Mobbin) | https://mobbin.com/screens/5cc27a92-8943-4040-bb5e-d16accf703fc | 2026-11-20 | A five-step stepper (Select personnel, Select template, Edit base document, Review documents, Issue documents) over a table. A template-first wizard that ends in a review step before issuing. | [Observed] |
| Walmart Pharmacy | Web | Schedule an immunisation stepper (Mobbin) | https://mobbin.com/screens/4e6ec049-c99e-40df-8ee8-42159d31e985 | 2026-11-20 | Four-step stepper (Patients, Appointment, Information, Review) with Exit and a toast confirming additions. Sequential wizard. | [Observed] |
| Notion, Substack, Fibery, Jasper, Productboard, WRITER | Web | Version history overlays (Mobbin) | https://mobbin.com/screens/780626a3-20f5-4795-ac3b-bdbaef325210 ; https://mobbin.com/screens/b9578385-f96c-45a2-b2e2-483bfc410cb6 ; https://mobbin.com/screens/eb05e8be-4a16-47f0-94fe-08ad3da74171 ; https://mobbin.com/screens/d6e6654e-119a-456a-acef-fcb72d9ec330 | 2026-11-20 | Versions listed with time and author, a "Current version" label, a Show changes toggle (Fibery, Productboard), a Restore action with a confirm that says what will be overwritten. WRITER says "If you restore this version, you'll overwrite your current doc". | [Observed] |
| Medplum | Web | Charting docs | https://www.medplum.com/docs/charting | 2026-11-20 | Mentions PlanDefinition with `$apply` for visit templates and signing; says nothing about a builder UI. | [Observed] text, thin |
| MedBridge (prior) | Web | HEP builder summary | `docs/research/competitor-analysis.md` §2.1 | 2026-11-19 (prior) | Drag-and-drop builder, large video library, EMR documentation. Not re-checked. | [Prior] |
| Tebra, Epic | Web | Care-plan or treatment-plan builder | n/a | 2026-11-20 | No public builder pages retrieved. Tebra search returned only chart and billing guides. | Not accessible |

## 7. Established patterns

1. Rehab builders pair a searchable library with a plan panel, with add by click or drag (WebPT; MedBridge in prior research). The pairing is the dominant model. [Observed text]
2. Dose is set on a per-exercise basis after adding, often through a small preview step (WebPT). [Observed text]
3. Reuse comes from templates saved from a built plan and applied into a new plan, then adjusted (WebPT, MedBridge). [Observed text]
4. Some products build a program first and assign to a patient second (SPRY). [Observed text]
5. Reusable objects have two commit states, "save for later" and "save and use" (Heidi). [Observed]
6. Version history lists time, author and a current marker, with an optional "show changes" and a restore with an explicit overwrite warning (Notion, Fibery, WRITER). [Observed]
7. Wizards are used when the sequence is the point and edits are rare (Employment Hero, Walmart); builders for repeat editing use a persistent canvas with side panels (Retool). [Observed, Judgement]
8. WebPT's public article describes edits reaching the patient automatically and no version history. CarePath's immutable versions with a patient-facing change note are stronger on traceability than what the article describes. [Observed text, Judgement]

## 8. Alternatives

### A. Sequential wizard

- Interaction model: steps such as 1 Details, 2 Choose exercises, 3 Set doses, 4 Schedule, 5 Goals, 6 Review and publish, with Next and Back and a stepper.
- Benefits: forces a review step; easy to teach; each screen has few fields; good for a first plan.
- Limitations: slow for edits: changing one dose means walking back through steps; context of the whole plan is hidden while working on one part; library and plan not visible together.
- Accessibility: stepper pattern is well understood; progress text needed; error recovery must route back to the right step.
- Business: protects quality for new plans; poor time-to-edit.
- Technical: low. The draft PUT works on a whole draft, so a wizard would save partial drafts the validator may reject; the API requires a complete valid plan (title, at least one item with valid dose and schedule), so step-by-step saves need client-side holding of invalid state.
- Error and recovery: a validation error at publish sends the user back to a step; the current autosave model would be lost.
- Evidence: Employment Hero, Walmart [Observed]. Slowness for edits is [Judgement].

### B. Structured single-page builder

- Interaction model: one scrolling page with sections Details, Exercises, Goals, Review; the exercise library opens in a drawer or dialog on demand ("Add exercises"). A sticky bar holds save status and Publish.
- Benefits: whole plan visible at once; edits are in place; simple; this is today's narrow-width fallback and needs no new design system parts.
- Limitations: adding many exercises means repeated drawer open and close; the library is out of sight while composing; long plans scroll a lot.
- Accessibility: simple document structure; drawer focus handling already exists.
- Business: fast edits; slower first build than a persistent library.
- Technical: very low; already built for under 1280 px.
- Error and recovery: same autosave and conflict handling as today.
- Evidence: Linear quick-create as a structured surface [Observed]; the current drawer fallback [Observed in code].

### C. Split-pane exercise library and plan editor (current model, refined)

- Interaction model: persistent library on the left (search, filters, preview), editable plan on the right with a compact dose row per exercise (sets × reps, hold, rest, days) that expands for instructions. A persistent status header says what the patient currently sees and what the draft changes ("Patient sees version 3. Draft: 1 added, 1 changed, 0 removed"). Build, Preview and Versions stay as views.
- Benefits: fastest composing and editing; library and result visible together; maps to WebPT's panel and Retool's regions; already built and API-complete.
- Limitations: needs 1280 px or more for the full model; two scroll regions; more to learn than a single page.
- Accessibility: skip link between panes exists; reorder by buttons with live announcements exists; the compact dose row must keep proper labels per field; below 1280 switches to B's drawer.
- Business: strongest on speed of creating and editing; preview before publish supports correctness.
- Technical: low; most of this exists. The status header's counts come from the same diff the preview already returns (`diffFromPrevious`).
- Error and recovery: autosave plus stale-draft conflict banner exist; add a clear "Discard draft and return to version 3" action only if the API supports discarding a draft (it does not today, so do not add the control).
- Evidence: WebPT, Retool [Observed]; current screenshots and code [Observed]; effect of the status header is [Assumption].

### D. Template-first workflow

- Interaction model: starting a plan opens a chooser: Blank, Copy the patient's last plan, or a saved Template (by body area or protocol). The chosen starting point fills the editor, which the therapist then adjusts. Save as template from any built plan.
- Benefits: biggest speed gain for common cases; reusability across patients; matches MedBridge and WebPT templates; the Heidi picker shows how to browse and pin.
- Limitations: pre-filled doses can be accepted without thought, shifting clinical judgement from deliberate to default; template ownership, sharing and versioning become new problems; **no template or copy endpoint exists**; clinic-level templates raise governance questions (who reviews them).
- Accessibility: chooser is a standard list or dialog.
- Business: highest reuse value; but the demo has few plans to reuse and no template data.
- Technical: high against the current API: new tables and endpoints for templates; "copy last plan" can be done client-side from `GET /care-plan` today because the builder already seeds from the current version.
- Error and recovery: applying a template over a non-empty draft needs a confirm that says what will be replaced; undo is not available server-side.
- Evidence: WebPT, MedBridge [Observed text]; Heidi picker [Observed]; the over-trust risk of defaults is [Judgement].

## 9. Mandatory gates

| Alternative | Accessibility | Privacy | Safety | Result |
|---|---|---|---|---|
| A. Wizard | Pass | Pass | Pass: forced review step | Eligible |
| B. Single page | Pass | Pass | Pass if status header and preview remain | Eligible |
| C. Split-pane | Pass: move buttons already satisfy 2.5.7; stacked fallback below 1280 | Pass: draft clinician-only | Pass if draft versus published is shown at all times and preview is the patient serializer | Eligible |
| D. Template-first | Pass | Pass | Conditional: every template-applied dose must be shown as "from template, not yet confirmed" until the therapist confirms it, and the preview and publish gate still apply | Eligible only with the condition; also blocked by API gaps for templates |

A drag-and-drop-only reorder (as in MedBridge's described builder) would fail WCAG 2.5.7 and is not proposed anywhere. Keep move buttons.

## 10. Weighted evaluation

Weights: default (task 25, safety/privacy/trust 20, usability/accessibility 20, business 15, operational efficiency 10, technical 5, design system 5). No change. Scores are [Judgement].

| Criterion (weight) | A Wizard | B Single page | C Split-pane | D Template-first |
|---|---|---|---|---|
| Task effectiveness (25) | 2: slow edits, no whole-plan view | 4: whole plan visible | 5: compose and edit with library in view | 4: fast to start, edit after |
| Safety, privacy, trust (20) | 4: forced review | 4 | 4: needs persistent draft/published marker | 3: default doses accepted unthinkingly |
| Usability, accessibility (20) | 3: back-and-forth | 4 | 4: two scroll regions, good fallbacks | 4 |
| Business value (15) | 3 | 4 | 4 | 5: reuse |
| Operational efficiency (10) | 2 | 3: drawer churn | 5 | 5 |
| Technical feasibility (5) | 4: but partial drafts clash with validator | 5: built | 5: built | 1: no template API |
| Design-system consistency (5) | 4 | 5 | 4 | 3 |
| **Weighted (out of 5)** | **2.95** | **4.00** | **4.40** | **3.85** |

## 11. Recommendation

Selected: **C, split-pane library and plan editor**, kept as the core model, with four refinements:
1. A persistent state header: "Patient sees version 3 (published Nov 3)" and "Draft: 1 added, 1 changed, 0 removed, saved 9:02 AM", always visible in the builder, and the same one-line draft indicator, with the change counts, on the record's Plan tab and in the record summary (J). The diff data already exists.
2. A starting-point choice limited to what the API supports today: Blank, or Start from the current version (already the behaviour). Do not show Template until an API exists.
3. A compact dose row per exercise with an expand for instructions, and a library preview of the full exercise instructions before Add.
4. Honest state names: *Draft* (clinician-only), *Published, version N* (patient sees), *Draft differs from version N* (the "updated" state), *Superseded* for older versions (read-only, derived). No *Archived* until the product decides what archiving a plan means and the API gains it.

Why it beats the runner-up B: B is the same model without the persistent library, which makes composing slower; C already degrades to B below 1280 px, so B is not lost.

Runner-up: **B, structured single page.**

Rejected: A (slow for the weekly edit job, clashes with autosave and the whole-plan validator); D as a first slice (blocked by the API and the over-trust risk), kept as a later addition with a "from template, not yet confirmed" mark per item.

Trade-off: needs width and a status header that adds visual weight; in return unpublished work cannot be mistaken for published work. Archiving is a product and API decision, flagged rather than designed.

## 12. Requirement alignment row

| Field | Entry |
|---|---|
| User segment | Physical therapist on the patient's care team |
| Job to be done | Create a safe plan quickly, edit it cheaply, and know exactly what the patient sees |
| Pain point | Draft versus published only explained in a header sentence and the publish dialog; blank start; heavy dose form |
| Business objective | Plans published correctly and quickly; edits are cheap |
| Functional requirement | REQ-PLN-01 library search and filter, dose, schedule, goals, instructions; REQ-PLN-02 move buttons; REQ-PLN-03 draft, publish, immutable versions; REQ-PLN-04 patient note from version 2 and diff; REQ-PLN-05 patient preview |
| Success metric | Time to first publish; time to publish an edit; draft conflicts; first-attempt note success; draft age at publish |
| Design hypothesis | [Assumption] A persistent draft-versus-published header lowers the chance of believing a change was sent when it was not |
| Selected pattern | Split-pane library and editor with persistent state header |
| Technical dependency | `PUT /care-plan/draft`, `GET /care-plan/draft/preview`, `GET /care-plan/versions`, `POST /care-plan/publish`, exercise library; none new for the first slice; templates and archive need new API |
| Validation method | Timed build-a-plan and make-an-edit tasks with PTs (not run); keyboard-only reorder and publish; screen reader pass over save status; conflict test with two sessions |

## 13. States to design

| State | Microcopy (draft) | Recovery |
|---|---|---|
| Default (draft exists) | "Patient sees version 3. Draft: 1 changed. Saved 9:02 AM." | Review and publish |
| Draft, no published plan | "The patient has no published plan yet. This draft is visible only to clinicians." | Publish when ready |
| Published, no draft | "Version 3 is what the patient sees. No unpublished changes." | Start editing |
| Updated (draft differs) | "Draft differs from version 3: 1 added, 1 changed." | Preview, Publish |
| Superseded version | "Version 2. Replaced by version 3 on Nov 3. Read only." | Open current |
| Archived | Not designed: not in the data model | Product and API decision needed |
| Hover / focus / active / selected | Library row focus ring; plan item focus after move; selected item expanded | None |
| Disabled | Today the Publish button is disabled with a visible reason, "Add at least one exercise to publish." Checkpoint C2 ruling 7 asked for an enabled button that moves focus to the message instead; reconcile in the design | Focus moves to the reason |
| Loading | "Loading care plan" with library and editor skeletons separately | None |
| Empty | "No exercises yet. Search the library and add exercises." | Add |
| Partial data | Library fails: "The exercise library could not be loaded." editor still usable | "Try again" |
| Validation error | Field-level text, for example "Give repetitions, a duration or a hold time." with a summary above | Focus to first error |
| Server error | "Not saved. Your edits stay on screen." | "Try again" |
| Network loss | "You are offline. Edits are kept here and saved when you reconnect." [Assumption: needs local hold] | Auto-retry |
| Permission denied | "Only members of this patient's care team can edit the plan. Nothing was saved." (existing text) | Link to record |
| Stale information | "This draft was saved somewhere else." | "Load the saved draft" |
| Success | "Version 4 published. Dana sees it on their next visit to Today." (from existing copy shape) | Return to record |
| Cancellation | Leaving the publish dialog keeps the draft untouched | Focus returns to the Publish button |
| Interrupted workflow | Closing the tab with pending autosave triggers the browser warning; reopen resumes the draft | Resume |
| Unsaved changes | "Unsaved changes. Saving automatically." | Wait or retry |

## 14. Responsive behaviour

| Width | Behaviour |
|---|---|
| 1920 | Library, editor and an optional live patient preview column; no extra widgets |
| 1440 | Library left, editor right; Build, Preview, Versions as views |
| 1024 | Single column editor; library in a drawer (current behaviour below 1280); state header stays sticky |
| 768 | Same as 1024 with stacked dose fields; Publish stays in the sticky bar |
| 390 and 375 | Plan review, preview and light edits only: dose and order changes allowed, but starting a plan from scratch is discouraged on a phone [Assumption]; library as full-screen sheet |

Always stays: patient name, state header (published version versus draft), save status. Moves to panels: library, version history, preview. Changes model: below 1280 from split-pane to single page with library drawer.
