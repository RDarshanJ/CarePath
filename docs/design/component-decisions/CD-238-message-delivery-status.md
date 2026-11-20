# CD-238: Message delivery status

Status: Proposed, provisional until advisor sign-off. Date: 2026-11-20. Research file: `docs/design/component-research/12-status-vocabulary.md`. Scores are heuristic judgements, not measurements; no participant research was run.

| Field | Entry |
|---|---|
| ID | CD-238 |
| Screen or workflow | Patient and clinician messages |
| User segment | Patient, therapist |
| User task | Know whether a message was sent and recover |
| Business objective | Reliability |
| Candidate alternatives | Chip in list and icon plus text in thread; one component; icon only |
| Production and standards references | component-research/12-status-vocabulary.md section 3.8 |
| Research evidence | A 3.30, B 4.70, C ineligible. Heuristic scores, not measurements; see the research file for the table. |
| Accessibility considerations | Icon plus text; live region on the row |
| Clinical and privacy constraints | Failed messages visible to sender only |
| Interaction complexity | Low |
| Technical feasibility | High |
| Selected | B: one component, "Sending", "Sent", "Not sent" with reason and Retry; list wording "{n} of your messages were not sent" |
| Rejected | A, C |
| Rationale | Same data, same markup |
| Validation method | Parity snapshot; retry flow test |
