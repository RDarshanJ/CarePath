# CD-106: Body area selection

Status: proposed, provisional until advisor sign-off. Accessed 2026-11-20. Research: `docs/design/component-research/01-clinical-inputs.md`. Scores are heuristic, not measurements; no user research was run.

| Field | Value |
|---|---|
| ID | CD-106 |
| Screen or workflow | Onboarding body area step |
| User segment | Patient |
| User task | Say which area the plan is for and which side |
| Business objective | Correct plan matching |
| Candidate alternatives | A radio list, two columns; B tappable body figure with list; C searchable combobox |
| Production references | Mobbin How We Feel (pointer-first figure); Stardust (checkbox list); feature research D |
| Research evidence | Heuristic scores A 4.30, B 2.65, C 3.00. |
| Accessibility considerations | No drag (2.5.7); small regions fail 2.5.8; list does the job |
| Clinical and privacy constraints | No anatomical claims; art direction forbids instructional imagery |
| Interaction complexity | Low |
| Technical feasibility | High |
| Selected alternative | A radio list; side as separate radios; decorative illustration after choice |
| Rejected alternatives | B pointer precision, asset cost, anatomical implication; C no search need |
| Decision rationale | Ten options fit on screen |
| Validation method | Task test; keyboard pass (none run) |
