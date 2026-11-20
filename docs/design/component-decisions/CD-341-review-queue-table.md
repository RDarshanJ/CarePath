# CD-341: Review queue table behaviour

- **ID:** CD-341
- **Status:** proposed, pending advisor sign-off. Research date 2026-11-20.
- **Research:** `docs/design/component-research/09-tables-search-filter.md`, section 12
- **Screen or workflow:** Clinician /review-queue
- **User segment:** Therapist
- **User task:** Work through review tasks
- **Business objective:** Safe queue handling
- **Alternatives considered:** Model settled by feature research L; component-level fixes only
- **Production references and sources:** Feature research L; matrix A3
- **Research evidence and its limits:** Code and prior research. No participant data exists; scores are heuristic.
- **Accessibility considerations:** Visible wrapped text; segmented control; Tr header; roving arrow keys retained
- **Clinical and privacy constraints:** No implied risk score
- **Interaction complexity:** Low
- **Technical feasibility:** High
- **Selected:** Table with detail pane retained; fix truncation, Show select and header
- **Rejected:** title truncation; two-option select
- **Rationale:** Fixes inaccessible `title` text and a two-state switch behind a dropdown
- **Validation method:** Axe; keyboard flow; truncated fixtures
