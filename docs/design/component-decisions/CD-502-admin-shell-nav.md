# CD-502: admin shell nav

Status: provisional until advisor sign-off. Date: 2026-11-20. Full research and spec: `docs/design/component-research/14-navigation.md`.

| Field | Entry |
|---|---|
| ID | CD-502 |
| Screen or workflow | Admin shell |
| User segment | Administrator |
| User task | Assign therapists; one destination today |
| Business objective | Do not show chrome for a single destination |
| Candidate alternatives | A no navigation element while one destination (selected); B one-item sidebar (current); C menu button |
| Production references | M7 for a small rail (not a one-item example); D3, D5 (URLs and access date 2026-11-20 are in the source register of the research file) |
| Research evidence | No example with one destination was searched; judgement. Heuristic A 4.65, B 3.40, C 2.15. Scores are heuristic; no user testing has been run. |
| Accessibility considerations | Header landmark with identity and sign out; no empty nav landmark |
| Clinical and privacy constraints | None specific |
| Interaction complexity | Low |
| Technical feasibility | High |
| Selected | A (add SideNav at two or more destinations) |
| Rejected | B, C |
| Decision rationale | The brief rejects oversized navigation for few destinations |
| Validation method | Landmark audit; sign out reachable at 320 |
