# CD-500: patient primary nav

Status: provisional until advisor sign-off. Date: 2026-11-20. Full research and spec: `docs/design/component-research/14-navigation.md`.

| Field | Entry |
|---|---|
| ID | CD-500 |
| Screen or workflow | All patient screens (shell) |
| User segment | Patient |
| User task | Move between Today, Progress, Appointments, Messages one-handed |
| Business objective | Daily return and message use; Contact care team reachable everywhere |
| Candidate alternatives | A bottom tab bar on phones and header tab row from md (selected); B hamburger or drawer; C left sidebar at every width; D bottom bar at every width |
| Production references | M1 to M4 (Mobbin iOS); D5 Apple tab bars; D6 NN/g hamburger; D3 GOV.UK service navigation (URLs and access date 2026-11-20 are in the source register of the research file) |
| Research evidence | Observed: four to five labelled tabs in health apps; NN/g study: hidden navigation cut discoverability. Heuristic score A 4.60, D 3.90, C 3.00, B 2.55. Scores are heuristic; no user testing has been run. |
| Accessibility considerations | Visible labels, aria-current plus bar and weight, 48 px targets, one landmark rendered visible at a time, no keyboard trap, bar not above on-screen keyboard |
| Clinical and privacy constraints | Nav shows counts only, never message text; session focus mode hides nav by design |
| Interaction complexity | Low: consolidates hand-built nav into ui BottomTabBar plus one header row |
| Technical feasibility | High: components exist |
| Selected | A |
| Rejected | B (fails brief: hides frequent tasks), C, D (runner-up) |
| Decision rationale | Always-visible labelled destinations; bar at thumb reach on phones, header row near Contact button on wider screens; removes duplicate hand-built nav and badge |
| Validation method | Playwright 375 to 1024, axe, 200 percent zoom, label wrap at 320, aria-current on nested routes |
