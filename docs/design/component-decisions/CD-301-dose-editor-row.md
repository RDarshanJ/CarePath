# CD-301: Dose editor row

- **ID:** CD-301
- **Status:** proposed, pending advisor sign-off. Research date 2026-11-20.
- **Research:** `docs/design/component-research/03-treatment-planning.md`, section 2
- **Screen or workflow:** Plan builder Build tab (`item-editor.tsx`)
- **User segment:** Clinician (care team)
- **User task:** Set or change sets, reps, hold, duration, rest, days and times per exercise
- **Business objective:** Cheap weekly edits and correct first plans
- **Alternatives considered:** A all five fields always visible; B dose summary line with disclosure to labelled fields; C popover editor; D stepper-only
- **Production references and sources:** Zillow availability rows https://mobbin.com/screens/ea123c30-5911-46d9-ba35-ed36ef56d09f; Square item library https://mobbin.com/screens/ab5688a3-5fa4-4539-8f17-d131559b277a; WebPT HEP help; Carbon expandable rows
- **Research evidence and its limits:** Observed Mobbin screens are weak analogues (no rehab dose editor retrievable); scores A 3.25, B 3.80, C 2.70, D 2.55 heuristic. No participant data exists; scores are heuristic.
- **Accessibility considerations:** Typed numeric entry with labels, requirement words, hints and errors through `ui Field`; no slider; D fails the exact-value gate; disclosure keeps focus on its button
- **Clinical and privacy constraints:** Doses are clinical content authored by the clinician; the patient sees the same dose string; no AI-suggested doses
- **Interaction complexity:** Medium: new summary line and disclosure; fold `NumberField` into `Field`
- **Technical feasibility:** High: no API change
- **Selected:** B: summary line plus disclosure of labelled typed fields, shared dose formatter
- **Rejected:** A (read five fields to change one); C (focus-heavy, unused primitive); D (fails exact-value gate)
- **Rationale:** The scan job (read the plan) and the edit job (change one number) differ; the summary serves the first and the disclosure the second
- **Validation method:** Timed edit-one-dose task (not run); keyboard-only edit; validation error focus order; summary string equals patient string
