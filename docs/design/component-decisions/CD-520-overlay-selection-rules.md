# CD-520: overlay selection rules

Status: provisional until advisor sign-off. Date: 2026-11-20. Full research and spec: `docs/design/component-research/16-overlays.md`.

| Field | Entry |
|---|---|
| ID | CD-520 |
| Screen or workflow | All overlays |
| User segment | All |
| User task | Pick the surface from the job |
| Business objective | No lost input, no nested modals |
| Candidate alternatives | The ten surfaces in the brief assigned by job (table in research file) |
| Production references | M17 to M29; D10, D12 to D17 (URLs and access date 2026-11-20 are in the source register of the research file) |
| Research evidence | Observed convergence: confirmations name outcomes; phones use sheets; desktop uses centred or side panels. Scores are heuristic; no user testing has been run. |
| Accessibility considerations | Focus trap and return, Esc, labelled title, visible close |
| Clinical and privacy constraints | Evidence must stay visible when a decision is made |
| Interaction complexity | Medium |
| Technical feasibility | High |
| Selected | Job-based table; one overlay at a time |
| Rejected | Popover for patient help, hidden row actions, tooltips for truncation, modal queue note, modal intake on wide screens |
| Decision rationale | Matches existing primitives; fixes nested modal in queue |
| Validation method | Playwright per overlay: focus, Esc, return |
