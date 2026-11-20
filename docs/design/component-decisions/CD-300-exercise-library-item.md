# CD-300: Exercise library item and shared exercise row

- **ID:** CD-300
- **Status:** proposed, pending advisor sign-off. Research date 2026-11-20.
- **Research:** `docs/design/component-research/03-treatment-planning.md`, section 1
- **Screen or workflow:** Plan builder library; patient /plan and /session; clinician PlanView and record Plan tab
- **User segment:** Clinician (care team); patient (read)
- **User task:** Recognise and choose an exercise; read what to do today
- **Business objective:** One exercise component instead of five layouts; faster recognition
- **Alternatives considered:** A image-led cards; B compact row with thumbnail and detail on demand; C grouped by body area; D text-only row
- **Production references and sources:** Ladder https://mobbin.com/screens/810c58c9-f341-43e9-940f-f7cdeab886e8; ClassPass https://mobbin.com/screens/62735254-bd6d-4ae0-85e0-d447283a6dc2; WHOOP https://mobbin.com/screens/462a8456-5fc1-4e58-95c1-d7b175038677; Nike Training Club https://mobbin.com/screens/f7ff8832-fee3-4b01-bd7e-e371713845de; Calm https://mobbin.com/screens/e7f23c18-2d4b-40da-8671-6169f0020762; Carbon data table usage
- **Research evidence and its limits:** Observed Mobbin screens (fitness iOS); no healthcare exercise-library screens retrievable; scores heuristic (A 2.90, B 4.00, C 3.20, D 3.25). No participant data exists; scores are heuristic.
- **Accessibility considerations:** Name, body area and dose in text; thumbnail decorative; targets 24 px minimum (44 px patient); no `title` truncation; disclosure with aria-expanded
- **Clinical and privacy constraints:** Exercise content is fictional and not medically reviewed; content notice stays with exercise content; no PHI in the component
- **Interaction complexity:** Low to medium: replaces five layouts with one component and four variants
- **Technical feasibility:** High: all data exists in `Exercise` and the draft item
- **Selected:** B: compact row `ExerciseSummary` with variants library, plan, editor, session-overview
- **Rejected:** A (slow to scan lists, height); C (conflicts with name-sorted cursor paging); D (kept as no-media fallback)
- **Rationale:** Recognition needs a picture and text together; scanning a list of repeated records favours rows (brief section 9); grouping cannot work across cursor pages
- **Validation method:** Timed find-and-add task with PTs (not run); visual regression across the five replaced layouts; axe per variant; long-name and no-media fixtures
