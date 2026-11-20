# CD-317: Appointment record component

- **ID:** CD-317
- **Status:** proposed, pending advisor sign-off. Research date 2026-11-20.
- **Research:** `docs/design/component-research/04-scheduling-calendar.md`, section 8
- **Screen or workflow:** Patient list and detail; clinician schedule, record tab, overview
- **User segment:** Patient; clinician; coordinator
- **User task:** Read one visit the same way everywhere
- **Business objective:** One status vocabulary and one formatter
- **Alternatives considered:** A per-app markup; B shared AppointmentRecord with audience and layout variants; C cards; D calendar blocks only
- **Production references and sources:** Calendly list https://mobbin.com/screens/3a2fdf98-1d65-4469-8031-d43b2a64c08a; Sweatpals https://mobbin.com/screens/05e9f0a6-db81-4efa-aa67-1ae733110c67; Fresha table (prior)
- **Research evidence and its limits:** Code read of status maps and wording; scores A 2.90, B 4.40, C 3.00, D 2.45 heuristic. No participant data exists; scores are heuristic.
- **Accessibility considerations:** Tag with words; native list or table; action names carry the date
- **Clinical and privacy constraints:** Reason shown to care team only; never in lists for patients or exports
- **Interaction complexity:** Medium
- **Technical feasibility:** High
- **Selected:** B: AppointmentRecord with one Tag status map and shared wording (Did not attend; Cancelled by you or by the patient)
- **Rejected:** A (inconsistent); C (oversized); D (no calendar to host it)
- **Rationale:** Status in one form; wording agreed once; replacement link after reschedule
- **Validation method:** Wording snapshot across five call sites; axe; every status fixture; content sign-off of wording
