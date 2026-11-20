# CD-515: messages entry and layout

Status: provisional until advisor sign-off. Date: 2026-11-20. Full research and spec: `docs/design/component-research/13-messaging.md`.

| Field | Entry |
|---|---|
| ID | CD-515 |
| Screen or workflow | /messages, /inbox |
| User segment | Patient and clinician |
| User task | Reach the conversation quickly |
| Business objective | Fewer taps for a worried patient; staff move between threads |
| Candidate alternatives | A patient opens the single thread directly, staff two panes from xl (selected); B always list then thread (current); C topic-based threads |
| Production references | M12 to M16; Hers and Ro cards (G-1 prior) (URLs and access date 2026-11-20 are in the source register of the research file) |
| Research evidence | No single-thread-skips-list example found; judgement. Heuristic A 4.55, B 3.45, C 2.70. Scores are heuristic; no user testing has been run. |
| Accessibility considerations | Back link only when a list exists; two-pane order list, thread, composer |
| Clinical and privacy constraints | Participants line shortened with disclosure |
| Interaction complexity | Low to medium |
| Technical feasibility | High: conversation count already fetched |
| Selected | A |
| Rejected | B, C (G rejected topics) |
| Decision rationale | One-row list adds a step |
| Validation method | Single and multiple conversation fixtures; deep links |
