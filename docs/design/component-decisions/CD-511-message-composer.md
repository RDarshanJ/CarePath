# CD-511: message composer

Status: provisional until advisor sign-off. Date: 2026-11-20. Full research and spec: `docs/design/component-research/13-messaging.md`.

| Field | Entry |
|---|---|
| ID | CD-511 |
| Screen or workflow | Patient and staff composers |
| User segment | Patient and clinician |
| User task | Write and send a short message; find urgent guidance |
| Business objective | Fewer misrouted urgent messages [Assumption]; no availability promise |
| Candidate alternatives | A shared composer with label, guided starts, urgent line, sticky on phones (selected); B current composers; C chat input with Enter to send |
| Production references | M12, M13, M16; G-messaging.md G4 (URLs and access date 2026-11-20 are in the source register of the research file) |
| Research evidence | Observed composer pinned under thread. Heuristic A 4.40, B 3.60, C 3.30. Scores are heuristic; no user testing has been run. |
| Accessibility considerations | Visible label, status line for results, sticky bar must not obscure focus (2.4.11 [Prior]) |
| Clinical and privacy constraints | Drafts in memory only, not browser storage (diverges from G13 restore after reload; advisor to rule); no attachments |
| Interaction complexity | Medium |
| Technical feasibility | High |
| Selected | A |
| Rejected | B (Send disabled without reason), C (ineligible for patient app) |
| Decision rationale | Implements G4 with one component; never disables Send for empty |
| Validation method | Banned-word check; on-screen keyboard at 390; draft guard; prototype spec messages-composer-urgent-route.md |
