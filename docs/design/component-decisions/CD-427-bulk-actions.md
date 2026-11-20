# CD-427: Bulk actions

| Field | Entry |
|---|---|
| ID | CD-427 |
| Status | Proposed; heuristic evaluation, no user testing; no colours chosen |
| Research file | `docs/design/component-research/08-actions.md` section 8.8 |
| Date | 2026-11-20 |
| Screen or workflow | Review queue (future) |
| User segment | Therapist |
| User task | Handle many tasks efficiently when volume requires |
| Business objective | Throughput without unsafe bulk clinical judgement |

## Alternatives considered
- A. None now; assign-only spec
- B. Bulk resolve, dismiss, mark reviewed
- C. Per-row only

## References
- Carbon data table batch actions (https://carbondesignsystem.com/components/data-table/usage/, read 2026-11-20)

## Research evidence
B fails safety. Weighted: A 3.95, C 3.45, B 2.95. Heuristic scoring only; no participants, no measured results.

## Accessibility considerations
Native checkboxes, indeterminate header, status count.

## Clinical and privacy constraints
Resolve and dismiss need per-task notes.

## Interaction complexity
Low (not built).

## Technical feasibility
Feasible later.

## Selected
A

## Rejected
B (gate fail); C

## Decision rationale
No evidence of volume; spec ready.

## Validation method
Revisit with real queue volume.
