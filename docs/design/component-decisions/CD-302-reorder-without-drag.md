# CD-302: Reordering exercises without drag

- **ID:** CD-302
- **Status:** proposed, pending advisor sign-off. Research date 2026-11-20.
- **Research:** `docs/design/component-research/03-treatment-planning.md`, section 3
- **Screen or workflow:** Plan builder exercise list
- **User segment:** Clinician (care team)
- **User task:** Change the order of exercises in the plan
- **Business objective:** Order drives the patient session; reordering must be quick and safe
- **Alternatives considered:** A move up and down buttons; B select then move controls; C drag handle with keyboard alternative; D position number field
- **Production references and sources:** WCAG 2.2 Understanding 2.5.7 (dragging movements) and its reorder example; WebPT and MedBridge described as drag builders in prior research
- **Research evidence and its limits:** Official WCAG text retrieved; scores A 4.05, B 3.45, C 3.35, D 3.30 heuristic; plan length assumed 3 to 12 items. No participant data exists; scores are heuristic.
- **Accessibility considerations:** Single-pointer alternative required (2.5.7); focus retained on the moved control; live announcement of new position; 24 px target minimum (2.5.8)
- **Clinical and privacy constraints:** No privacy effect; reordering is a draft edit saved by autosave
- **Interaction complexity:** Low: refine an existing control
- **Technical feasibility:** High: built; drag would add a dependency needing advisor approval
- **Selected:** A: visible move up and move down buttons with position text, named buttons and live announcements
- **Rejected:** B (extra tap per move); C (dependency and cost for short lists; allowed later only as an addition); D (form field for a spatial task)
- **Rationale:** Meets 2.5.7 by construction, keeps AC-B8, costs nothing, and the refinements close the matrix gaps (no reason when disabled, no announcement)
- **Validation method:** Keyboard-only reorder of a five-item plan; screen reader pass over announcements; focus retention including at the ends
