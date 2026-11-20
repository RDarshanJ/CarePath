# CD-513: emergency and urgent notice

Status: provisional until advisor sign-off. Date: 2026-11-20. Full research and spec: `docs/design/component-research/13-messaging.md`.

| Field | Entry |
|---|---|
| ID | CD-513 |
| Screen or workflow | Composer, contact card, pain flows |
| User segment | Patient |
| User task | Do not wait for a reply when urgent |
| Business objective | Safety copy consistent |
| Candidate alternatives | A one EmergencyNotice, static, with separate urgent line (selected); B Banner warning role status; C hand-built boxes per screen |
| Production references | G-messaging.md; NHS warning callout (S6) (URLs and access date 2026-11-20 are in the source register of the research file) |
| Research evidence | Observed NHS: callout is not for telling people to seek help; limit two per page. Conventional element. Scores are heuristic; no user testing has been run. |
| Accessibility considerations | Static text, not role alert; real tel link; text at least theme label size |
| Clinical and privacy constraints | Fixed EMERGENCY_NOTICE constant is never edited inline; extra line needs advisor approval |
| Interaction complexity | Low |
| Technical feasibility | High |
| Selected | A |
| Rejected | B (announcement noise), C |
| Decision rationale | One implementation, constant untouched |
| Validation method | Exact constant present; tel link; banned-word check |
