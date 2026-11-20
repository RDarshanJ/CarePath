# CD-121: Target size

Status: proposed, provisional until advisor sign-off. Accessed 2026-11-20. Research: `docs/design/component-research/11-accessibility-critical.md`. Scores are heuristic, not measurements; no user research was run.

| Field | Value |
|---|---|
| ID | CD-121 |
| Screen or workflow | All controls |
| User segment | All, including tremor and older adults |
| User task | Hit controls reliably |
| Business objective | Fewer wrong taps |
| Candidate alternatives | Conventional rule; alternative not invented (single 24 px floor rejected) |
| Production references | WCAG 2.5.8 Understanding |
| Research evidence | Tokens read from tokens.css |
| Accessibility considerations | 48 px patient, 32 px clinician, 24 px only with spacing and never destructive |
| Clinical and privacy constraints | None |
| Interaction complexity | Low |
| Technical feasibility | High |
| Selected alternative | House floor above WCAG minimum; fix 24 px clinician items next to other controls |
| Rejected alternatives | Single 24 px floor |
| Decision rationale | Audience includes older adults and people in pain |
| Validation method | Automated bounding-box check at 320 to 768 |
