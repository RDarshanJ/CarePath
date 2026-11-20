# CD-236: AI generation and review status

Status: Proposed, provisional until advisor sign-off. Date: 2026-11-20. Research file: `docs/design/component-research/12-status-vocabulary.md`. Scores are heuristic judgements, not measurements; no participant research was run.

| Field | Entry |
|---|---|
| ID | CD-236 |
| Screen or workflow | Future clinician AI surfaces, consent |
| User segment | Therapist, patient |
| User task | Know what is AI-generated and whether it was reviewed |
| Business objective | Provenance and trust |
| Candidate alternatives | Chip; AIDraftBlock labels |
| Production and standards references | component-research/12-status-vocabulary.md section 3.6 |
| Research evidence | Not scored: provenance rule |
| Accessibility considerations | Visible labels, no confidence percentage, no sparkle |
| Clinical and privacy constraints | No silent overwrite of clinician text |
| Interaction complexity | Medium; needs AI contract |
| Technical feasibility | Enums exist, contract does not |
| Selected | AIDraftBlock labels extended to six states; "AI-generated" and "AI-assisted drafting" names |
| Rejected | Chip; confidence numbers |
| Rationale | Provenance must say AI |
| Validation method | Story per state; copy review with consent owner |
