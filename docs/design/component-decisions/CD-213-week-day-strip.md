# CD-213: This-week day strip

Status: Proposed, provisional until advisor sign-off. Date: 2026-11-20. Research file: `docs/design/component-research/05-clinical-data-presentation.md`. Scores are heuristic judgements, not measurements; no participant research was run.

| Field | Entry |
|---|---|
| ID | CD-213 |
| Screen or workflow | Patient progress, Today |
| User segment | Patient |
| User task | See which days were done, planned, rest, stopped |
| Business objective | Consistency without judgement |
| Candidate alternatives | Day strip list; month heatmap; none |
| Production and standards references | component-research/05-clinical-data-presentation.md section 5; Strava, Fitbit, Alan from E (prior) |
| Research evidence | A 4.25, B 3.20, C 3.40. Heuristic scores, not measurements; see the research file for the table. |
| Accessibility considerations | Ordered list with words and icons; no grid |
| Clinical and privacy constraints | Neutral words (Not done); no unmarked missed-day grid |
| Interaction complexity | Low |
| Technical feasibility | High: sessions list with weeks=1 |
| Selected | A: ordered list of seven days |
| Rejected | B (judgemental, costly grid) |
| Rationale | Familiar, accessible, no scale |
| Validation method | Screen-reader pass; test of every status word |
