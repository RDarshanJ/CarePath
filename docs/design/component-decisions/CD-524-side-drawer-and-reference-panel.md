# CD-524: side drawer and reference panel

Status: provisional until advisor sign-off. Date: 2026-11-20. Full research and spec: `docs/design/component-research/16-overlays.md`.

| Field | Entry |
|---|---|
| ID | CD-524 |
| Screen or workflow | Queue detail, version view, intake, library |
| User segment | Clinician |
| User task | Inspect or reference supplementary content |
| Business objective | Read while working |
| Candidate alternatives | A modal drawer below xl and in-place or non-modal panel from xl (selected); B non-modal at every width; C full page |
| Production references | M23 to M26, M11; D15; D10 (URLs and access date 2026-11-20 are in the source register of the research file) |
| Research evidence | Observed side panels with and without scrim. Heuristic A 4.00, B 3.65, C 3.20. Scores are heuristic; no user testing has been run. |
| Accessibility considerations | Non-modal variant has no trap; library shows live count; focus returns |
| Clinical and privacy constraints | None specific |
| Interaction complexity | Medium |
| Technical feasibility | High: Radix modal=false |
| Selected | A |
| Rejected | B, C |
| Decision rationale | Matches job: intake is read while editing |
| Validation method | Playwright at 1024 and 1440 |
