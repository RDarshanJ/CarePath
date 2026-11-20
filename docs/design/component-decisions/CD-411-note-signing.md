# CD-411: Signing a note

| Field | Entry |
|---|---|
| ID | CD-411 |
| Status | Proposed; heuristic evaluation, no user testing; no colours chosen |
| Research file | `docs/design/component-research/07-clinical-documentation.md` section 7.2 |
| Date | 2026-11-20 |
| Screen or workflow | Note editor |
| User segment | Caseload therapist (T1) |
| User task | Take responsibility for a final note |
| Business objective | REQ-NOT-02; AC-F8 |

## Alternatives considered
- A. One-click Sign
- B. Sign with a summary dialog
- C. Typed attestation
- D. Co-sign

## References
- NN/g confirmation dialogs (https://www.nngroup.com/articles/confirmation-dialog/, read 2026-11-20)
- SPRY: sign only then final (via M)

## Research evidence
A fails safety (irreversible, no consequence statement). Weighted: B 3.85, C 3.15, D 2.55; A 3.40 gate fail. Heuristic scoring only; no participants, no measured results.

## Accessibility considerations
Dialog with labelled title and description; initial focus on "Keep editing"; errors inside dialog.

## Clinical and privacy constraints
Only the author on the care team signs; AI-derived content stated in dialog; signed content frozen.

## Interaction complexity
Medium.

## Technical feasibility
Feasible: status and constraints exist.

## Selected
B, with facts that change (sections with text, AI-derived content)

## Rejected
A, C, D

## Decision rationale
A consequence statement with real facts avoids reflex confirmation.

## Validation method
AC-F8; author-only API test; keyboard-only; error keeps draft editable.
