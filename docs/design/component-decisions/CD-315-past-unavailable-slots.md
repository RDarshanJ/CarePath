# CD-315: Past and unavailable slots

- **ID:** CD-315
- **Status:** proposed, pending advisor sign-off. Research date 2026-11-20.
- **Research:** `docs/design/component-research/04-scheduling-calendar.md`, section 6
- **Screen or workflow:** Patient booking; staff schedules and availability
- **User segment:** All roles
- **User task:** See only what can be booked; staff see status
- **Business objective:** Less noise for patients, honest capacity for staff
- **Alternatives considered:** A omit for patient and use words for staff; B disabled slots for patient; C count only
- **Production references and sources:** DoorDash https://mobbin.com/screens/87e4889a-5af4-42dd-8963-b68d2a2eb761 (past dates struck through); Upwork https://mobbin.com/screens/cc036815-94c4-4081-820e-74c69a4a6e18 (past muted); Fresha https://mobbin.com/screens/b79eb06d-9b03-42fa-9b40-0c88f2c97d3a (muted dates)
- **Research evidence and its limits:** Observed Mobbin screens; API returns only future open slots; scores A 4.65, B 3.00, C 3.40 heuristic. No participant data exists; scores are heuristic.
- **Accessibility considerations:** Status as words (Open, Booked, Blocked, Earlier today), never colour alone
- **Clinical and privacy constraints:** None
- **Interaction complexity:** Low
- **Technical feasibility:** High
- **Selected:** A: patient list omits unavailable and past slots with a sentence about other days; staff rows show status words
- **Rejected:** B (disabled targets with no action); C (count alone, kept as the sentence)
- **Rationale:** A patient wants one workable time; staff need capacity
- **Validation method:** Slot booked elsewhere while list is open; refresh keeps focus and place
