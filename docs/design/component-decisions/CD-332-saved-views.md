# CD-332: Saved views

- **ID:** CD-332
- **Status:** proposed, pending advisor sign-off. Research date 2026-11-20.
- **Research:** `docs/design/component-research/09-tables-search-filter.md`, section 3
- **Screen or workflow:** Directory and admin list
- **User segment:** Clinician; coordinator
- **User task:** Return to a recurring question in one click
- **Business objective:** Faster cohort work
- **Alternatives considered:** A fixed named views; B personal saved views; C tabs; D none
- **Production references and sources:** Stripe, Calendly, folk, Mercury (Mobbin; research files I and 09)
- **Research evidence and its limits:** Observed Mobbin screens; A 4.40 and B 4.35 within 0.05, API and privacy decide; C 3.15, D 3.10. No participant data exists; scores are heuristic.
- **Accessibility considerations:** Pills as toggle buttons with visible state words; rule line per view
- **Clinical and privacy constraints:** A saved view must never store search text
- **Interaction complexity:** Low for A
- **Technical feasibility:** A high; B blocked on REQ-DIR-02 API
- **Selected:** A: fixed named views as presets of query parameters
- **Rejected:** B (no API; deferred); C (implies separate pages); D (loses the common questions)
- **Rationale:** Delivers the value now without an API
- **Validation method:** Each view returns the intended rows; rule line text review
