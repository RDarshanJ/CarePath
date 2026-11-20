# CD-125: Sticky elements and focus not obscured

Status: proposed, provisional until advisor sign-off. Accessed 2026-11-20. Research: `docs/design/component-research/11-accessibility-critical.md`. Scores are heuristic, not measurements; no user research was run.

| Field | Value |
|---|---|
| ID | CD-125 |
| Screen or workflow | Patient tab bar, plan builder header, record header |
| User segment | Keyboard users |
| User task | Tab through long pages |
| Business objective | Operable long forms |
| Candidate alternatives | A scroll-padding from one token; B no sticky bars; C auto-hide bars |
| Production references | WCAG 2.4.11 Understanding; Mobbin Future Pro, Headway, Flo (layout only) |
| Research evidence | Heuristic scores A 4.30, B 3.45, C 3.25. scroll-padding already set in two layouts. |
| Accessibility considerations | Focused control never fully hidden; inert behind dialogs |
| Clinical and privacy constraints | None |
| Interaction complexity | Low |
| Technical feasibility | High |
| Selected alternative | A scroll-padding tokens; static at large zoom |
| Rejected alternatives | B and C |
| Decision rationale | Existing technique, one token |
| Validation method | Tab through at 320 and 400 percent zoom (none run) |
