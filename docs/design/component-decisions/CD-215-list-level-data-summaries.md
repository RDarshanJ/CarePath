# CD-215: Data summaries inside lists

Status: Proposed, provisional until advisor sign-off. Date: 2026-11-20. Research file: `docs/design/component-research/05-clinical-data-presentation.md`. Scores are heuristic judgements, not measurements; no participant research was run.

| Field | Entry |
|---|---|
| ID | CD-215 |
| Screen or workflow | Directory, queue, overview |
| User segment | Therapist |
| User task | Scan for recent patient-reported value |
| Business objective | Efficient triage |
| Candidate alternatives | Sparkline; text summary; seven-dot strip; none |
| Production and standards references | component-research/05-clinical-data-presentation.md section 7 |
| Research evidence | A ineligible (2.65), B 4.55, C 3.15, D 3.40. Heuristic scores, not measurements; see the research file for the table. |
| Accessibility considerations | Plain text, no colour |
| Clinical and privacy constraints | No trend graphic without an axis |
| Interaction complexity | Low |
| Technical feasibility | Needs last check-in and count in list read: [check] |
| Selected | B: "Pain 6 of 10 (patient-reported), Nov 18. 5 check-ins in 14 days." |
| Rejected | Sparklines in lists |
| Rationale | Sparklines cannot carry units, dates or labels |
| Validation method | List contract check; text snapshot |
