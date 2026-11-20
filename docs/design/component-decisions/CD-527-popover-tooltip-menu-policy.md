# CD-527: popover tooltip menu policy

Status: provisional until advisor sign-off. Date: 2026-11-20. Full research and spec: `docs/design/component-research/16-overlays.md`.

| Field | Entry |
|---|---|
| ID | CD-527 |
| Screen or workflow | Whole app |
| User segment | All |
| User task | Prevent hidden information |
| Business objective | Information visible to touch and keyboard users |
| Candidate alternatives | A policy: keep components, use none by default (selected); B delete them; C use widely |
| Production references | D15, D17 (URLs and access date 2026-11-20 are in the source register of the research file) |
| Research evidence | Code: components unused; title attributes carry truncated text. Scores are heuristic; no user testing has been run. |
| Accessibility considerations | Tooltip supplementary only; no title for information |
| Clinical and privacy constraints | None |
| Interaction complexity | Low |
| Technical feasibility | High |
| Selected | A |
| Rejected | C, B (delete later if still unused) |
| Decision rationale | Brief section 18 |
| Validation method | Lint for title attribute on table cells |
