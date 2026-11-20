# CD-532: select and filter bar

Status: provisional until advisor sign-off. Date: 2026-11-20. Full research and spec: `docs/design/component-research/17-light-families.md`.

| Field | Entry |
|---|---|
| ID | CD-532 |
| Screen or workflow | /patients, /review-queue, library, /admin/patients |
| User segment | Clinician |
| User task | Filter lists |
| Business objective | Fast retrieval |
| Candidate alternatives | One FilterBar; SegmentedControl for two to three options; Select for four to twelve |
| Production references | S2 GOV.UK select; S4 USWDS segmented; M30, M31 (URLs and access date 2026-11-20 are in the source register of the research file) |
| Research evidence | Observed guidance: segmented three or fewer; select poor for long lists. Scores are heuristic; no user testing has been run. |
| Accessibility considerations | Radio-group semantics, role search, result count status |
| Clinical and privacy constraints | None |
| Interaction complexity | Medium |
| Technical feasibility | High |
| Selected | FilterBar and SegmentedControl |
| Rejected | Two-option select, bespoke filters |
| Decision rationale | Conventional pattern |
| Validation method | URL sync; clear; 320 px |
