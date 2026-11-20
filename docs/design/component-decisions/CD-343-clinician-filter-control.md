# CD-343: Clinician filter control: select or combobox

- **ID:** CD-343
- **Status:** proposed, pending advisor sign-off. Research date 2026-11-20.
- **Research:** `docs/design/component-research/09-tables-search-filter.md`, section 14
- **Screen or workflow:** Directory filter
- **User segment:** Clinician; coordinator
- **User task:** Filter by clinician
- **Business objective:** Few-click filtering
- **Alternatives considered:** A native select; B searchable combobox; C name chips
- **Production references and sources:** Brief section 7; APG combobox (not retrieved)
- **Research evidence and its limits:** Judgement; scores A 4.05, B 3.50, C 3.00 heuristic; option counts assumed. No participant data exists; scores are heuristic.
- **Accessibility considerations:** Native control has platform behaviour
- **Clinical and privacy constraints:** None
- **Interaction complexity:** Low
- **Technical feasibility:** High
- **Selected:** A: native select; switch to combobox above about 15 options
- **Rejected:** B now (cost, custom keyboard model); C (scales poorly)
- **Rationale:** Native semantics suffice for small lists
- **Validation method:** Revisit with real clinic sizes
