# CD-202: Name order, MRN, gender and other identity fields

Status: Proposed, provisional until advisor sign-off. Date: 2026-11-20. Research file: `docs/design/component-research/02-patient-identity.md`. Scores are heuristic judgements, not measurements; no participant research was run.

| Field | Entry |
|---|---|
| ID | CD-202 |
| Screen or workflow | Banner Zone 1 and Zone 2 |
| User segment | Therapist, coordinator, admin |
| User task | Read identifiers precisely; find secondary facts on demand |
| Business objective | Accuracy and minimum necessary data |
| Candidate alternatives | Given-first as stored; family-first with upper-case family name (NHS); display name plus legal name |
| Production and standards references | component-research/02-patient-identity.md section 3; NHS CUI Patient Banner (community-hosted copy) https://pacharanero.github.io/nhs-cui/patient-identification-and-information-entry-and-display/patben, accessed 2026-11-20 |
| Research evidence | Not scored; contract limits options (no title, no preferred name). Open question on name order. |
| Accessibility considerations | MRN as selectable plain text with label; no copy button |
| Clinical and privacy constraints | Gender is sensitive: Zone 2 only; unknown shown as Not recorded |
| Interaction complexity | Low |
| Technical feasibility | High |
| Selected | Given-first as stored; MRN labelled mono in Zone 1; gender, language, time zone, care team in Zone 2; missing = "Not recorded" |
| Rejected | Family-first now (cross-app mismatch with patient app and messages; revisit if confusion is found); copy button; deceased-patient variant (no data) |
| Rationale | Matches the contract and the patient's own view; avoids inventing fields |
| Validation method | Review name order in testing with name-order-ambiguous synthetic names (not run) |
