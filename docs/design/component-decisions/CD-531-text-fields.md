# CD-531: text fields

Status: provisional until advisor sign-off. Date: 2026-11-20. Full research and spec: `docs/design/component-research/17-light-families.md`.

| Field | Entry |
|---|---|
| ID | CD-531 |
| Screen or workflow | Forms |
| User segment | All |
| User task | Labelled text entry |
| Business objective | Fewer wrong entries |
| Candidate alternatives | Reuse Field; export FieldError; fold NumberField and goal rows |
| Production references | S3 GOV.UK error message (URLs and access date 2026-11-20 are in the source register of the research file) |
| Research evidence | Observed error writing rules. Scores are heuristic; no user testing has been run. |
| Accessibility considerations | Hidden Error prefix; label visible |
| Clinical and privacy constraints | None |
| Interaction complexity | Low |
| Technical feasibility | High |
| Selected | Field only wrapper |
| Rejected | Raw label plus input bypasses |
| Decision rationale | Conventional element |
| Validation method | State tests; describedby order |
