# CD-522: unsaved change protection

Status: provisional until advisor sign-off. Date: 2026-11-20. Full research and spec: `docs/design/component-research/16-overlays.md`.

| Field | Entry |
|---|---|
| ID | CD-522 |
| Screen or workflow | Overlays with text; builder; message draft |
| User segment | All |
| User task | Never lose entered text silently |
| Business objective | Clinical records and patient entries protected |
| Candidate alternatives | A in-overlay discard row plus beforeunload plus in-app link guard (selected); B Radix defaults; C autosave everywhere |
| Production references | M20, M21 (unsaved dialogs); D10 Apple sheets; D12 (URLs and access date 2026-11-20 are in the source register of the research file) |
| Research evidence | Observed two-outcome unsaved dialogs. Heuristic A 4.25, C 3.95, B 2.50. Scores are heuristic; no user testing has been run. |
| Accessibility considerations | Discard row focus on Keep editing; no second dialog |
| Clinical and privacy constraints | Drafts of health text not stored in browser storage |
| Interaction complexity | Medium to high: App Router has no route-block API; click and popstate handlers |
| Technical feasibility | Medium |
| Selected | A |
| Rejected | B (fails: note lost on stray click), C (privacy and cost) |
| Decision rationale | Defence in depth without nesting |
| Validation method | Type, click outside, Esc, reload, in-app link in error state |
