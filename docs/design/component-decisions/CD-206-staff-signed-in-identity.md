# CD-206: Staff shell signed-in identity

Status: Proposed, provisional until advisor sign-off. Date: 2026-11-20. Research file: `docs/design/component-research/02-patient-identity.md`. Scores are heuristic judgements, not measurements; no participant research was run.

| Field | Entry |
|---|---|
| ID | CD-206 |
| Screen or workflow | Clinician and admin shell footer |
| User segment | Clinician, admin |
| User task | Know which account is signed in |
| Business objective | Accountability |
| Candidate alternatives | Established pattern kept (Avatar, name, role) |
| Production and standards references | component-research/02-patient-identity.md section 7 |
| Research evidence | Not scored: conventional element |
| Accessibility considerations | Name wraps instead of truncating |
| Clinical and privacy constraints | None |
| Interaction complexity | Trivial |
| Technical feasibility | High |
| Selected | Keep existing; allow name to wrap to two lines |
| Rejected | Truncation |
| Rationale | Full name readable without hover |
| Validation method | Long synthetic name at 1024 |
