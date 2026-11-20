# CD-334: Pagination model by list type

- **ID:** CD-334
- **Status:** proposed, pending advisor sign-off. Research date 2026-11-20.
- **Research:** `docs/design/component-research/09-tables-search-filter.md`, section 5
- **Screen or workflow:** Directory, admin, tables and feeds
- **User segment:** Clinician; coordinator
- **User task:** Move through more rows than one page holds
- **Business objective:** Keep place; predictable loading
- **Alternatives considered:** A previous and next with range; B numbered pages; C load more; D infinite scroll
- **Production references and sources:** GOV.UK, NHS, USWDS, CMS, Atlassian and Carbon pagination pages; Browserbase, Calendly, n8n, Stripe footers (Mobbin)
- **Research evidence and its limits:** Observed official pages; tables A 4.30, B 4.10, C 3.35, D 2.40; feeds A 3.25, B 2.80, C 4.30, D 2.40 heuristic; Baymard and NN/g pages not retrievable. No participant data exists; scores are heuristic.
- **Accessibility considerations:** Nav landmark with label; focus to the table caption after page change; D fails keyboard gate
- **Clinical and privacy constraints:** None
- **Interaction complexity:** Low
- **Technical feasibility:** A high; B not feasible with a cursor API
- **Selected:** TablePagination (A) for comparison tables; LoadMore (C) for feeds
- **Rejected:** B (needs API change); D (keyboard and end-of-list problems)
- **Rationale:** Position and comparison matter in tables; feeds are worked top down
- **Validation method:** Cursor edge cases; focus after change; axe
