# CD-430: Review queue detail action hierarchy

| Field | Entry |
|---|---|
| ID | CD-430 |
| Status | Proposed; heuristic evaluation, no user testing; no colours chosen |
| Research file | `docs/design/component-research/08-actions.md` section 8.11 |
| Date | 2026-11-20 |
| Screen or workflow | Review queue detail pane |
| User segment | Therapist |
| User task | Act on a task without ambiguity |
| Business objective | One primary by state |

## Alternatives considered
- A. State-driven single primary
- B. All equal
- C. Wizard

## References
- L research A refined

## Research evidence
Weighted: A 4.45, B 2.90, C 2.90. Heuristic scoring only; no participants, no measured results.

## Accessibility considerations
Shared reason line when disabled; focus moves after resolve.

## Clinical and privacy constraints
Care team only.

## Interaction complexity
Low.

## Technical feasibility
Feasible.

## Selected
A

## Rejected
B, C

## Decision rationale
Primary follows the next sensible step.

## Validation method
Unit tests over states.
