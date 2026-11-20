# CD-218: Chart text alternatives

Status: Proposed, provisional until advisor sign-off. Date: 2026-11-20. Research file: `docs/design/component-research/05-clinical-data-presentation.md`. Scores are heuristic judgements, not measurements; no participant research was run.

| Field | Entry |
|---|---|
| ID | CD-218 |
| Screen or workflow | Every chart |
| User segment | Patient, therapist, screen-reader users |
| User task | Get the same information without seeing the chart |
| Business objective | Accessibility |
| Candidate alternatives | role=img label only; figure with caption and table; table only; aria-describedby |
| Production and standards references | component-research/05-clinical-data-presentation.md section 10; W3C WAI complex images https://www.w3.org/WAI/tutorials/images/complex/, accessed 2026-11-20 |
| Research evidence | A 3.65, B 4.70, C 3.90, D 3.20 (ineligible alone). Heuristic scores, not measurements; see the research file for the table. |
| Accessibility considerations | Two-part alternative, real table, 3:1 marks |
| Clinical and privacy constraints | Neutral caption, no evaluative words |
| Interaction complexity | Low |
| Technical feasibility | High |
| Selected | B: figure, short label, caption sentence, equal table |
| Rejected | A alone, C alone, D alone |
| Rationale | W3C two-part alternative; tables survive structure |
| Validation method | Screen-reader pass; banned-words test |
