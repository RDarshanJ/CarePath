# CD-310: Patient time-slot finding

- **ID:** CD-310
- **Status:** proposed, pending advisor sign-off. Research date 2026-11-20.
- **Research:** `docs/design/component-research/04-scheduling-calendar.md`, section 1
- **Screen or workflow:** Patient /appointments/book and reschedule
- **User segment:** Assigned patient
- **User task:** Find and choose a workable visit time soon
- **Business objective:** Higher booking completion and fuller near-term slots without steering
- **Alternatives considered:** A guided filters then list; B earliest-times shortlist then list; C month calendar plus times; D date strip plus times
- **Production references and sources:** Fresha https://mobbin.com/screens/b79eb06d-9b03-42fa-9b40-0c88f2c97d3a; Swiggy https://mobbin.com/screens/3fef9c41-a18c-4665-8bbc-ea387e375aad; Tripadvisor https://mobbin.com/screens/21632a98-8496-4d51-842f-103cd064d9c4; DoorDash https://mobbin.com/screens/87e4889a-5af4-42dd-8963-b68d2a2eb761; Calendly https://mobbin.com/screens/d45fd998-e540-49fd-b224-1c2ef7285013; Upwork https://mobbin.com/screens/cc036815-94c4-4081-820e-74c69a4a6e18; WAI-ARIA APG date picker dialog; feature research F
- **Research evidence and its limits:** Observed Mobbin screens (non-healthcare booking); no healthcare booking screens retrievable; scores A 3.80, B 4.35, C 2.95, D 3.60 heuristic. No participant data exists; scores are heuristic.
- **Accessibility considerations:** Buttons in DOM order, day headings, full date in the accessible name, no custom grid; calendar would need the APG grid keys and a list alternative
- **Clinical and privacy constraints:** Basis sentence uses availability the patient already gave; reason shown to care team only and said at the field
- **Interaction complexity:** Low: shortlist derived client side
- **Technical feasibility:** High: one slots request per therapist
- **Selected:** B: earliest-times shortlist then day-grouped list behind See all times
- **Rejected:** A kept as the full list; C (no patient calendar to overlay, highest accessibility cost); D (API omits empty days, strip would show gaps; optional later)
- **Rationale:** First good option above the fold with the full list one tap away; no new component
- **Validation method:** Task test with synthetic scenarios (not run); axe; 200 percent zoom; back-navigation state; no-fit fallback
