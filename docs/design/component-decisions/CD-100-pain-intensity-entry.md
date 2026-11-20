# CD-100: Pain intensity entry

Status: proposed, provisional until advisor sign-off. Accessed 2026-11-20. Research: `docs/design/component-research/01-clinical-inputs.md`. Scores are heuristic, not measurements; no user research was run.

| Field | Value |
|---|---|
| ID | CD-100 |
| Screen or workflow | Onboarding pain step (x3), /check-in, session stop sheet and end-of-session check-in |
| User segment | Patient with a plan, including older adults and people in pain |
| User task | Tell the therapist how much it hurts, as one integer 0 to 10 |
| Business objective | Reliable reports that feed the stored observation and the review rule |
| Candidate alternatives | A numbered radio group 0 to 10; B word-labelled radios (gate fail); C slider or dial (gate fail); D numeric text input; E stepper |
| Production references | Feature research D (Hawker 2011, LOINC wording, Boonstra 2016); WCAG 2.5.7 Understanding; APG slider; Mobbin Crumbl, Bevel, Noom, How We Feel, Visible (feature D table) |
| Research evidence | Heuristic scores A 4.40, D 3.45, E 2.70. No healthcare production pain-entry screen observed. No user testing. |
| Accessibility considerations | 2.5.7 and 2.5.8 pass for radios; slider excluded; selected state needs a mark as well as a fill; both end anchors must be in the accessibility tree |
| Clinical and privacy constraints | Never label the number with severity words; emergency line before sending; scale wording and threshold need clinical sign-off; no other instrument without its owner's terms |
| Interaction complexity | Low: copy and markup changes to PainScale |
| Technical feasibility | High: existing Radix radio group |
| Selected alternative | A: numbered radio group, refined (anchors in names, no band words, check mark, stop value preselected) |
| Rejected alternatives | B and C at the gates; D slower and invites out-of-range entry; E many taps |
| Decision rationale | Matches the stored 0 to 10 observation and the rule, meets target and keyboard needs, and removes an interpretation the screen cannot support. Three-way prototype comparison specified. |
| Validation method | Prototype comparison (design-alternatives/prototypes/pain-input.md); task test at 390 with at least five adults including two over 60; screen-reader and keyboard pass; copy test; clinical review of anchors (none run) |
