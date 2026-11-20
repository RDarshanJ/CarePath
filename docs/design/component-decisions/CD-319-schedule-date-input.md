# CD-319: Date input in schedule navigation

- **ID:** CD-319
- **Status:** proposed, pending advisor sign-off. Research date 2026-11-20.
- **Research:** `docs/design/component-research/04-scheduling-calendar.md`, section 10
- **Screen or workflow:** Clinician /schedule
- **User segment:** Clinician
- **User task:** Jump to a date
- **Business objective:** Quick navigation
- **Alternatives considered:** A native date input plus stepper; B APG date picker dialog; C stepper only; D typed text date
- **Production references and sources:** WAI-ARIA APG date picker dialog example (retrieved; states its code needs testing)
- **Research evidence and its limits:** Official text retrieved; scores A 3.90, B 3.35, C 3.30, D 2.85 heuristic. No participant data exists; scores are heuristic.
- **Accessibility considerations:** Platform keyboard and screen reader behaviour; day shown as text next to the input
- **Clinical and privacy constraints:** None
- **Interaction complexity:** Low
- **Technical feasibility:** High
- **Selected:** A: native date input with Previous, Today and Next
- **Rejected:** B (custom grid for little gain); C (no long jumps); D (error handling for a rare action)
- **Rationale:** Conventional element: reuse the platform control
- **Validation method:** Check on clinician browsers; keyboard-only; zone boundary
