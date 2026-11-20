# CD-335: Load-more component

- **ID:** CD-335
- **Status:** proposed, pending advisor sign-off. Research date 2026-11-20.
- **Research:** `docs/design/component-research/09-tables-search-filter.md`, section 6
- **Screen or workflow:** Queue, library, record tabs, thread, appointments
- **User segment:** Clinician; patient
- **User task:** Reveal more items in a feed
- **Business objective:** Consistent behaviour and wording
- **Alternatives considered:** Conventional element: one shared button pattern; no invented alternatives
- **Production references and sources:** Calendly list with View more meetings https://mobbin.com/screens/3a2fdf98-1d65-4469-8031-d43b2a64c08a; code read of five variants
- **Research evidence and its limits:** Observed Mobbin screen; no design-system page documents the pattern. No participant data exists; scores are heuristic.
- **Accessibility considerations:** Focus to first new item, polite count, inline error with retry, text end state
- **Clinical and privacy constraints:** None
- **Interaction complexity:** Low
- **Technical feasibility:** High
- **Selected:** One LoadMore: secondary medium button, direction in the label, count line
- **Rejected:** Five variants
- **Rationale:** One behaviour and one look
- **Validation method:** Focus, status, error retry and end state tests
