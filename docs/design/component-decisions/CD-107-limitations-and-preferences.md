# CD-107: Checkboxes for limitations, availability and preferences

Status: proposed, provisional until advisor sign-off. Accessed 2026-11-20. Research: `docs/design/component-research/01-clinical-inputs.md`. Scores are heuristic, not measurements; no user research was run.

| Field | Value |
|---|---|
| ID | CD-107 |
| Screen or workflow | Onboarding activity limitations, availability |
| User segment | Patient |
| User task | Tick all that apply |
| Business objective | Complete intake |
| Candidate alternatives | A checkbox group with exclusive None; B multi-select dropdown; C toggle chips |
| Production references | GOV.UK checkboxes; Mobbin Stardust, Flo |
| Research evidence | Heuristic scores A 4.50, B 2.75, C 3.10. Contract cannot tell none from skipped. |
| Accessibility considerations | Fieldset, legend, hint, 48 px rows, announced exclusive change |
| Clinical and privacy constraints | Optional fields say so in words |
| Interaction complexity | Low |
| Technical feasibility | High |
| Selected alternative | A checkbox group with an exclusive None of these |
| Rejected alternatives | B hides ten short options; C chips for filters not form answers |
| Decision rationale | Visible short list; GOV.UK none-option rule |
| Validation method | Task test; keyboard pass (none run) |
