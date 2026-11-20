# CD-124: Reduced motion

Status: proposed, provisional until advisor sign-off. Accessed 2026-11-20. Research: `docs/design/component-research/11-accessibility-critical.md`. Scores are heuristic, not measurements; no user research was run.

| Field | Value |
|---|---|
| ID | CD-124 |
| Screen or workflow | All flows |
| User segment | Users with motion sensitivity |
| User task | Use without motion |
| Business objective | Reach |
| Candidate alternatives | Conventional rule; alternative not invented (in-app toggle rejected) |
| Production references | WCAG 2.3.3 Understanding; components.css |
| Research evidence | Code read; spinner stops under reduced motion |
| Accessibility considerations | Words for every loading state |
| Clinical and privacy constraints | None |
| Interaction complexity | Low |
| Technical feasibility | High |
| Selected alternative | Keep global rule; ensure text for each loading state |
| Rejected alternatives | In-app motion toggle |
| Decision rationale | OS setting is the control |
| Validation method | Flows with media feature on (none run) |
