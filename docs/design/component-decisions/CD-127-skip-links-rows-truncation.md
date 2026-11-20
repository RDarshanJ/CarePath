# CD-127: Skip links, landmarks, clickable rows, truncated text

Status: proposed, provisional until advisor sign-off. Accessed 2026-11-20. Research: `docs/design/component-research/11-accessibility-critical.md`. Scores are heuristic, not measurements; no user research was run.

| Field | Value |
|---|---|
| ID | CD-127 |
| Screen or workflow | All shells and tables |
| User segment | Keyboard and touch users |
| User task | Bypass blocks; open rows; read full text |
| Business objective | Reach |
| Candidate alternatives | Conventional rule; role button on tr rejected |
| Production references | WCAG 2.4.1 Understanding; matrix findings |
| Research evidence | Code read |
| Accessibility considerations | One SkipLink on every shell; row link in first cell; no title-only truncation |
| Clinical and privacy constraints | None |
| Interaction complexity | Low |
| Technical feasibility | High |
| Selected alternative | One SkipLink everywhere; keep row click only with an equivalent link; accessible full text |
| Rejected alternatives | role=button on tr; title-only |
| Decision rationale | Standard |
| Validation method | First-Tab test per route (none run) |
