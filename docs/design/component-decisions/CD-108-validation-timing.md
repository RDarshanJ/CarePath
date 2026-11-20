# CD-108: Validation timing and error presentation

Status: proposed, provisional until advisor sign-off. Accessed 2026-11-20. Research: `docs/design/component-research/01-clinical-inputs.md`. Scores are heuristic, not measurements; no user research was run.

| Field | Value |
|---|---|
| ID | CD-108 |
| Screen or workflow | All forms |
| User segment | Patient and clinician |
| User task | Fix mistakes without losing work |
| Business objective | Fewer failed submissions |
| Candidate alternatives | A on submit only; B on blur; C on keystroke; D hybrid (submit plus blur for format fields) |
| Production references | GOV.UK error summary; NN/g error-message guidelines |
| Research evidence | Heuristic scores D 4.65, A 4.45, B 3.15, C 2.35; D and A within noise. |
| Accessibility considerations | Summary with focus, linked errors, text plus icon, announced once |
| Clinical and privacy constraints | Important clinical errors must persist; preserve entered values |
| Interaction complexity | Medium: merge eight local error blocks |
| Technical feasibility | High |
| Selected alternative | D hybrid: submit with summary; blur for format-only fields after first visit; clear when valid |
| Rejected alternatives | B premature required errors; C noisy |
| Decision rationale | Finds format errors early without premature required errors |
| Validation method | Form test with errors at 390; screen-reader pass (none run) |
