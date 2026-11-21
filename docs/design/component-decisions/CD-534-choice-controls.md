# CD-534: choice controls

Status: provisional until advisor sign-off. Date: 2026-11-20. Full research and spec: `docs/design/component-research/17-light-families.md`.

| Field | Entry |
|---|---|
| ID | CD-534 |
| Screen or workflow | Forms, filters, consent |
| User segment | All |
| User task | Choose options |
| Business objective | Fewer errors |
| Candidate alternatives | Documented usage rule; ToggleChip as styled checkbox |
| Production references | S2 GOV.UK select (radios for short lists) (URLs and access date 2026-11-20 are in the source register of the research file) |
| Research evidence | Rule: switch immediate, checkbox form, radio up to six. Scores are heuristic; no user testing has been run. |
| Accessibility considerations | Native semantics; selected shown by fill plus check |
| Clinical and privacy constraints | Consent revoke confirmation decided in family 15 |
| Interaction complexity | Low |
| Technical feasibility | High |
| Selected | Rule plus ToggleChip. ToggleChip is a button with `aria-pressed` (CD-311 wins, DR-004 ruling 6.1), only for filters that take effect at once, in a group with a visible label, selected shown by fill plus check. A choice that is a form value saved on submit (onboarding limitations and availability, plan schedule days) is a `Checkbox` group in a `fieldset`. No chip-styled checkbox is built. |
| Rejected | button aria-pressed chips for form values (narrowed by DR-004 ruling 6.1; for instant filters they stand) |
| Decision rationale | Conventional element |
| Validation method | Group legend and checked-state tests |
| Amended | 2026-11-21 by DR-004 ruling 6.1. |
