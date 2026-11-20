# CD-205: Patient app signed-in identity

Status: Proposed, provisional until advisor sign-off. Date: 2026-11-20. Research file: `docs/design/component-research/02-patient-identity.md`. Scores are heuristic judgements, not measurements; no participant research was run.

| Field | Entry |
|---|---|
| ID | CD-205 |
| Screen or workflow | Patient header (all app screens) |
| User segment | Patient |
| User task | Know whose information is on screen before reading, booking, messaging or signing out |
| Business objective | Trust; privacy on shared devices |
| Candidate alternatives | Nothing (today); plain text in header; avatar menu; account page |
| Production and standards references | component-research/02-patient-identity.md section 6 |
| Research evidence | A 3.10, B 4.40, C 3.40, D 2.95. Heuristic scores, not measurements; see the research file for the table. |
| Accessibility considerations | Visible text, wraps instead of truncating, readable at 200 percent text |
| Clinical and privacy constraints | Display name only; no MRN or birth date on the patient's screen |
| Interaction complexity | Low |
| Technical feasibility | High: `session.user.displayName` |
| Selected | B: "Signed in as {name}" text beside Sign out; omitted in focused session layout |
| Rejected | A; C (hides Sign out, unused DropdownMenu); D |
| Rationale | Cheap, visible, no hidden action |
| Validation method | 375 and 200 percent wrap check; demo role switch shows right name |
