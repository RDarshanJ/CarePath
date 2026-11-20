# CD-402: Inline editing of generated statements

| Field | Entry |
|---|---|
| ID | CD-402 |
| Status | Proposed; heuristic evaluation, no user testing; no colours chosen |
| Research file | `docs/design/component-research/06-ai-verification.md` section 6.3 |
| Date | 2026-11-20 |
| Screen or workflow | AI summaries review |
| User segment | Caseload therapist (T1) |
| User task | Correct a sentence without retyping; keep the original recoverable |
| Business objective | Less editing effort; AIReview stores edited output and keeps original |

## Alternatives considered
- A. Edit in place per statement, original kept
- B. Plain-language rewrite instruction
- C. One rich-text editor over the draft
- D. Accept or reject only

## References
- `docs/design/feature-research/M-ai-summaries.md` section 6 (Abridge, DAX Copilot for Epic, SPRY, Ambience, NYU Langone, Heidi; retrieved 2026-11-20)
- Carbon for AI, revert to AI original after edit (https://carbondesignsystem.com/guidelines/carbon-for-ai/, read 2026-11-20)

## Research evidence
Abridge and SPRY accept plain-language correction; DAX drops manual edits on regeneration. Weighted: A 3.95, B 3.55, C 2.85 (fails: refs and status lost), D 3.15. Heuristic scoring only; no participants, no measured results.

## Accessibility considerations
Textarea with persistent label; Esc cancels only unchanged text; status announced politely; error keeps wording.

## Clinical and privacy constraints
Edits never touch the generation row; edited statement is clinician text and its supported label no longer applies.

## Interaction complexity
Medium: per-statement state and diff storage.

## Technical feasibility
Feasible: edited output stored in AIReview.

## Selected
A: edit in place; B deferred and must create a new generation if added

## Rejected
C (loses statement boundaries and refs); D (no way to fix)

## Decision rationale
Keeps provenance intact and makes edits visible and reversible.

## Validation method
Edit-never-alters-generation test; axe; keyboard-only edit and save.
