# CD-331: Filter pattern

- **ID:** CD-331
- **Status:** proposed, pending advisor sign-off. Research date 2026-11-20.
- **Research:** `docs/design/component-research/09-tables-search-filter.md`, section 2
- **Screen or workflow:** Directory, queue, library, admin list
- **User segment:** Clinician; coordinator
- **User task:** Narrow a list by several attributes
- **Business objective:** Keep the table in view
- **Alternatives considered:** A always-visible bar; B views plus inline panel plus chips; C chip popovers; D drawer
- **Production references and sources:** Mercury, Meetup, Browserbase, Calendly Contacts, Stripe (Mobbin ids in the research file); Carbon toolbar guidance; GOV.UK pagination page on filter and sort
- **Research evidence and its limits:** Observed Mobbin and official pages; scores A 3.80, B 4.50, C 3.75, D 3.10 heuristic. No participant data exists; scores are heuristic.
- **Accessibility considerations:** Native selects, disclosure with aria-expanded, chip removal named and announced
- **Clinical and privacy constraints:** No saved search text; chips echo filter values only
- **Interaction complexity:** Medium: one FilterBar replaces five variants
- **Technical feasibility:** High
- **Selected:** B: one FilterBar with views, inline panel of native selects and removable chips
- **Rejected:** A (six controls always on screen); C (cost and risk, never used Popover); D (hides results while filtering)
- **Rationale:** Common cohorts in one click, rare combinations a few, results always visible
- **Validation method:** Axe; chip removal focus; reset behaviour; URL round trip
