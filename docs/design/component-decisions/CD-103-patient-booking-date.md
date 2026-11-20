# CD-103: Future appointment date selection (patient)

Status: proposed, provisional until advisor sign-off. Accessed 2026-11-20. Research: `docs/design/component-research/01-clinical-inputs.md`. Scores are heuristic, not measurements; no user research was run.

| Field | Value |
|---|---|
| ID | CD-103 |
| Screen or workflow | /appointments/book and reschedule |
| User segment | Patient booking a visit |
| User task | Find and pick an available day, then a time |
| Business objective | Fewer failed bookings; no unavailable dates offered |
| Candidate alternatives | A list or strip of available days plus slots; B monthly calendar popover; C free typed date |
| Production references | USWDS date picker; GOV.UK date input; Mobbin Fresha, Future Pro, Reddit, Structured (none clinical) |
| Research evidence | Heuristic scores A 4.45, B 3.30, C 2.40. Family 4 owns the whole flow. |
| Accessibility considerations | Radio-group semantics; 48 px targets; selected state not by colour alone; live line when times change |
| Clinical and privacy constraints | Time zone shown by name; booking not shown as made until the server confirms |
| Interaction complexity | Low to medium |
| Technical feasibility | High |
| Selected alternative | A available days then slots, with selected states and a slot-naming button |
| Rejected alternatives | B heavy grid for a short list; C invites unavailable dates |
| Decision rationale | Keeps the list model, fixes missing selected states, prevents unavailable choices |
| Validation method | Task test at 390; keyboard and screen-reader pass; conflict state test (none run) |
