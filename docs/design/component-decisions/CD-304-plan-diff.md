# CD-304: Plan diff component

- **ID:** CD-304
- **Status:** proposed, pending advisor sign-off. Research date 2026-11-20.
- **Research:** `docs/design/component-research/03-treatment-planning.md`, section 5
- **Screen or workflow:** Publish dialog, version history, patient Today and Plan
- **User segment:** Clinician; patient
- **User task:** See which exercises were added, removed or changed
- **Business objective:** One implementation, plain words, no raw keys
- **Alternatives considered:** A shared sentence list with audience prop; B before and after table; C inline highlights in PlanView; D three copies
- **Production references and sources:** Canva https://mobbin.com/screens/5c2fbcfc-a27f-4502-ae1c-879104aa2c42 and Plane https://mobbin.com/screens/afc55a5a-4236-4f12-859d-9d38a55bd06d (highlight changes toggles); Snowflake https://mobbin.com/screens/4bed8718-0476-4315-9cf6-f7d2d905d040 (compare checkbox)
- **Research evidence and its limits:** Code read: three copies, two print raw keys; API diff has field names only and exercises only; scores A 3.85, B 3.30, C 3.10, D 2.50 heuristic. No participant data exists; scores are heuristic.
- **Accessibility considerations:** Words not colour; group labels as text; audience-specific field words
- **Clinical and privacy constraints:** No new data exposed; the clinician note wording differs by audience
- **Interaction complexity:** Low
- **Technical feasibility:** High; API follow-up requested to cover goals, title and plan instructions
- **Selected:** A: one `PlanDiff` with `audience` prop; scope sentence for the clinician audience
- **Rejected:** B (values not in the API diff); C (colour-led, high cost); D (raw keys, inconsistent)
- **Rationale:** Consolidates three copies, removes implementation vocabulary from clinician screens, states the exercises-only scope so an empty diff is not read as no change
- **Validation method:** Unit test: every contract field key has words for both audiences; snapshot at three call sites; axe
