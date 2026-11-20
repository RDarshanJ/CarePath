# CD-338: Table semantics and keyboard model

- **ID:** CD-338
- **Status:** proposed, pending advisor sign-off. Research date 2026-11-20.
- **Research:** `docs/design/component-research/09-tables-search-filter.md`, section 9
- **Screen or workflow:** All tables
- **User segment:** All staff
- **User task:** Navigate tables by keyboard and screen reader
- **Business objective:** Consistency and maintainability
- **Alternatives considered:** Conventional element: native table; ARIA grid considered and not adopted
- **Production references and sources:** WAI-ARIA APG table pattern
- **Research evidence and its limits:** Official text retrieved. No participant data exists; scores are heuristic.
- **Accessibility considerations:** Native table, caption, th scope; arrow enhancement never the only path
- **Clinical and privacy constraints:** None
- **Interaction complexity:** Low
- **Technical feasibility:** High
- **Selected:** Native table with one Tr header; slash and arrow enhancements kept
- **Rejected:** ARIA grid (cost, little saving at 25 rows)
- **Rationale:** Table semantics are enough for read and link tasks
- **Validation method:** Tab sequence length; arrow enhancement; screen reader table commands
