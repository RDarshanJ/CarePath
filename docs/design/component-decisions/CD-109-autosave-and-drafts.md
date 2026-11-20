# CD-109: Autosave and draft handling for patient forms

Status: proposed, provisional until advisor sign-off. Accessed 2026-11-20. Research: `docs/design/component-research/01-clinical-inputs.md`. Scores are heuristic, not measurements; no user research was run.

| Field | Value |
|---|---|
| ID | CD-109 |
| Screen or workflow | Onboarding, check-in |
| User segment | Patient |
| User task | Resume without re-entering |
| Business objective | Higher completion |
| Candidate alternatives | A save at step commit with local draft and status line; B per-field autosave; C single Save |
| Production references | Visible and Flo commit buttons (Mobbin); feature research A and D; WCAG 3.3.7 |
| Research evidence | Heuristic scores A 4.60, B 3.30, C 3.45. |
| Accessibility considerations | Polite status line; no focus theft; persistent failure message |
| Clinical and privacy constraints | Draft in tab storage only, cleared on sign-out, never passwords |
| Interaction complexity | Low |
| Technical feasibility | High |
| Selected alternative | A step-commit save |
| Rejected alternatives | B many requests and noise; C loses work |
| Decision rationale | Matches the contract (per-step save) and 3.3.7 |
| Validation method | Interruption test (none run) |
