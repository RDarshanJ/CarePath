# CD-510: message thread

Status: provisional until advisor sign-off. Date: 2026-11-20. Full research and spec: `docs/design/component-research/13-messaging.md`.

| Field | Entry |
|---|---|
| ID | CD-510 |
| Screen or workflow | /messages/[id], /inbox |
| User segment | Patient and clinician |
| User task | Read, see who wrote and when, recover from failure |
| Business objective | One tested component; routine questions resolved in messages |
| Candidate alternatives | A one shared MessageThread (selected); B two implementations (current); C chat bubbles with status by colour and alignment |
| Production references | M12 to M16 (Mobbin web); G-messaging.md prior references (URLs and access date 2026-11-20 are in the source register of the research file) |
| Research evidence | Observed: sender and time per message (M14). Healthcare messaging screens not accessed. Heuristic A 4.70, B 3.45, C 2.90. Scores are heuristic; no user testing has been run. |
| Accessibility considerations | role=log with name; text-keyed states; failed 2 px border plus words; new messages announced politely |
| Clinical and privacy constraints | Message content never in titles, URLs or notifications; sender name and role on every message |
| Interaction complexity | Medium: merge two files |
| Technical feasibility | High |
| Selected | A |
| Rejected | B, C (ineligible: colour and alignment only) |
| Decision rationale | Removes divergence already present in border weight, retry wording and toasts |
| Validation method | Component state matrix; axe; screen-reader pass; Playwright 390 and 1440 |
