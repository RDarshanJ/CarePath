# CD-235: Administrative task priority

Status: Proposed, provisional until advisor sign-off. Date: 2026-11-20. Research file: `docs/design/component-research/12-status-vocabulary.md`. Scores are heuristic judgements, not measurements; no participant research was run.

| Field | Entry |
|---|---|
| ID | CD-235 |
| Screen or workflow | Review queue |
| User segment | Therapist, coordinator |
| User task | Know what to work on first |
| Business objective | Safe triage |
| Candidate alternatives | Show number; client bands; server two-level band; sort only |
| Production and standards references | component-research/12-status-vocabulary.md section 3.5; GOV.UK Tag https://design-system.service.gov.uk/components/tag/ and NHS Tag https://service-manual.nhs.uk/design-system/components/tag, accessed 2026-11-20 |
| Research evidence | A and B fail gates; C 4.35; D 3.10. Heuristic scores, not measurements; see the research file for the table. |
| Accessibility considerations | Tag text "High priority" |
| Clinical and privacy constraints | Thresholds belong to the server rules, not the client |
| Interaction complexity | Low UI, needs a contract field |
| Technical feasibility | Needs `priorityLevel` in `ReviewTask` (contract request) |
| Selected | C: server `priorityLevel` high or standard; Tag for high only; interim text "Sorted by priority, then oldest first" |
| Rejected | Number; client bands |
| Rationale | Fewest statuses; one source of truth |
| Validation method | Contract test; story |
