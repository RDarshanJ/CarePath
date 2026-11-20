# CD-507: skip links and landmarks

Status: provisional until advisor sign-off. Date: 2026-11-20. Full research and spec: `docs/design/component-research/14-navigation.md`.

| Field | Entry |
|---|---|
| ID | CD-507 |
| Screen or workflow | All shells and public pages |
| User segment | All |
| User task | Bypass repeated chrome |
| Business objective | Accessibility baseline |
| Candidate alternatives | One shared SkipLink on every page including /login and /onboarding (selected); keep two copies; none on public pages |
| Production references | WCAG 2.4.1 [Prior, not re-fetched] (URLs and access date 2026-11-20 are in the source register of the research file) |
| Research evidence | Code: two copies, none on login or onboarding. Scores are heuristic; no user testing has been run. |
| Accessibility considerations | First Tab stop on every route; target main#main |
| Clinical and privacy constraints | None |
| Interaction complexity | Low |
| Technical feasibility | High |
| Selected | One shared SkipLink |
| Rejected | Duplicates; omission on public pages |
| Decision rationale | Conventional element |
| Validation method | First tab stop on every route |
