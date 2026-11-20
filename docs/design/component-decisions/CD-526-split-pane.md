# CD-526: split pane

Status: provisional until advisor sign-off. Date: 2026-11-20. Full research and spec: `docs/design/component-research/16-overlays.md`.

| Field | Entry |
|---|---|
| ID | CD-526 |
| Screen or workflow | Queue, overview, inbox |
| User segment | Clinician |
| User task | Work through a list with detail beside it |
| Business objective | Fewer page changes |
| Candidate alternatives | A split pane from xl when supplementary, separate screen when destination (selected); B always drawer; C always split |
| Production references | M12 to M16, M23, M24; H and L feature research (URLs and access date 2026-11-20 are in the source register of the research file) |
| Research evidence | Observed list-plus-panel layouts. Heuristic A 4.30, B 3.50, C 2.85. Scores are heuristic; no user testing has been run. |
| Accessibility considerations | Named regions; selection differs from focus; selection in URL |
| Clinical and privacy constraints | None |
| Interaction complexity | Medium |
| Technical feasibility | High |
| Selected | A |
| Rejected | B, C |
| Decision rationale | Thread is a destination, queue detail is supplementary |
| Validation method | 1024, 1280, 1440; zoom 200 percent |
