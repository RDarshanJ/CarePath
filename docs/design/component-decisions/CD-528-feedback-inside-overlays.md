# CD-528: feedback inside overlays

Status: provisional until advisor sign-off. Date: 2026-11-20. Full research and spec: `docs/design/component-research/16-overlays.md`.

| Field | Entry |
|---|---|
| ID | CD-528 |
| Screen or workflow | Overlay actions |
| User segment | Clinician and patient |
| User task | See the result where looking |
| Business objective | Errors visible while input is at risk |
| Candidate alternatives | A feedback stays inside the overlay (selected); B toasts for everything (current) |
| Production references | D16, D17, D11 (URLs and access date 2026-11-20 are in the source register of the research file) |
| Research evidence | Code: error toast shows behind or after the dialog with typed text at risk. Heuristic A 4.50, B 2.30. Scores are heuristic; no user testing has been run. |
| Accessibility considerations | role alert Banner inside the overlay; focus to Banner |
| Clinical and privacy constraints | Clinical record errors never toast-only |
| Interaction complexity | Low |
| Technical feasibility | High |
| Selected | A |
| Rejected | B |
| Decision rationale | Brief section 14 |
| Validation method | Failure test inside each overlay |
