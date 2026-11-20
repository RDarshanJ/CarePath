# CD-200: Identity-only banner on the open patient record

Status: Proposed, provisional until advisor sign-off. Date: 2026-11-20. Research file: `docs/design/component-research/02-patient-identity.md`. Scores are heuristic judgements, not measurements; no participant research was run.

| Field | Entry |
|---|---|
| ID | CD-200 |
| Screen or workflow | Clinician record (all sections, plan builder) |
| User segment | Physical therapist; coordinator and admin (administrative slice) |
| User task | Confirm which single patient is open while working in any section |
| Business objective | Fewer wrong-patient actions |
| Candidate alternatives | A page-header identity (today); B dedicated identity-only banner; C side panel with identity and state; D identity chip in shell bar |
| Production and standards references | component-research/02-patient-identity.md section 1; NHS CUI Patient Banner (community-hosted copy) https://pacharanero.github.io/nhs-cui/patient-identification-and-information-entry-and-display/patben, accessed 2026-11-20; DHCW Single Record Design System README lists a Patient Banner (details not retrievable); Epic Storyboard and Heidi from J (prior) |
| Research evidence | Weighted A 3.45, B 4.45, C 3.85, D 2.80 (ineligible: fails identity-visible-without-interaction gate). Heuristic scores, not measurements; see the research file for the table. |
| Accessibility considerations | Section landmark named Patient; not obscured by sticky bar (SC 2.4.11); unsticks when tall (CD-203); Zone 2 is a button with aria-expanded |
| Clinical and privacy constraints | Identity is PHI: minimum fields; banner only on single-patient screens; no photo or initials as identifier |
| Interaction complexity | Low to medium: one component, data already in `PatientHeader` |
| Technical feasibility | High: no new endpoint |
| Selected | B: identity-only banner, actions moved to workspace header, J summary below or beside |
| Rejected | A (identity and actions share a block); C as identity carrier (collapses at narrow widths); D (fails gate) |
| Rationale | Identity must be a distinct element that never lives in a collapsible region; refines J, which placed identity inside the summary panel |
| Validation method | Playwright: banner present on record, absent on lists; axe at 375, 768, 1440; keyboard focus not covered; scenario test with two patients sharing a name (not run) |
