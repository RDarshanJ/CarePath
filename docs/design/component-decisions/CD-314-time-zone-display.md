# CD-314: Time zone display

- **ID:** CD-314
- **Status:** proposed, pending advisor sign-off. Research date 2026-11-20.
- **Research:** `docs/design/component-research/04-scheduling-calendar.md`, section 5
- **Screen or workflow:** Patient, clinician and admin visit times
- **User segment:** All roles
- **User task:** Know the time zone of every visit time
- **Business objective:** Fewer missed visits from zone confusion
- **Alternatives considered:** A clinic zone everywhere; B viewer zone with selector; C clinic zone plus viewer local time for video visits; D dual always
- **Production references and sources:** Square https://mobbin.com/screens/9eba6531-f7ba-44e9-b6c0-07ccf28d85c8; incident.io https://mobbin.com/screens/c14089d9-ccea-46c7-a13e-4aae572ea7ce; Calendly https://mobbin.com/screens/d45fd998-e540-49fd-b224-1c2ef7285013; Upwork https://mobbin.com/screens/cc036815-94c4-4081-820e-74c69a4a6e18; Sweatpals https://mobbin.com/screens/fac08c36-eef2-4291-839c-df6b256cde54; Calendly help (prior)
- **Research evidence and its limits:** Observed Mobbin screens; REQ-APT-03 conflicts with code; scores A 3.90, B 2.75, C 4.45, D 3.45 heuristic. No participant data exists; scores are heuristic.
- **Accessibility considerations:** Zone as text in the heading and confirmations; no colour dependency; one formatter
- **Clinical and privacy constraints:** None
- **Interaction complexity:** Low
- **Technical feasibility:** High; advisor sign-off needed for the video case
- **Selected:** C: clinic zone primary, viewer local time added for video visits when the zones differ
- **Rejected:** A kept as fallback; B (wrong clock time for a physical visit); D (noisy)
- **Rationale:** In-person care follows the clinic clock; video needs both
- **Validation method:** Daylight saving test (AC-E5); viewer in another zone; admin row; record header
