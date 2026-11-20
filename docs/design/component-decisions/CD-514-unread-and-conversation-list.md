# CD-514: unread and conversation list

Status: provisional until advisor sign-off. Date: 2026-11-20. Full research and spec: `docs/design/component-research/13-messaging.md`.

| Field | Entry |
|---|---|
| ID | CD-514 |
| Screen or workflow | /messages list, /inbox list |
| User segment | Patient and clinician |
| User task | See what is new or failed |
| Business objective | Predictable inbox work |
| Candidate alternatives | A text-first row with CountBadge and separate failure line (selected); B StatusChip and icon text (current); C dot only |
| Production references | M12, M16 (counts and dot); G-messaging.md (URLs and access date 2026-11-20 are in the source register of the research file) |
| Research evidence | Observed pills and dots on rows, Unread filter in lists that grow. Heuristic not scored separately (conventional). Scores are heuristic; no user testing has been run. |
| Accessibility considerations | Row name includes count and time; bold never carries meaning alone |
| Clinical and privacy constraints | Preview 140 characters; no message text in title or URL |
| Interaction complexity | Low |
| Technical feasibility | High |
| Selected | A, plus All and Unread segmented control for staff |
| Rejected | B, C |
| Decision rationale | Chips mean clinical status; unread is a work signal |
| Validation method | Counts equal API; focus order |
