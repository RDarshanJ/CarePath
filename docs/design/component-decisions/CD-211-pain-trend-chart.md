# CD-211: Patient-reported pain over time

Status: Proposed, provisional until advisor sign-off. Date: 2026-11-20. Research file: `docs/design/component-research/05-clinical-data-presentation.md`. Scores are heuristic judgements, not measurements; no participant research was run.

| Field | Entry |
|---|---|
| ID | CD-211 |
| Screen or workflow | Patient progress, clinician record |
| User segment | Patient, therapist |
| User task | See what was reported and when |
| Business objective | Informed visits |
| Candidate alternatives | Points and line; points only; heatmap; sparkline; table only |
| Production and standards references | component-research/05-clinical-data-presentation.md section 3; Insight Timer (joins across gaps), Flo, Cal AI, WHOOP Mobbin screens; W3C WAI complex images https://www.w3.org/WAI/tutorials/images/complex/, accessed 2026-11-20 |
| Research evidence | A 4.30, B 4.10, C 2.70 (conditional), D 2.55 (ineligible), E 3.90. Heuristic scores, not measurements; see the research file for the table. |
| Accessibility considerations | Fixed 0 to 10 axis, direct labels, text caption, equal table, marks at 3:1 |
| Clinical and privacy constraints | No smoothing, bands, targets or verdicts; gaps shown |
| Interaction complexity | Low: `PainLine` exists |
| Technical feasibility | High |
| Selected | A: time-scaled points, line only across gaps of 7 days or less, break plus text otherwise; B is the fallback |
| Rejected | C, D, E alone |
| Rationale | Honest about continuity; closest to existing component |
| Validation method | Gap-rule unit test; screen-reader pass; comprehension test (not run) |
