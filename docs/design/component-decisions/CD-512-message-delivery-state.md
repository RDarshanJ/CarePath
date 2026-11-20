# CD-512: message delivery state

Status: provisional until advisor sign-off. Date: 2026-11-20. Full research and spec: `docs/design/component-research/13-messaging.md`.

| Field | Entry |
|---|---|
| ID | CD-512 |
| Screen or workflow | Thread items and lists |
| User segment | Patient and clinician |
| User task | Know whether a message went through |
| Business objective | Trust in sending |
| Candidate alternatives | A one DeliveryState icon plus words (selected); B chip in staff, icon text in patient (current); C ticks only |
| Production references | G-messaging.md (Hers tick); D11 WCAG status messages (URLs and access date 2026-11-20 are in the source register of the research file) |
| Research evidence | Contract has queued, sent, failed only; no read receipts. Heuristic A 4.70, B 3.20, C 2.35. Scores are heuristic; no user testing has been run. |
| Accessibility considerations | Never colour alone; retry reachable by keyboard; failure announced once |
| Clinical and privacy constraints | Never show Delivered or Read |
| Interaction complexity | Low |
| Technical feasibility | High |
| Selected | A |
| Rejected | B, C (cannot show Delivered or Read truthfully) |
| Decision rationale | Same words in both apps; toast removed |
| Validation method | Greyscale check; retry failure test |
