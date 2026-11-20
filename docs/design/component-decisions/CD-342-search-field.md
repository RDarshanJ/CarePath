# CD-342: Search field

- **ID:** CD-342
- **Status:** proposed, pending advisor sign-off. Research date 2026-11-20.
- **Research:** `docs/design/component-research/09-tables-search-filter.md`, section 13
- **Screen or workflow:** Directory and admin list
- **User segment:** Clinician; coordinator
- **User task:** Find one patient by name or MRN
- **Business objective:** Quick exact retrieval without extra PHI exposure
- **Alternatives considered:** A labelled search with debounced submit; B autocomplete; C recent searches; D command palette
- **Production references and sources:** Stripe, Calendly, Meetup search fields (Mobbin); WebPT quick search (prior)
- **Research evidence and its limits:** Observed Mobbin screens; scores A 4.30, B 3.35, C 3.15, D 3.10 heuristic. No participant data exists; scores are heuristic.
- **Accessibility considerations:** Visible label, clear button, polite result count, slash shortcut
- **Clinical and privacy constraints:** No suggestions or recent searches (PHI); no q in URL
- **Interaction complexity:** Low
- **Technical feasibility:** High; no suggest endpoint exists
- **Selected:** A: labelled search field with debounce and no suggestions
- **Rejected:** B (API and privacy); C (stored names); D (outside family)
- **Rationale:** Exact retrieval with no PHI side channels
- **Validation method:** Label present; debounce; URL has no q
