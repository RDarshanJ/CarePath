# CD-426: Icon-only buttons

| Field | Entry |
|---|---|
| ID | CD-426 |
| Status | Proposed; heuristic evaluation, no user testing; no colours chosen |
| Research file | `docs/design/component-research/08-actions.md` section 8.7 |
| Date | 2026-11-20 |
| Screen or workflow | Builder, dialogs, evidence refs |
| User segment | Therapist |
| User task | Use compact controls without losing meaning |
| Business objective | Discoverable controls |

## Alternatives considered
- A. Words first; icon-only only for universal controls
- B. Icon-only dense
- C. Overflow

## References
- Usage matrix D

## Research evidence
Weighted: A 4.50, B 2.95, C 2.55. Heuristic scoring only; no participants, no measured results.

## Accessibility considerations
Accessible name with object; tooltip on hover and focus; 24 px and 48 px targets; spacing.

## Clinical and privacy constraints
No patient-app icon-only buttons.

## Interaction complexity
Low.

## Technical feasibility
Feasible.

## Selected
A

## Rejected
B, C

## Decision rationale
Names with objects are accessible and unambiguous.

## Validation method
Accessible-name tests.
