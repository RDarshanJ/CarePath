# CD-212: Assigned versus completed sessions per week

Status: Proposed, provisional until advisor sign-off. Date: 2026-11-20. Research file: `docs/design/component-research/05-clinical-data-presentation.md`. Scores are heuristic judgements, not measurements; no participant research was run.

| Field | Entry |
|---|---|
| ID | CD-212 |
| Screen or workflow | Patient progress, clinician Activity |
| User segment | Patient, therapist |
| User task | Compare effort against schedule per week |
| Business objective | Engagement is not recovery |
| Candidate alternatives | Grouped bars; progress bar per week; stacked bars; table only; donut |
| Production and standards references | component-research/05-clinical-data-presentation.md section 4 |
| Research evidence | A 4.05, B 3.35, C 3.45, D 4.00, E ineligible. Heuristic scores, not measurements; see the research file for the table. |
| Accessibility considerations | Values printed, outline versus solid, partial week dashed with text |
| Clinical and privacy constraints | No percentage, streak or target line |
| Interaction complexity | Low |
| Technical feasibility | High |
| Selected | A: grouped bars with partial-week treatment; stopped count as text |
| Rejected | B, C, E |
| Rationale | Counts per period are bars; no target to fill |
| Validation method | Chart-table equality test; axe |
