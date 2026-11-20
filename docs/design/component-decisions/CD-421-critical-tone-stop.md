# CD-421: Critical-tone action and the Stop control

| Field | Entry |
|---|---|
| ID | CD-421 |
| Status | Proposed; heuristic evaluation, no user testing; no colours chosen |
| Research file | `docs/design/component-research/08-actions.md` section 8.2 |
| Date | 2026-11-20 |
| Screen or workflow | Guided session player |
| User segment | Patient |
| User task | End a session at once when it hurts |
| Business objective | Safety; Stop never hidden |

## Alternatives considered
- A. Status quo ad-hoc classes
- B. Solid danger button
- C. Secondary with tone="critical"
- D. Overflow menu

## References
- NHS Buttons (warning button only as final step)
- CarePath C research: Stop never hidden

## Research evidence
D fails gate. Weighted: A 3.45, B 3.60, C 3.85, D 1.70. Heuristic scoring only; no participants, no measured results.

## Accessibility considerations
Words, icon and colour; stable position; contrast token check.

## Clinical and privacy constraints
Confirm sheet stays; pain rating optional after CR-C1.

## Interaction complexity
Low.

## Technical feasibility
Feasible: one prop.

## Selected
C

## Rejected
A, B, D

## Decision rationale
Documents an existing ad-hoc pattern and keeps danger for confirmation.

## Validation method
Contrast token test; stable position visual regression.
