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
| Selected | One of each. Button hierarchy (DR-004 section 5.1 rule 1): one `primary` per view; `secondary` at most once per view, only for the single supporting action beside or standing in for the primary; `neutral` for everything repeated per row or card and every utility; `quiet` for Remove and Clear. Links in table cells and list rows have a 24 px minimum hit height in the kit (DR-004 U5). |
| Rejected | AppLink, TextLink, ButtonLink, class-override danger |
| Decision rationale | Conventional element |
| Validation method | Lint for Button className overrides; link text audit; per-route count of `variant="secondary"` |
| Exception | LoadMore moves focus to the first new item after a load (CD-335, DR-004 ruling 6.2); every other button keeps focus where it is. |
| Amended | 2026-11-21 by DR-004 (U3, U5, ruling 6.2). |
