# CD-230: How a status is shown

Status: Proposed, provisional until advisor sign-off. Date: 2026-11-20. Research file: `docs/design/component-research/12-status-vocabulary.md`. Scores are heuristic judgements, not measurements; no participant research was run.

| Field | Entry |
|---|---|
| ID | CD-230 |
| Screen or workflow | Every list and record |
| User segment | All |
| User task | Recognise state without noise |
| Business objective | Signal over decoration |
| Candidate alternatives | Badge everywhere; rule set; dot plus text; text only |
| Production and standards references | component-research/12-status-vocabulary.md section 2; GOV.UK Tag https://design-system.service.gov.uk/components/tag/ and NHS Tag https://service-manual.nhs.uk/design-system/components/tag, accessed 2026-11-20; Atlassian Lozenge https://atlassian.design/components/lozenge/usage, accessed 2026-11-20 |
| Research evidence | A 2.75, B 4.45, C 3.40, D 3.70. Heuristic scores, not measurements; see the research file for the table. |
| Accessibility considerations | Text always; colour reinforces; icon on attention states; no standalone dots |
| Clinical and privacy constraints | No verdict tone on health data |
| Interaction complexity | Low |
| Technical feasibility | High |
| Selected | B: plain text for expected, Tag for administrative exceptions, StatusChip for attention or live, no dots, visible explanation and action where needed |
| Rejected | A, C, D |
| Rationale | Absence implies default only in single-status lists |
| Validation method | Story per enum; axe; contrast per tone |
