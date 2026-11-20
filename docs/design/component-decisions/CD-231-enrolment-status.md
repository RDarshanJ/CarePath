# CD-231: Enrolment status vocabulary

Status: Proposed, provisional until advisor sign-off. Date: 2026-11-20. Research file: `docs/design/component-research/12-status-vocabulary.md`. Scores are heuristic judgements, not measurements; no participant research was run.

| Field | Entry |
|---|---|
| ID | CD-231 |
| Screen or workflow | Directory, record, admin patients, patient Today |
| User segment | Therapist, admin, patient |
| User task | Know where a patient is in onboarding and care |
| Business objective | Operations |
| Candidate alternatives | One shared map; per-app maps |
| Production and standards references | component-research/12-status-vocabulary.md section 3.1 |
| Research evidence | Not scored beyond CD-230/239 |
| Accessibility considerations | Tag with text |
| Clinical and privacy constraints | `Active` definition unconfirmed |
| Interaction complexity | Low |
| Technical feasibility | High |
| Selected | One map for `PatientStatus` and `IntakeStatus`; intake words Not started, In progress, Submitted, Reviewed; Active defined as visible text |
| Rejected | Per-app copies; renaming before definitions |
| Rationale | Duplicate tone logic and mismatched intake wording |
| Validation method | Enum exhaustiveness test |
