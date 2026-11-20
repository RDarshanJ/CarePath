# CD-239: Single source for status labels

Status: Proposed, provisional until advisor sign-off. Date: 2026-11-20. Research file: `docs/design/component-research/12-status-vocabulary.md`. Scores are heuristic judgements, not measurements; no participant research was run.

| Field | Entry |
|---|---|
| ID | CD-239 |
| Screen or workflow | Web app |
| User segment | Developers |
| User task | Keep wording identical |
| Business objective | Consistency |
| Candidate alternatives | Per-app maps; shared typed maps; server strings |
| Production and standards references | component-research/12-status-vocabulary.md section 4 |
| Research evidence | A 2.85, B 4.40, C 2.95 (ineligible). Heuristic scores, not measurements; see the research file for the table. |
| Accessibility considerations | n/a |
| Clinical and privacy constraints | n/a |
| Interaction complexity | Low to medium |
| Technical feasibility | High |
| Selected | B: exhaustive maps in `@carepath/shared` |
| Rejected | A, C |
| Rationale | Prevents mismatches by construction |
| Validation method | Exhaustiveness tests |
