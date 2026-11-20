# Prototype spec: treatment plan editing, three approaches

Status: specification only; not built. Research: `docs/design/component-research/03-treatment-planning.md` and `docs/design/feature-research/K-care-plan-builder.md`; decisions CD-300 to CD-306. Brief section 20: "three different treatment-plan editing approaches". Colours not chosen; same tokens in all three.

## Approaches compared

K evaluated four. Three are prototyped. Template-first is excluded from the comparison because no template or copy endpoint exists (K section 4); it stays a later addition with a "from template, not yet confirmed" mark per item.

| | Approach 1: sequential wizard | Approach 2: structured single page | Approach 3: split-pane library and editor (selected in K) |
|---|---|---|---|
| Structure | Steps: Details, Choose exercises, Set doses, Schedule, Goals, Review and publish; Next and Back | One scrolling page: Details, Exercises, Goals, Review; library opens in a drawer on Add exercises | Library left (search, filters, preview), editor right; Build, Preview and Versions views; below 1280 px it becomes Approach 2 |
| Dose editing | Dedicated step, one exercise at a time | `DoseEditorRow` disclosure in place | `DoseEditorRow` disclosure in place |
| Draft versus published | State line on every step | `PlanStateLine` sticky | `PlanStateLine` sticky |
| Review | Final step with `PlanDiff` and patient preview | Review section and publish dialog | Preview view and publish dialog |
| Reorder | Move buttons on the Choose step | Move buttons | Move buttons |

## What is held identical

**Data.** One synthetic patient and plan fixture served by mocks of the care-plan endpoints: a library of 40 invented exercises (fictional, not medically reviewed) across five body areas and five categories, with suggested defaults and some without images; a published version 3 with six exercises; a draft on top with one exercise added, one dose changed and one removed; version history of three entries with change notes; a second fixture with no plan at all (first plan); a third with a stale-draft 409. Long exercise names and long instructions (near 1000 characters) included.

**Components held constant.** `ExerciseSummary` (CD-300), `DoseEditorRow` (CD-301), move buttons (CD-302), `VersionList` (CD-303), `PlanDiff` (CD-304), `PlanStateLine` (CD-305), autosave and the leave guard (CD-306). Only the arrangement and sequence differ; the wizard needs partial-draft handling, which is recorded as a cost because the API requires a valid complete draft.

**Environment.** Clinician theme; widths 1920, 1440, 1280, 1024, 768, 390; keyboard-only; 200 percent zoom.

**Tasks.**
1. Build a first plan of five exercises with doses and a weekly schedule, then publish with no change note (version 1).
2. Change one repetition count on one exercise and publish with a note (version 2 or later).
3. Reorder the third exercise to first using the keyboard only.
4. Find out exactly what a draft changes compared with what the patient sees, before publishing.
5. Recover from a stale draft (409) and from a failed save with an in-app navigation attempt.

## Evaluation plan (not run)

No participant results exist and none are claimed. Planned: heuristic scoring with the research weights; scripted keyboard-only runs of tasks 1 to 3 counting key presses and focus losses; axe at each width; screen reader pass over save status, reorder announcements and the guard dialog; timed tasks 1, 2 and 4 with PTs once participants exist, recording time to first publish, time to publish an edit, errors at publish validation, and whether the participant correctly states what the patient currently sees (the safety measure). Targets not set.

Decision rule before results: keep Approach 3 unless Approach 2 matches it on tasks 1 and 2 time and is preferred for task 4 comprehension. Record the outcome in CD-300 to CD-306 and in feature research K.

## Gates specific to the prototypes

No drag-only reordering. No control that needs an endpoint that does not exist (restore, discard draft, archive, template). Preview is the patient serializer output. The wizard may not hide the draft-versus-published state on any step.
