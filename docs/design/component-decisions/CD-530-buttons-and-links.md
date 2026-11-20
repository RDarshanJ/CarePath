# CD-530: buttons and links

Status: provisional until advisor sign-off. Date: 2026-11-20. Full research and spec: `docs/design/component-research/17-light-families.md`.

| Field | Entry |
|---|---|
| ID | CD-530 |
| Screen or workflow | All |
| User segment | All |
| User task | Consolidate links and buttons; one show-more; one danger rule |
| Business objective | Consistency |
| Candidate alternatives | Reuse established pattern: one Link, one button-link, one ShowMore, danger only in ConfirmDialog |
| Production references | S1 GOV.UK button (URLs and access date 2026-11-20 are in the source register of the research file) |
| Research evidence | Observed hierarchy rules; four link implementations in code. Scores are heuristic; no user testing has been run. |
| Accessibility considerations | Underlined links, targets, names |
| Clinical and privacy constraints | None |
| Interaction complexity | Low |
| Technical feasibility | High |
| Selected | One of each |
| Rejected | AppLink, TextLink, ButtonLink, class-override danger |
| Decision rationale | Conventional element |
| Validation method | Lint for Button className overrides; link text audit |
