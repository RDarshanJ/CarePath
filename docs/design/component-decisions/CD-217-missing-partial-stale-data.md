# CD-217: Missing, partial and stale data states

Status: Proposed, provisional until advisor sign-off. Date: 2026-11-20. Research file: `docs/design/component-research/05-clinical-data-presentation.md`. Scores are heuristic judgements, not measurements; no participant research was run.

| Field | Entry |
|---|---|
| ID | CD-217 |
| Screen or workflow | All data screens |
| User segment | Patient, therapist |
| User task | Know what is not known |
| Business objective | Safety |
| Candidate alternatives | Gate failures excluded (blank, zero, join, interpolate); explicit states |
| Production and standards references | component-research/05-clinical-data-presentation.md section 9; NHS CUI Patient Banner (community-hosted copy) https://pacharanero.github.io/nhs-cui/patient-identification-and-information-entry-and-display/patben, accessed 2026-11-20 (words, not ? or -) |
| Research evidence | Not scored: safety rule |
| Accessibility considerations | Text for every state |
| Clinical and privacy constraints | Absence must never read as good news |
| Interaction complexity | Low |
| Technical feasibility | High |
| Selected | Explicit state table |
| Rejected | Silent omission, zero fill, interpolation |
| Rationale | Gaps are information |
| Validation method | Unit tests per state |
