# CD-501: staff primary nav

Status: provisional until advisor sign-off. Date: 2026-11-20. Full research and spec: `docs/design/component-research/14-navigation.md`.

| Field | Entry |
|---|---|
| ID | CD-501 |
| Screen or workflow | Clinician shell |
| User segment | Clinician |
| User task | Switch between Overview, Patients, Review queue, Schedule, Messages |
| Business objective | Fewer page changes per item; no hidden safety-relevant work |
| Candidate alternatives | A persistent sidebar from md, labelled bottom bar below md (selected); B rail stacked above content below md (current); C collapsible icon rail; D top horizontal nav |
| Production references | M5, M6, M7 (Mobbin web); D5; D6; D3 (URLs and access date 2026-11-20 are in the source register of the research file) |
| Research evidence | Observed: sidebars with labels in work products; none healthcare (EHR navigation not accessed). Heuristic A 4.30, D 3.60, B 3.45, C 3.30. Scores are heuristic; no user testing has been run. |
| Accessibility considerations | Visible labels (no icon-only state), aria-current, badge names carry unit, bottom bar at 320 with large text |
| Clinical and privacy constraints | Badges only where the API returns a true total; no patient names in nav |
| Interaction complexity | Medium: new bottom bar below md, reorder, top bar |
| Technical feasibility | High |
| Selected | A, order Overview, Patients, Review queue, Schedule, Messages |
| Rejected | B (content pushed down on phones), C (hidden state for five items), D (runner-up) |
| Decision rationale | Five destinations fit both forms; nothing hidden; order follows the working day [Judgement] |
| Validation method | Playwright per role item set, badge equals API total, tab order, 320 px |
