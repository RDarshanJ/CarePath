# CD-400: AI evidence mechanism

| Field | Entry |
|---|---|
| ID | CD-400 |
| Status | Proposed; heuristic evaluation, no user testing; no colours chosen |
| Research file | `docs/design/component-research/06-ai-verification.md` section 6.1 |
| Date | 2026-11-20 |
| Screen or workflow | AI summaries section of the patient record; note-from-transcript draft |
| User segment | Caseload therapist (T1) |
| User task | Check each generated statement against its source before deciding |
| Business objective | Faster review without lower scrutiny; share of statements opened before approval |

## Alternatives considered
- A. Numbered evidence refs plus a drawer
- B. Docked side-by-side source pane
- C. Expandable references under each statement
- D. Footnote list after the text

## References
- `docs/design/feature-research/M-ai-summaries.md` section 6 (Abridge, DAX Copilot for Epic, SPRY, Ambience, NYU Langone, Heidi; retrieved 2026-11-20)
- Google PAIR guidebook, explainability and trust (https://pair.withgoogle.com/chapter/explainability-trust/, read 2026-11-20)
- Mobbin: Heidi, Microsoft Copilot, Fireflies, NotebookLM (URLs in 06-ai-verification.md)

## Research evidence
Abridge highlights the matching transcript passage when text is selected; NYU links every fact to its source note; footnote lists (Copilot, Fireflies) leave the reader to hunt. No page read shows a visible state for text without a source. Weighted: A 4.20, B 3.95, C 3.30, D 2.80 (fails safety gate). Heuristic scoring only; no participants, no measured results.

## Accessibility considerations
Drawer returns focus to the statement; bottom sheet below 768 px; docked pane must stack at 320 px; supporting field marked in words not colour; focus not hidden (2.4.11).

## Clinical and privacy constraints
Wrong-patient or out-of-scope refs are unsupported (AC-F3); a source that failed to load is never counted as checked; consent required (AC-F5).

## Interaction complexity
Medium: new `EvidencePanel`; per-source read-only renderers through `apiPath`.

## Technical feasibility
Feasible: `EvidenceRef` and `DrawerContent` exist; AI endpoints and contracts do not yet exist.

## Selected
A for structured-record progress reviews; B only for the transcript note draft at 1280 px and above.

## Rejected
C (spreads statements apart, no gain over A); D (fails the source-one-gesture gate).

## Decision rationale
Sources for a progress review are many small structured records, so a drawer shows exactly one; transcripts are long and justify a docked pane.

## Validation method
Automated: axe on drawer, keyboard-only run, failed-source unit test, 200 percent zoom at 390 px. Human: moderated task with clinicians including a seeded unsupported statement (planned, not run). Prototype: `design-alternatives/prototypes/ai-evidence-review.md`.
