# CD-505: back navigation and breadcrumbs

Status: provisional until advisor sign-off. Date: 2026-11-20. Full research and spec: `docs/design/component-research/14-navigation.md`.

| Field | Entry |
|---|---|
| ID | CD-505 |
| Screen or workflow | Record, builder, patient flows |
| User segment | Clinician and patient |
| User task | Return one level in the state left |
| Business objective | Less disorientation; preserve filters |
| Candidate alternatives | A back link named for parent, no breadcrumbs (selected); B breadcrumb trail; C browser back only |
| Production references | M8 (breadcrumb example); D1 NHS back link; D2 GOV.UK back link; D10 Apple sheets (URLs and access date 2026-11-20 are in the source register of the research file) |
| Research evidence | Observed NHS and GOV.UK: back link top left before main, not with breadcrumbs, return page in last state. Heuristic A 4.30, B 3.25, C 2.50. Scores are heuristic; no user testing has been run. |
| Accessibility considerations | Link before h1 after skip link, 24 px or 48 px target, name the destination |
| Clinical and privacy constraints | None |
| Interaction complexity | Low: BackLink component, chevron-left icon |
| Technical feasibility | High |
| Selected | A |
| Rejected | B, C |
| Decision rationale | Depth never exceeds three; one way back |
| Validation method | Filter directory, open record, use link, filters persist |
