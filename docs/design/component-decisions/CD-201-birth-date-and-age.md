# CD-201: Birth date with age in parentheses

Status: Proposed, provisional until advisor sign-off. Date: 2026-11-20. Research file: `docs/design/component-research/02-patient-identity.md`. Scores are heuristic judgements, not measurements; no participant research was run.

| Field | Entry |
|---|---|
| ID | CD-201 |
| Screen or workflow | Banner, patient record |
| User segment | Therapist, coordinator, admin |
| User task | Verify identity against what the patient says; judge by age |
| Business objective | Identity confidence |
| Candidate alternatives | Birth date only; age only; birth date plus age; numeric date |
| Production and standards references | component-research/02-patient-identity.md section 2; NHS CUI Patient Banner (community-hosted copy) https://pacharanero.github.io/nhs-cui/patient-identification-and-information-entry-and-display/patben, accessed 2026-11-20 (Born label, age in parentheses; unknown values need words) |
| Research evidence | A 3.70, B ineligible (age cannot identify), C 4.70, D ineligible (ambiguous order, 2.55). Heuristic scores, not measurements; see the research file for the table. |
| Accessibility considerations | Screen-reader string spells month and age; no abbreviation of month in the spoken form |
| Clinical and privacy constraints | Birth date is PHI; show only where identity is needed |
| Interaction complexity | Low |
| Technical feasibility | High: age computed client-side from `birthDate` and org-zone today |
| Selected | C: "Born Mar 3, 1989 (37 years)" (month first, the product's one date formatter; corrected by DR-004 ruling 6.3) |
| Rejected | A (needs mental arithmetic); B; D |
| Rationale | Two cross-checking identifiers, unambiguous month word |
| Validation method | Unit tests for birthday edge, under two years, org zone near midnight; reading test |
| Amended | 2026-11-21, DR-004 ruling 6.3: the example read day-first ("3 Mar 1989"); the product uses one month-first formatter (`microcopy-guidelines.md` section 5), so the banner reads "Born Mar 3, 1989 (37 years)". The age stays in the banner. |
