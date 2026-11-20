# CD-220: One way to print a clinical value

Status: Proposed, provisional until advisor sign-off. Date: 2026-11-20. Research file: `docs/design/component-research/05-clinical-data-presentation.md`. Scores are heuristic judgements, not measurements; no participant research was run.

| Field | Entry |
|---|---|
| ID | CD-220 |
| Screen or workflow | Everywhere a pain value appears |
| User segment | Patient, therapist |
| User task | Read a value with its scale and source |
| Business objective | Consistency |
| Candidate alternatives | Leave; formatter; component |
| Production and standards references | component-research/05-clinical-data-presentation.md section 12 |
| Research evidence | A 2.85, B 4.05, C 4.65. Heuristic scores, not measurements; see the research file for the table. |
| Accessibility considerations | Text; tabular numerals; no tone |
| Clinical and privacy constraints | No colour or icon by value |
| Interaction complexity | Low |
| Technical feasibility | High |
| Selected | C: `ObservationValue`; "Pain 7 of 10 (patient-reported), Nov 19" |
| Rejected | A, B |
| Rationale | Three renderings today |
| Validation method | Snapshot of each context; banned-words test |
