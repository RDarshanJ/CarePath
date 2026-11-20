# CD-318: Cancel and reschedule flows

- **ID:** CD-318
- **Status:** proposed, pending advisor sign-off. Research date 2026-11-20.
- **Research:** `docs/design/component-research/04-scheduling-calendar.md`, section 9
- **Screen or workflow:** Patient appointments
- **User segment:** Patient
- **User task:** Cancel or move a visit with low friction
- **Business objective:** Freed slots; fewer silent no-shows
- **Alternatives considered:** A dialog with required reason; B dialog with optional reason and equal Keep; C one-tap cancel with undo; D full page
- **Production references and sources:** Zocdoc help (prior); CVS Health (prior); feature research F
- **Research evidence and its limits:** Prior research; contract makes reason optional; scores A 3.35, B 4.75, C 2.85, D 3.05 heuristic. No participant data exists; scores are heuristic.
- **Accessibility considerations:** Alert-style dialog, initial focus on Keep, Escape keeps; result as Banner text
- **Clinical and privacy constraints:** Reason is health information shown to the care team
- **Interaction complexity:** Low
- **Technical feasibility:** High
- **Selected:** B: dialog with optional reason and equal-weight Keep this visit
- **Rejected:** A (friction not required by the contract); C (undo cannot be honest once a slot is freed); D (too heavy)
- **Rationale:** Matches the contract, reduces friction, keeps a deliberate choice
- **Validation method:** Keyboard and screen reader walkthrough; failure leaves visit unchanged; copy review
