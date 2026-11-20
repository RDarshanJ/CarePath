# CD-312: Clinician day schedule

- **ID:** CD-312
- **Status:** proposed, pending advisor sign-off. Research date 2026-11-20.
- **Research:** `docs/design/component-research/04-scheduling-calendar.md`, section 3
- **Screen or workflow:** Clinician /schedule and overview visits
- **User segment:** Physical therapist
- **User task:** Understand the working day, patient context and open time
- **Business objective:** Utilisation and a calm view of the day
- **Alternatives considered:** A day agenda list; B agenda with open-time rows and seven-day count strip; C day timeline; D week grid
- **Production references and sources:** Square https://mobbin.com/screens/9eba6531-f7ba-44e9-b6c0-07ccf28d85c8; Calendly https://mobbin.com/screens/3a2fdf98-1d65-4469-8031-d43b2a64c08a; Sweatpals https://mobbin.com/screens/05e9f0a6-db81-4efa-aa67-1ae733110c67; incident.io https://mobbin.com/screens/c14089d9-ccea-46c7-a13e-4aae572ea7ce; Carbon data table; APG table; checkpoint C2 section 6.4
- **Research evidence and its limits:** Observed Mobbin screens (non-healthcare); prior ruling no grid and no drag respected; scores A 4.05, B 4.50, C 3.65, D 2.80 heuristic. No participant data exists; scores are heuristic.
- **Accessibility considerations:** Native table, labelled day buttons, gap rows spoken as Open, stacked list below 600
- **Clinical and privacy constraints:** Patient name visible in rows; the date is in the URL and patient names are not
- **Interaction complexity:** Medium: gap rows and strip
- **Technical feasibility:** Medium: open slots for the day and a 7-day read must be confirmed; past open slots of today are not returned
- **Selected:** B: agenda list with open-time rows and a seven-day count strip
- **Rejected:** A kept as the base; C (hides short visits, no task the agenda fails at; kept as Approach 2 in the prototype spec); D (outside C2, fails cost and accessibility)
- **Rationale:** Answers where free time is and how heavy a day is without a grid
- **Validation method:** Prototype comparison (appointment-availability spec); axe; day fixtures; daylight saving day (AC-E5)
