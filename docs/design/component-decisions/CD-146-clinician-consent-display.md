# CD-146: Clinician-side consent display

Status: proposed, provisional until advisor sign-off. Accessed 2026-11-20. Research: `docs/design/component-research/15-consent-controls.md`. Scores are heuristic, not measurements; no user research was run.

| Field | Value |
|---|---|
| ID | CD-146 |
| Screen or workflow | Patient record |
| User segment | Clinician |
| User task | See what the patient has consented to |
| Business objective | Do not use AI features without consent |
| Candidate alternatives | Conventional; clinician switch rejected |
| Production references | feature research M |
| Research evidence | Heuristic only |
| Accessibility considerations | Read-only text |
| Clinical and privacy constraints | Staff withdrawal belongs to family 8 |
| Interaction complexity | Low |
| Technical feasibility | High |
| Selected alternative | Read-only status with blocked-state reason; no control |
| Rejected alternatives | Switch in record header |
| Decision rationale | A control invites accidental revocation |
| Validation method | Role test |
