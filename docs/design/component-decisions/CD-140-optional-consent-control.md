# CD-140: Optional consent: switch or explicit action

Status: proposed, provisional until advisor sign-off. Accessed 2026-11-20. Research: `docs/design/component-research/15-consent-controls.md`. Scores are heuristic, not measurements; no user research was run.

| Field | Value |
|---|---|
| ID | CD-140 |
| Screen or workflow | /consent |
| User segment | Patient |
| User task | Allow or stop allowing automated drafting tools |
| Business objective | Valid consent for AI drafting; auditable |
| Candidate alternatives | A switch; B status line plus explicit button; C button plus confirm dialog; D checkbox plus Save |
| Production references | Carbon toggle; APG switch; GDPR Art 7 (reference); Mobbin Bevel, Swiggy, Google Health, Perplexity, Structured, Claude |
| Research evidence | Heuristic scores (family weights) B 4.25, C 3.90, D 3.30, A 3.25. |
| Accessibility considerations | Real buttons; status via role=status; error via alert; 48 px |
| Clinical and privacy constraints | No default-on; equal ease both ways; no legal claim; state and date visible |
| Interaction complexity | Low |
| Technical feasibility | High |
| Selected alternative | B status line plus explicit button, immediate, symmetric, persistent result |
| Rejected alternatives | A ambiguity and two meanings; C friction; D deferred save |
| Decision rationale | Names the permission in words and records the result |
| Validation method | Comprehension test with five or more adults including two over 60 (none run) |
