# CD-110: Dose and goal numbers

Status: proposed, provisional until advisor sign-off. Accessed 2026-11-20. Research: `docs/design/component-research/01-clinical-inputs.md`. Scores are heuristic, not measurements; no user research was run.

| Field | Value |
|---|---|
| ID | CD-110 |
| Screen or workflow | Plan builder item editor and goals |
| User segment | Clinician |
| User task | Enter exact whole or decimal values with units |
| Business objective | Correct plans |
| Candidate alternatives | A text input with inputmode, unit, Field wrapper; B type=number; C stepper; D slider (gate fail) |
| Production references | GOV.UK and USWDS (text over number for date parts); brief section 7 |
| Research evidence | Heuristic scores A 4.40, B 3.20, C 3.25. No dose-entry source retrieved. |
| Accessibility considerations | Labels, hint with range, linked error |
| Clinical and privacy constraints | Wrong values reach the patient; no slider for precise clinical values |
| Interaction complexity | Low |
| Technical feasibility | High |
| Selected alternative | A text input with unit suffix inside Field; unit from a closed list [E] |
| Rejected alternatives | B silent value changes and small spinners; C slow; D gate |
| Decision rationale | Exact values are typed |
| Validation method | Unit tests of range errors (none run) |
