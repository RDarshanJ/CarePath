# CD-340: Sorting

- **ID:** CD-340
- **Status:** proposed, pending advisor sign-off. Research date 2026-11-20.
- **Research:** `docs/design/component-research/09-tables-search-filter.md`, section 11
- **Screen or workflow:** Tables
- **User segment:** All staff
- **User task:** Reorder rows by an attribute
- **Business objective:** Clear sort state
- **Alternatives considered:** Conventional element: header buttons; Select in stacked layout
- **Production references and sources:** Carbon sorting; APG aria-sort
- **Research evidence and its limits:** Official pages retrieved. No participant data exists; scores are heuristic.
- **Accessibility considerations:** aria-sort on the sorted header only; only API-sortable columns are buttons
- **Clinical and privacy constraints:** None
- **Interaction complexity:** Low
- **Technical feasibility:** High; more sort fields need an API change
- **Selected:** Header buttons for name, status, last activity; Sort by Select when stacked
- **Rejected:** Sortable look on unsortable columns
- **Rationale:** Matches API and standards
- **Validation method:** aria-sort values; announcements; page reset
