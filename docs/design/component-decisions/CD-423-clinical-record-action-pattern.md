# CD-423: Actions that change clinical records

| Field | Entry |
|---|---|
| ID | CD-423 |
| Status | Proposed; heuristic evaluation, no user testing; no colours chosen |
| Research file | `docs/design/component-research/08-actions.md` section 8.4 |
| Date | 2026-11-20 |
| Screen or workflow | Review queue, overview, record |
| User segment | Therapist |
| User task | Record a state on a chart quickly and know what was recorded |
| Business objective | Fix toast-only confirmation |

## Alternatives considered
- A. Consequence line plus persistent result
- B. Dialog each
- C. Toast after

## References
- L research A; H research ("Mark reviewed has no undo")
- Usage matrix E

## Research evidence
C fails gate. Weighted: A 4.15, B 3.40, C 2.65. Heuristic scoring only; no participants, no measured results.

## Accessibility considerations
Text before and after; polite status.

## Clinical and privacy constraints
Record-history row for each action.

## Interaction complexity
Low.

## Technical feasibility
Feasible.

## Selected
A

## Rejected
B, C

## Decision rationale
Words before and a persistent record after.

## Validation method
Text present; history row written.
