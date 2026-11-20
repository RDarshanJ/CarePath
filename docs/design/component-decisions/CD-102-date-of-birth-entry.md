# CD-102: Date of birth entry

Status: proposed, provisional until advisor sign-off. Accessed 2026-11-20. Research: `docs/design/component-research/01-clinical-inputs.md`. Scores are heuristic, not measurements; no user research was run.

| Field | Value |
|---|---|
| ID | CD-102 |
| Screen or workflow | Onboarding personal information step |
| User segment | New patient, any age |
| User task | Enter own date of birth, a date known by heart |
| Business objective | Correct record matching |
| Candidate alternatives | A three-field date (day text, month select, year text); B native date input (current); C single masked field; D scroll-wheel picker |
| Production references | GOV.UK and NHS date input; USWDS memorable date; Mobbin On, Wealthfront, Cal AI, CapCut, Neo Financial (none healthcare) |
| Research evidence | Heuristic scores A 4.30, B 3.20, C 3.15, D 2.45. Month select follows USWDS; NHS says numeric-month difficulty is still being researched. |
| Accessibility considerations | 1.3.5 autocomplete tokens bday-day, bday-month, bday-year; no auto-advance; legend; specific errors; wheel pickers inaccessible on web |
| Clinical and privacy constraints | DOB is an identifier; visible only to patient and care team; wrong value risks record mismatch |
| Interaction complexity | Medium: new component |
| Technical feasibility | High: native inputs only |
| Selected alternative | A three-field date with month select |
| Rejected alternatives | B browser-dependent, no format hint; C mask edge cases; D custom wheel |
| Decision rationale | Matches the government and health design systems for dates known by heart and removes the unhinted native control |
| Validation method | Test month select versus text month with older adults; autofill test; screen-reader pass (none run) |
