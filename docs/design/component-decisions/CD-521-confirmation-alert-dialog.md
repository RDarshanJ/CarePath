# CD-521: confirmation alert dialog

Status: provisional until advisor sign-off. Date: 2026-11-20. Full research and spec: `docs/design/component-research/16-overlays.md`.

| Field | Entry |
|---|---|
| ID | CD-521 |
| Screen or workflow | Cancel visit, publish, revoke consent, stop session (type only) |
| User segment | Patient and clinician |
| User task | Confirm a hard-to-undo decision |
| Business objective | Fewer accidents without click-through |
| Candidate alternatives | A alert dialog from Dialog (selected); B current Dialog defaults; C undo toast; D full page |
| Production references | M17, M19, M18 (weak); D12, D13, D14, D16 (URLs and access date 2026-11-20 are in the source register of the research file) |
| Research evidence | Observed outcome buttons and consequence text. Heuristic A 4.45, B 3.70, C 3.45, D 3.40. Scores are heuristic; no user testing has been run. |
| Accessibility considerations | role alertdialog, safe-first focus, outside click disabled, errors in dialog |
| Clinical and privacy constraints | Actions are append-only or release slots; undo is not available server-side |
| Interaction complexity | Low to medium; no new dependency |
| Technical feasibility | High |
| Selected | A |
| Rejected | C (no server undo), B (base primitive), D |
| Decision rationale | Interrupt only when consequence is serious; outcome labels |
| Validation method | Focus start and return; Esc; error keeps text; axe |
