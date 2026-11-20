# CD-445: Undo for client-held changes

| Field | Entry |
|---|---|
| ID | CD-445 |
| Status | Proposed; heuristic evaluation, no user testing; no colours chosen |
| Research file | `docs/design/component-research/10-feedback-error-recovery.md` section 7 |
| Date | 2026-11-20 |
| Screen or workflow | Plan builder |
| User segment | Therapist |
| User task | Recover from slips cheaply |
| Business objective | Reduce confirmations |

## Alternatives considered
- A. Inline undo, no timer
- B. Timed toast undo
- C. Server restore window
- D. None

## References
- NN/g confirmation dialogs (https://www.nngroup.com/articles/confirmation-dialog/, read 2026-11-20)
- WCAG 2.2.1 and 2.2.2
- Mobbin Base44 recently deleted

## Research evidence
B fails timing. Weighted: A 3.85, C 3.80 (not feasible), D 3.10, B 2.85. Heuristic scoring only; no participants, no measured results.

## Accessibility considerations
Undo button receives focus; status text.

## Clinical and privacy constraints
Not for server-written actions.

## Interaction complexity
Low.

## Technical feasibility
Feasible.

## Selected
A

## Rejected
B, C, D

## Decision rationale
Accessible and safe.

## Validation method
Keyboard path test.
