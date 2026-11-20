# CD-330: Clinician directory layout

- **ID:** CD-330
- **Status:** proposed, pending advisor sign-off. Research date 2026-11-20.
- **Research:** `docs/design/component-research/09-tables-search-filter.md`, section 1
- **Screen or workflow:** Clinician /patients
- **User segment:** Therapist; coordinator
- **User task:** Find one patient or a cohort and open the record
- **Business objective:** Faster retrieval; fewer wrong-patient opens
- **Alternatives considered:** A dense table with views and chips; B master-detail; C searchable stacked list
- **Production references and sources:** Stripe https://mobbin.com/screens/3bbdc1d4-e374-424b-93e7-b25ba0cedfec; Mercury https://mobbin.com/screens/5ffa41d6-621d-409d-b2fc-34914afe0458; Meetup https://mobbin.com/screens/c9704a3c-644d-4aba-8780-128aabb8921b; Browserbase https://mobbin.com/screens/7f018244-22df-44fb-832a-4f883773bb49; Calendly https://mobbin.com/screens/a633760b-536f-4387-af06-8056089fa6cc; n8n https://mobbin.com/screens/0874afd0-bcf6-4801-a14c-a601be68cdc8; Carbon data table; APG table; feature research I
- **Research evidence and its limits:** Observed Mobbin screens (non-healthcare); no patient-list screens retrievable for healthcare products; scores A 4.40, B 3.00, C 3.30 heuristic. No participant data exists; scores are heuristic.
- **Accessibility considerations:** Native table, aria-sort, labelled controls, 24 px targets
- **Clinical and privacy constraints:** Minimal columns; no clinical bulk actions; names not in URL
- **Interaction complexity:** Medium
- **Technical feasibility:** High; API supports filters and sort; views are client presets
- **Selected:** A: dense sortable table, views, collapsible filter panel, chips, row menu, peek
- **Rejected:** B (few columns, more PHI on screen, duplicates the record header); C (kept as the stacked layout below 768)
- **Rationale:** Registries with many attributes are compared across columns
- **Validation method:** Prototype comparison (clinician-directory spec); timed find tasks (not run); keyboard-only run
