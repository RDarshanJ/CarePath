# CD-126: Timers, live regions and status messages

Status: proposed, provisional until advisor sign-off. Accessed 2026-11-20. Research: `docs/design/component-research/11-accessibility-critical.md`. Scores are heuristic, not measurements; no user research was run.

| Field | Value |
|---|---|
| ID | CD-126 |
| Screen or workflow | Session player, all status lines |
| User segment | Screen-reader users |
| User task | Hear changes without being flooded |
| Business objective | Trust |
| Candidate alternatives | Conventional rule; per-second announcements rejected |
| Production references | WCAG 2.2.1 and 4.1.3 Understanding |
| Research evidence | Code read |
| Accessibility considerations | Milestone announcements, polite status, alert for errors |
| Clinical and privacy constraints | Important errors persist |
| Interaction complexity | Low |
| Technical feasibility | High |
| Selected alternative | Timer role with aria-live off plus milestone status text |
| Rejected alternatives | Per-second or assertive success |
| Decision rationale | Standard |
| Validation method | Screen-reader pass of a session (none run) |
