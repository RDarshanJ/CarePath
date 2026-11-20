# CD-508: nav count badges

Status: provisional until advisor sign-off. Date: 2026-11-20. Full research and spec: `docs/design/component-research/14-navigation.md`.

| Field | Entry |
|---|---|
| ID | CD-508 |
| Screen or workflow | Patient and staff nav |
| User segment | All |
| User task | See something is waiting |
| Business objective | Attention without alarm |
| Candidate alternatives | A one filled CountBadge with unit (selected); B outlined in staff and filled in patient (current); C dot only |
| Production references | M4 (dot); D5 badges reserved for critical info (URLs and access date 2026-11-20 are in the source register of the research file) |
| Research evidence | Observed dot without number; Apple says number or exclamation. Conventional element. Scores are heuristic; no user testing has been run. |
| Accessibility considerations | Accessible name carries unit; hidden at zero; 99+ with full value in name |
| Clinical and privacy constraints | Counts only |
| Interaction complexity | Low |
| Technical feasibility | High |
| Selected | A |
| Rejected | B, C |
| Decision rationale | One look for one meaning |
| Validation method | axe name check; 99+ case |
