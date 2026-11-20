# CD-233: Appointment status vocabulary

Status: Proposed, provisional until advisor sign-off. Date: 2026-11-20. Research file: `docs/design/component-research/12-status-vocabulary.md`. Scores are heuristic judgements, not measurements; no participant research was run.

| Field | Entry |
|---|---|
| ID | CD-233 |
| Screen or workflow | Appointments, schedule, record, patient appointments |
| User segment | Therapist, patient |
| User task | Know the state of a visit |
| Business objective | Operations |
| Candidate alternatives | Tag every row; exceptions only plus plain text; lifecycle stepper |
| Production and standards references | component-research/12-status-vocabulary.md section 3.3 |
| Research evidence | A 3.45, B 4.50, C 3.05. Heuristic scores, not measurements; see the research file for the table. |
| Accessibility considerations | Words always visible in mixed lists |
| Clinical and privacy constraints | Neutral wording for did not attend |
| Interaction complexity | Low |
| Technical feasibility | High |
| Selected | B: expected plain text, exceptions Tag; no-show "Did not attend" / "You did not attend"; video type "Video follow-up" |
| Rejected | Tag on every row; stepper |
| Rationale | Fixes three forms and four wordings |
| Validation method | Enum exhaustiveness; wording parity test |
