# CD-506: command palette and global search

Status: provisional until advisor sign-off. Date: 2026-11-20. Full research and spec: `docs/design/component-research/14-navigation.md`.

| Field | Entry |
|---|---|
| ID | CD-506 |
| Screen or workflow | Staff shell |
| User segment | Clinician |
| User task | Find a patient quickly from anywhere |
| Business objective | Fast patient retrieval without extra surfaces |
| Candidate alternatives | A Patients page search with slash shortcut (selected for this release); B global patient quick-find; C command palette |
| Production references | M5, M6 (global search with shortcut hint, non-health) (URLs and access date 2026-11-20 are in the source register of the research file) |
| Research evidence | Observed only that products with many destinations carry global search. Guidance pages for palettes not retrieved. Heuristic A 4.40, B 3.85, C 2.90. Scores are heuristic; no user testing has been run. |
| Accessibility considerations | Combobox pattern needed for B and C is heavier [Judgement] |
| Clinical and privacy constraints | Palette recent items would expose patient names on shared screens |
| Interaction complexity | A low; B medium; C high |
| Technical feasibility | A high |
| Selected | A |
| Rejected | C (cost, privacy, no evidence of need), B (revisit if finding a patient from outside Patients takes more than two steps or destinations exceed eight) |
| Decision rationale | Five destinations do not justify an accelerator layer |
| Validation method | Task test: find a named patient from Overview |
