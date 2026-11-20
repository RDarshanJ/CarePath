# CD-429: Disabled actions and reasons

| Field | Entry |
|---|---|
| ID | CD-429 |
| Status | Proposed; heuristic evaluation, no user testing; no colours chosen |
| Research file | `docs/design/component-research/08-actions.md` section 8.10 |
| Date | 2026-11-20 |
| Screen or workflow | All screens |
| User segment | All |
| User task | Understand why an action is unavailable |
| Business objective | Usage matrix F gaps |

## Alternatives considered
- Conventional: aria-disabled with visible linked reason

## References
- NHS Buttons (disabled buttons poor)
- Atlassian (disabled leave the tab order)

## Research evidence
Existing practice mostly follows it. Heuristic scoring only; no participants, no measured results.

## Accessibility considerations
Focusable; described-by.

## Clinical and privacy constraints
None.

## Interaction complexity
Low.

## Technical feasibility
Feasible.

## Selected
aria-disabled plus visible reason; prefer enabled plus error for input validity

## Rejected
Silent disabled controls

## Decision rationale
Reasons reachable by keyboard and screen reader.

## Validation method
Described-by tests.
