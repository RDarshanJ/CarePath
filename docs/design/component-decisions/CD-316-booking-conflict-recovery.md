# CD-316: Booking conflict recovery

- **ID:** CD-316
- **Status:** proposed, pending advisor sign-off. Research date 2026-11-20.
- **Research:** `docs/design/component-research/04-scheduling-calendar.md`, section 7
- **Screen or workflow:** Patient booking and reschedule
- **User segment:** Patient
- **User task:** Recover when a time is taken
- **Business objective:** Do not lose the booking attempt; no false success
- **Alternatives considered:** A inline notice with nearest times; B toast; C modal; D optimistic confirmation then correction
- **Production references and sources:** Feature research F; brief section 14
- **Research evidence and its limits:** Code and prior research (existing flow, 409 codes); scores A 4.85, B 2.40, C 3.25, D 2.60 heuristic. No participant data exists; scores are heuristic.
- **Accessibility considerations:** Alert role, focus to the notice heading, alternatives as buttons, selections retained
- **Clinical and privacy constraints:** No health detail in the notice
- **Interaction complexity:** Low
- **Technical feasibility:** High; built
- **Selected:** A: inline alert at the top of the step with nearest three times
- **Rejected:** B (disappears, cannot carry alternatives); C (interrupts); D (fails the brief on false success)
- **Rationale:** Honest, persistent, actionable
- **Validation method:** UI tests for focus move and alternatives; screen reader announcement; reschedule leaves current visit unchanged
