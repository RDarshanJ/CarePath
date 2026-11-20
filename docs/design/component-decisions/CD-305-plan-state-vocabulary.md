# CD-305: Draft, published and updated plan states

- **ID:** CD-305
- **Status:** proposed, pending advisor sign-off. Research date 2026-11-20.
- **Research:** `docs/design/component-research/03-treatment-planning.md`, section 6
- **Screen or workflow:** Builder header, record Plan tab, directory plan column, patient plan
- **User segment:** Clinician; coordinator; patient
- **User task:** Know what the patient sees and whether unpublished work exists
- **Business objective:** Prevent believing a change was sent when it was not
- **Alternatives considered:** A state sentence plus Tag; B StatusChip only; C banner only; D header sentence only
- **Production references and sources:** Canva https://mobbin.com/screens/5c2fbcfc-a27f-4502-ae1c-879104aa2c42; Base44 https://mobbin.com/screens/6a1aaaf1-2630-4cf0-84f7-04967ddfaa3c; Plane https://mobbin.com/screens/afc55a5a-4236-4f12-859d-9d38a55bd06d; feature research K
- **Research evidence and its limits:** Observed Mobbin screens show short text labels beside entries; code shows the slot alternating chip, tag and text; scores A 4.45, B 3.20, C 3.25, D 2.90 heuristic. No participant data exists; scores are heuristic.
- **Accessibility considerations:** Text states, never colour alone; one `Tag` form for an administrative status
- **Clinical and privacy constraints:** Draft is clinician-only; the patient never sees draft words
- **Interaction complexity:** Low
- **Technical feasibility:** High; counts come from existing diff data; Archived is not in the data model and is not designed
- **Selected:** A: `PlanStateLine` with words Draft, Published version N, Draft differs from version N, Earlier version
- **Rejected:** B (alternating forms); C (disappears when needed as baseline); D (fails K safety condition)
- **Rationale:** Persistent, textual, one component, one vocabulary across five screens
- **Validation method:** Vocabulary snapshot across directory, record, builder and patient plan; recall test of draft versus published (not run); axe
