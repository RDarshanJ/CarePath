# CD-311: Slot button and toggle chip

- **ID:** CD-311
- **Status:** proposed, pending advisor sign-off. Research date 2026-11-20.
- **Research:** `docs/design/component-research/04-scheduling-calendar.md`, section 2
- **Screen or workflow:** Patient booking flow
- **User segment:** Patient
- **User task:** Choose one time; toggle day and time-of-day filters
- **Business objective:** Replace five hand-built class sets with shared components
- **Alternatives considered:** A hand-built chips; B shared SlotButton and ToggleChip; C radio group of times; D one component for both
- **Production references and sources:** Calendly https://mobbin.com/screens/d45fd998-e540-49fd-b224-1c2ef7285013; Upwork https://mobbin.com/screens/cc036815-94c4-4081-820e-74c69a4a6e18; iOS pill grids (Swiggy, Tripadvisor); APG table page (native semantics preferred)
- **Research evidence and its limits:** Code read (`booking-flow.tsx:86-89` and four more places); scores A 3.20, B 4.05, C 3.45, D 3.15 heuristic. No participant data exists; scores are heuristic.
- **Accessibility considerations:** Slot is an action button with full date in the accessible name; toggle uses aria-pressed; 44 px patient, 24 px minimum clinician; Selected shown in text
- **Clinical and privacy constraints:** None
- **Interaction complexity:** Low
- **Technical feasibility:** High
- **Selected:** B: SlotButton (action) and ToggleChip (aria-pressed) in `ui`
- **Rejected:** A (duplicates, no selected state); C (confirm is a separate step); D (mixes action and toggle semantics)
- **Rationale:** Different jobs need different semantics; one shared implementation of each
- **Validation method:** Axe; focus ring contrast in both themes; target size checks; screen reader pass
