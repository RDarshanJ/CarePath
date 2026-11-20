# CD-337: Row actions

- **ID:** CD-337
- **Status:** proposed, pending advisor sign-off. Research date 2026-11-20.
- **Research:** `docs/design/component-research/09-tables-search-filter.md`, section 8
- **Screen or workflow:** Directory and tables
- **User segment:** Clinician; coordinator
- **User task:** Open a patient and jump to a plan or visits
- **Business objective:** Fewer clicks without hidden primary action
- **Alternatives considered:** A primary link only; B link plus overflow menu; C inline text links; D whole-row click only
- **Production references and sources:** Carbon data table row actions; Stripe, Notion, Linear row menus (prior); WCAG 2.5.8
- **Research evidence and its limits:** Observed Carbon page; scores A 3.80, B 3.95, C 3.45, D 2.60 heuristic; deviation from the Carbon fewer-than-three rule recorded. No participant data exists; scores are heuristic.
- **Accessibility considerations:** D fails (mouse-only); menu keyboard from Radix; disabled item with visible reason
- **Clinical and privacy constraints:** No bulk actions on clinical items; names not in the URL
- **Interaction complexity:** Medium: first use of DropdownMenu
- **Technical feasibility:** High
- **Selected:** B: patient name link plus one Actions menu of deep links
- **Rejected:** A (second click inside record); C (200 extra tab stops); D (inaccessible)
- **Rationale:** One tab stop per row; primary action stays visible
- **Validation method:** Keyboard open and close; disabled reason; touch
