# CD-424: Sticky action bars and persistent visibility

| Field | Entry |
|---|---|
| ID | CD-424 |
| Status | Proposed; heuristic evaluation, no user testing; no colours chosen |
| Research file | `docs/design/component-research/08-actions.md` section 8.5 |
| Date | 2026-11-20 |
| Screen or workflow | Session, forms, builder, AI review, note editor |
| User segment | All |
| User task | Keep the needed action reachable while scrolling |
| Business objective | Reach and speed |

## Alternatives considered
- A. Selective sticky bars
- B. All primary actions sticky
- C. None
- D. FAB

## References
- CarePath C research (pinned bar)
- WCAG 2.2 2.4.11 and 1.4.10

## Research evidence
Weighted: A 3.95, B 3.15, C 3.00, D 2.15. Heuristic scoring only; no participants, no measured results.

## Accessibility considerations
Scroll padding equals bar height; non-sticky fallback at zoom.

## Clinical and privacy constraints
No bar covers focus.

## Interaction complexity
Medium.

## Technical feasibility
Feasible.

## Selected
A

## Rejected
B, C, D

## Decision rationale
Sticky only where task requires it.

## Validation method
Focus-not-covered tests at 320 px and 200 percent zoom.
