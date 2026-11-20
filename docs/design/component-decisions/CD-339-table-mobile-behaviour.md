# CD-339: Tables on narrow screens

- **ID:** CD-339
- **Status:** proposed, pending advisor sign-off. Research date 2026-11-20.
- **Research:** `docs/design/component-research/09-tables-search-filter.md`, section 10
- **Screen or workflow:** Directory, admin, queue
- **User segment:** Clinician
- **User task:** Quick lookups on a phone
- **Business objective:** Functional equivalence across widths
- **Alternatives considered:** A scrolling table; B columns drop then stacked list; C cards
- **Production references and sources:** Feature research I; brief section 23
- **Research evidence and its limits:** Prior research and judgement; scores A 2.85, B 3.95, C 2.90 heuristic. No participant data exists; scores are heuristic.
- **Accessibility considerations:** Stacked list keeps order and controls; sort as a Select; 44 px targets
- **Clinical and privacy constraints:** Same minimal columns; detail in peek
- **Interaction complexity:** Medium
- **Technical feasibility:** High
- **Selected:** B: columns drop at 1024 and 768; below 768 a stacked row list with the same filters and sort
- **Rejected:** A (poor, scroll region); C (oversized)
- **Rationale:** Same controls at every width
- **Validation method:** Captures at 375 to 1920; 200 percent zoom; reading order
