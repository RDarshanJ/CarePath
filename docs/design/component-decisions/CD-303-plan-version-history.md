# CD-303: Plan version history list

- **ID:** CD-303
- **Status:** proposed, pending advisor sign-off. Research date 2026-11-20.
- **Research:** `docs/design/component-research/03-treatment-planning.md`, section 4
- **Screen or workflow:** Record Plan tab, builder Versions tab, patient plan history
- **User segment:** Clinician; patient (read-only wording)
- **User task:** See what changed between versions, who published, and which version the patient sees
- **Business objective:** Traceability and confidence that a change reached the patient
- **Alternatives considered:** A drawer list with View version; B drawer list with change note and What changed per entry; C side-by-side compare; D table
- **Production references and sources:** Canva https://mobbin.com/screens/5c2fbcfc-a27f-4502-ae1c-879104aa2c42; Plane https://mobbin.com/screens/afc55a5a-4236-4f12-859d-9d38a55bd06d; Base44 https://mobbin.com/screens/6a1aaaf1-2630-4cf0-84f7-04967ddfaa3c; Snowflake https://mobbin.com/screens/4bed8718-0476-4315-9cf6-f7d2d905d040
- **Research evidence and its limits:** Observed Mobbin screens (non-healthcare); scores A 3.35, B 4.20, C 3.30, D 3.30 heuristic. No participant data exists; scores are heuristic.
- **Accessibility considerations:** Entries are a list with text state words; disclosure per entry; view button names the version; drawer focus handling exists
- **Clinical and privacy constraints:** Versions are immutable and append-only; no restore is offered because none exists; author names are visible to staff only
- **Interaction complexity:** Low to medium: one list component replaces `VersionList` and patient history text
- **Technical feasibility:** High: versions endpoints and per-version diff exist
- **Selected:** B: version list with change note, inline PlanDiff disclosure and read-only view
- **Rejected:** A (cannot answer what changed without opening each); C (cost; API diff answers it); D (no gain)
- **Rationale:** Every retrieved example pairs a list with current marker and a changes view; CarePath can do so without restore
- **Validation method:** Axe and state-vocabulary snapshot; walkthrough: find what changed in version 3 in two steps; long diff fixture
