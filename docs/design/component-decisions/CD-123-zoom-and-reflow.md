# CD-123: Zoom, reflow and large text

Status: proposed, provisional until advisor sign-off. Accessed 2026-11-20. Research: `docs/design/component-research/11-accessibility-critical.md`. Scores are heuristic, not measurements; no user research was run.

| Field | Value |
|---|---|
| ID | CD-123 |
| Screen or workflow | All routes |
| User segment | Low-vision users, mobile users |
| User task | Use at 320 CSS px and 400 percent zoom |
| Business objective | Reach |
| Candidate alternatives | Conventional rule; alternative not invented |
| Production references | WCAG 1.4.10 Understanding |
| Research evidence | Not yet verified in render |
| Accessibility considerations | No two-way scroll except data tables inside their own region |
| Clinical and privacy constraints | None |
| Interaction complexity | Low to medium |
| Technical feasibility | High |
| Selected alternative | 320 px reflow rule with data-table and builder exceptions inside own region |
| Rejected alternatives | Fixed-width layouts |
| Decision rationale | Standard |
| Validation method | Render at 320 and 400 percent zoom (none run) |
