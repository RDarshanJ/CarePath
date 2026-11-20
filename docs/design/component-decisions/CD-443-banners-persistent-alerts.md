# CD-443: Banners and persistent alerts

| Field | Entry |
|---|---|
| ID | CD-443 |
| Status | Proposed; heuristic evaluation, no user testing; no colours chosen |
| Research file | `docs/design/component-research/10-feedback-error-recovery.md` section 5 |
| Date | 2026-11-20 |
| Screen or workflow | All |
| User segment | All |
| User task | See page-level problems and stay informed |
| Business objective | Consistent persistent messages |

## Alternatives considered
- Conventional: reuse Banner with rules

## References
- GOV.UK notification banner
- Carbon notification pattern (https://carbondesignsystem.com/patterns/notification-pattern/, read 2026-11-20)

## Research evidence
Existing design-system rules extended. Heuristic scoring only; no participants, no measured results.

## Accessibility considerations
Roles per tone; one per scope.

## Clinical and privacy constraints
Errors not dismissible.

## Interaction complexity
Low.

## Technical feasibility
Feasible.

## Selected
Banner rules

## Rejected
Toasts for page-level problems

## Decision rationale
Established pattern.

## Validation method
One-per-scope test.
