# CD-523: task note inline expansion

Status: provisional until advisor sign-off. Date: 2026-11-20. Full research and spec: `docs/design/component-research/16-overlays.md`.

| Field | Entry |
|---|---|
| ID | CD-523 |
| Screen or workflow | /review-queue detail |
| User segment | Clinician |
| User task | Resolve or dismiss with a note while evidence stays visible |
| Business objective | Every closure traceable with a note |
| Candidate alternatives | A inline expansion in the detail (selected); B dialog (current); C separate page |
| Production references | M24, M23 (list beside panel); D15, D17, D16 (URLs and access date 2026-11-20 are in the source register of the research file) |
| Research evidence | Code: NoteDialog is rendered inside the drawer below xl (nested modal) and errors go to a toast. Heuristic A 4.70, C 2.75, B 2.65. Scores are heuristic; no user testing has been run. |
| Accessibility considerations | Form as labelled group, Banner role alert on error, focus to field |
| Clinical and privacy constraints | Note saved with person and time; cannot be undone on server |
| Interaction complexity | Low to medium |
| Technical feasibility | High |
| Selected | A |
| Rejected | B (fails gates), C |
| Decision rationale | Context stays; no nesting; text kept on failure |
| Validation method | Below and above xl; no dialog in DOM; API failure keeps text; prototype spec overlay-queue-note.md |
