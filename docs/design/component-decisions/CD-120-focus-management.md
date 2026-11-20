# CD-120: Focus management on view and state change

Status: proposed, provisional until advisor sign-off. Accessed 2026-11-20. Research: `docs/design/component-research/11-accessibility-critical.md`. Scores are heuristic, not measurements; no user research was run.

| Field | Value |
|---|---|
| ID | CD-120 |
| Screen or workflow | Session player, onboarding, booking, dialogs |
| User segment | All, especially keyboard and screen-reader users |
| User task | Land at the start of new content or on the error |
| Business objective | Operable flows |
| Candidate alternatives | A programmatic focus to heading, error summary, opener; B no managed focus (gate fail); C live region only |
| Production references | APG modal dialog; GOV.UK error summary; WCAG 4.1.3 |
| Research evidence | Heuristic scores A 4.50, C 3.20. No assistive-technology test. |
| Accessibility considerations | Heading tabIndex -1; return focus to opener |
| Clinical and privacy constraints | Session screens are time-sensitive |
| Interaction complexity | Low: promote ViewHeading to ui |
| Technical feasibility | High |
| Selected alternative | A heading focus on view change; summary on failed submit; opener on dialog close |
| Rejected alternatives | B and C |
| Decision rationale | One implementation instead of three |
| Validation method | Tab-order and screen-reader test (none run) |
