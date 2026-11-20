# CD-142: Controls on the onboarding consent step

Status: proposed, provisional until advisor sign-off. Accessed 2026-11-20. Research: `docs/design/component-research/15-consent-controls.md`. Scores are heuristic, not measurements; no user research was run.

| Field | Value |
|---|---|
| ID | CD-142 |
| Screen or workflow | Onboarding step 10 |
| User segment | New patient |
| User task | Agree to required terms and choose the optional one |
| Business objective | Valid recorded choices |
| Candidate alternatives | A switch; B checkbox; C radio pair no preselect |
| Production references | GOV.UK checkboxes and radios; Carbon toggle; Mobbin Perplexity, Google Health, Bevel; Fitbit (prior) |
| Research evidence | Heuristic scores (family weights) C 4.55, B 4.10, A 3.00. |
| Accessibility considerations | Unticked checkbox; radio group; linked errors |
| Clinical and privacy constraints | Required agreement active, never preselected; decline path undefined [U] |
| Interaction complexity | Low |
| Technical feasibility | High |
| Selected alternative | Required: checkbox; optional: radio pair, answer needed |
| Rejected alternatives | A one control two meanings; B untouched box not a choice |
| Decision rationale | Records an active choice either way |
| Validation method | Comprehension test (none run); product decision needed on decline |
