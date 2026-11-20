# CD-504: record section tabs

Status: provisional until advisor sign-off. Date: 2026-11-20. Full research and spec: `docs/design/component-research/14-navigation.md`.

| Field | Entry |
|---|---|
| ID | CD-504 |
| Screen or workflow | Patient record, care plan builder tabs |
| User segment | Clinician |
| User task | Move between sections without losing place |
| Business objective | Fast section switching, deep links |
| Candidate alternatives | A ARIA tabs with URL state and history entry (selected); B link-based section nav; C accordion sections |
| Production references | M9, M10; D4 GOV.UK tabs; D7 APG tabs (URLs and access date 2026-11-20 are in the source register of the research file) |
| Research evidence | Observed GOV.UK: tab change should add history so back returns to the previous tab; current code uses router.replace. Heuristic A 4.30, B 4.20, C 3.25. Scores are heuristic; no user testing has been run. |
| Accessibility considerations | Arrow keys, Home and End, heading repeated in each panel, scrollable list cue below 640 px |
| Clinical and privacy constraints | Panels fetch only when active; builder tabs keep draft in memory |
| Interaction complexity | Low: change replace to push; mount only active panel |
| Technical feasibility | High |
| Selected | A |
| Rejected | B (runner-up if sections become routes), C |
| Decision rationale | Established pattern; fixes back-button behaviour |
| Validation method | Back button returns to previous tab; deep link focus; arrow-key test |
