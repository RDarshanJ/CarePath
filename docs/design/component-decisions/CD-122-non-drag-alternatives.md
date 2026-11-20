# CD-122: Reordering and other drag interactions

Status: proposed, provisional until advisor sign-off. Accessed 2026-11-20. Research: `docs/design/component-research/11-accessibility-critical.md`. Scores are heuristic, not measurements; no user research was run.

| Field | Value |
|---|---|
| ID | CD-122 |
| Screen or workflow | Plan builder exercise order |
| User segment | Clinician |
| User task | Order exercises |
| Business objective | Faster plan editing |
| Candidate alternatives | A move up/down buttons; B drag with fallback; C move-to-position menu |
| Production references | WCAG 2.5.7 Understanding |
| Research evidence | Heuristic scores A 4.20, C 4.00, B 3.30. No drag exists in the code. |
| Accessibility considerations | Single-pointer path; named buttons; polite announcement |
| Clinical and privacy constraints | Reordering changes a clinical plan |
| Interaction complexity | Low |
| Technical feasibility | High |
| Selected alternative | A move up and down buttons; move-to-position later only if long plans |
| Rejected alternatives | B second implementation |
| Decision rationale | No drag in product; any future drag ships with a non-drag path |
| Validation method | Keyboard and pointer test (none run) |
