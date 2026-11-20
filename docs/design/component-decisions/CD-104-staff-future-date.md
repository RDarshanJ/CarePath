# CD-104: Future date set by staff

Status: proposed, provisional until advisor sign-off. Accessed 2026-11-20. Research: `docs/design/component-research/01-clinical-inputs.md`. Scores are heuristic, not measurements; no user research was run.

| Field | Value |
|---|---|
| ID | CD-104 |
| Screen or workflow | Plan builder goal target date; schedule day jump |
| User segment | Clinician |
| User task | Set a target date or jump to a day |
| Business objective | Faster plan building |
| Candidate alternatives | A text field plus calendar popover; B three-field date; C native date input constrained |
| Production references | USWDS date picker; GOV.UK date input |
| Research evidence | Heuristic scores A 3.60, B 3.75, C 3.70, within noise; chose lowest risk. Native-input behaviour is [Assumption]. |
| Accessibility considerations | Native control is a user-agent control for 2.5.8; custom calendar carries highest risk |
| Clinical and privacy constraints | Target dates must be in the future; wrong dates reach the patient's plan |
| Interaction complexity | Low |
| Technical feasibility | High |
| Selected alternative | C native date input with label, hint, min, linked error (staff only) |
| Rejected alternatives | A build and accessibility cost; B slower for repeated use (fallback if browser tests fail) |
| Decision rationale | Scores do not separate the options so the platform control with constraints wins |
| Validation method | Browser and screen-reader test matrix (none run) |
