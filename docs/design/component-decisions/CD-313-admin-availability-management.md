# CD-313: Admin availability management

- **ID:** CD-313
- **Status:** proposed, pending advisor sign-off. Research date 2026-11-20.
- **Research:** `docs/design/component-research/04-scheduling-calendar.md`, section 4
- **Screen or workflow:** Admin availability screen (not built)
- **User segment:** Care coordinator; clinic admin
- **User task:** Add, block and remove bookable times per therapist and judge capacity
- **Business objective:** Published capacity that matches clinic hours; utilisation metric
- **Alternatives considered:** A day-grouped slot list with add form; B week grid editor; C recurring rules; D table with bulk actions
- **Production references and sources:** Zillow https://mobbin.com/screens/ea123c30-5911-46d9-ba35-ed36ef56d09f; HoneyBook https://mobbin.com/screens/b5fed4af-e5a7-457d-9b06-3b596f5b58f1; Sweatpals https://mobbin.com/screens/fac08c36-eef2-4291-839c-df6b256cde54; Square https://mobbin.com/screens/9eba6531-f7ba-44e9-b6c0-07ccf28d85c8; checkpoint C2
- **Research evidence and its limits:** Observed Mobbin screens (non-healthcare); A 4.20 and C 4.15 are within 0.05 and the decision turns on scope and API; B 3.15, D 3.40. No participant data exists; scores are heuristic.
- **Accessibility considerations:** Native form and list, no grid, row actions named with the time; booked rows give the reason Remove is unavailable
- **Clinical and privacy constraints:** Booked slot removal blocked to protect patients; no patient detail beyond a link for staff with access
- **Interaction complexity:** Medium
- **Technical feasibility:** Low until a slot-write API is confirmed; none found in the repository
- **Selected:** A: per-therapist day-grouped slot list with add times form (recurring rules deferred)
- **Rejected:** B (grid cost and accessibility); C (outside C2 scope, needs API; likely next step); D (bulk deferred, preview count required)
- **Rationale:** Meets the C2 scope, accessible by construction, shows booked versus open per day
- **Validation method:** Prototype comparison; overlap rejection and booked-removal tests; permission matrix; keyboard-only add and remove
