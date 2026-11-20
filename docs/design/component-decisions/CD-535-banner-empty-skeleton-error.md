# CD-535: banner empty skeleton error

Status: provisional until advisor sign-off. Date: 2026-11-20. Full research and spec: `docs/design/component-research/17-light-families.md`.

| Field | Entry |
|---|---|
| ID | CD-535 |
| Screen or workflow | All |
| User segment | All |
| User task | Feedback surfaces |
| Business objective | Clear errors and empties |
| Candidate alternatives | Reuse Banner, merge Empty into EmptyState, add FieldError, keep Skeleton |
| Production references | S5 GOV.UK notification banner; S6 NHS warning callout; M32, M33 (URLs and access date 2026-11-20 are in the source register of the research file) |
| Research evidence | Observed: banners for information not tied to the task; empty state structure. Scores are heuristic; no user testing has been run. |
| Accessibility considerations | Alert versus status roles; text with icon |
| Clinical and privacy constraints | Errors say whether data is safe |
| Interaction complexity | Low |
| Technical feasibility | High |
| Selected | Merge as stated |
| Rejected | Hand-built banners |
| Decision rationale | Conventional element |
| Validation method | Story per state |
