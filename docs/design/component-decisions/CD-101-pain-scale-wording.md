# CD-101: Pain scale wording, anchors and interpretation

Status: proposed, provisional until advisor sign-off. Accessed 2026-11-20. Research: `docs/design/component-research/01-clinical-inputs.md`. Scores are heuristic, not measurements; no user research was run.

| Field | Value |
|---|---|
| ID | CD-101 |
| Screen or workflow | Every PainScale instance |
| User segment | Patient |
| User task | Understand the scale ends and see their own number echoed |
| Business objective | Consistent meaning across reports |
| Candidate alternatives | Conventional wording rule; alternatives not invented. Considered and rejected: keep mild/moderate/severe words; Wong-Baker faces |
| Production references | Feature research D section 5 and 6; Boonstra 2016 (three published cut-point schemes); LOINC definition; Wong-Baker commercial-use page |
| Research evidence | Source check from feature D, not repeated. Anchor wording effect on responses untested. |
| Accessibility considerations | Anchors visible and in the accessible names; live line plain text |
| Clinical and privacy constraints | No diagnosis or severity label; Wong-Baker needs a licence and forbids colour and modification |
| Interaction complexity | Low |
| Technical feasibility | High |
| Selected alternative | Anchors '0 No pain' and '10 Worst pain imaginable'; live line 'You chose 7 of 10.' |
| Rejected alternatives | Band words; Wong-Baker faces |
| Decision rationale | Band cut-points disagree across studies, so a printed band is an unsupported claim |
| Validation method | Comprehension check of anchors with at least five adults including two over 60; clinical review (none run) |
