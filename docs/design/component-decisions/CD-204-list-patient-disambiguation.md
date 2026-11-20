# CD-204: Second identifier in multi-patient lists

Status: Proposed, provisional until advisor sign-off. Date: 2026-11-20. Research file: `docs/design/component-research/02-patient-identity.md`. Scores are heuristic judgements, not measurements; no participant research was run.

| Field | Entry |
|---|---|
| ID | CD-204 |
| Screen or workflow | Queue, schedule, overview, inbox, admin patients, directory |
| User segment | Therapist, coordinator, admin |
| User task | Open or act on the right patient from a list |
| Business objective | Fewer wrong-patient actions |
| Candidate alternatives | Name only; name plus Born; name plus MRN; initials avatar; photo |
| Production and standards references | component-research/02-patient-identity.md section 5; NHS CUI Patient Banner (community-hosted copy) https://pacharanero.github.io/nhs-cui/patient-identification-and-information-entry-and-display/patben, accessed 2026-11-20 (banner must not appear on multi-patient screens) |
| Research evidence | A 3.35 (conditional), B 4.00, C 4.00, D 2.45, E ineligible (no photo data). Heuristic scores, not measurements; see the research file for the table. |
| Accessibility considerations | Name link text unchanged; second line is text |
| Clinical and privacy constraints | PHI minimised; no photo; no banner on lists |
| Interaction complexity | Low |
| Technical feasibility | High, needs `birthDate` in list item contracts: [check] |
| Selected | B: name link plus muted Born line wherever a row opens or acts on a patient; directory adds MRN column |
| Rejected | A, D, E |
| Rationale | Born is what staff verify aloud; MRN stays the directory lookup key |
| Validation method | List contract check; Playwright text assertion on each list |
