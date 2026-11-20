# CD-336: Result counts and empty results

- **ID:** CD-336
- **Status:** proposed, pending advisor sign-off. Research date 2026-11-20.
- **Research:** `docs/design/component-research/09-tables-search-filter.md`, section 7
- **Screen or workflow:** All lists
- **User segment:** All staff
- **User task:** Know how many results and why none
- **Business objective:** Fewer dead ends
- **Alternatives considered:** Conventional elements: reuse; no invented alternatives
- **Production references and sources:** Mobbin footers (Stripe, Browserbase, Calendly); feature research I states
- **Research evidence and its limits:** Code and prior research; observed Mobbin footers. No participant data exists; scores are heuristic.
- **Accessibility considerations:** Counts as text; polite status; empty variants distinct
- **Clinical and privacy constraints:** Search term echoed on screen only, never in URL or title
- **Interaction complexity:** Low
- **Technical feasibility:** High
- **Selected:** Text counts; distinct no-data, filtered-empty, search-empty and closed-queue states; one EmptyState
- **Rejected:** Count badges
- **Rationale:** Plain text is clearest and accessible
- **Validation method:** Each empty variant; offline; error with retained rows
