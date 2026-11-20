# CD-525: patient bottom sheet

Status: provisional until advisor sign-off. Date: 2026-11-20. Full research and spec: `docs/design/component-research/16-overlays.md`.

| Field | Entry |
|---|---|
| ID | CD-525 |
| Screen or workflow | Session skip and stop, contact care team |
| User segment | Patient |
| User task | Scoped task on a phone |
| Business objective | Thumb reach, one task |
| Candidate alternatives | A bottom sheet below md, centred dialog from md (selected); B bottom sheet at every width (current); C centred dialog at every width |
| Production references | M27 to M29, M17; D10 (URLs and access date 2026-11-20 are in the source register of the research file) |
| Research evidence | Observed sheets with close or Cancel and a primary button. Heuristic A 3.95, C 3.55, B 3.30. Scores are heuristic; no user testing has been run. |
| Accessibility considerations | Visible close; no swipe-only dismissal; footer reachable with keyboard open |
| Clinical and privacy constraints | None specific |
| Interaction complexity | Low |
| Technical feasibility | High; no gesture dependency |
| Selected | A |
| Rejected | B, C |
| Decision rationale | Sheet on phones, dialog on wide windows |
| Validation method | 375, 390, 768; large text |
