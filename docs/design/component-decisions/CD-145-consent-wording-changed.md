# CD-145: Consent wording changed

Status: proposed, provisional until advisor sign-off. Accessed 2026-11-20. Research: `docs/design/component-research/15-consent-controls.md`. Scores are heuristic, not measurements; no user research was run.

| Field | Value |
|---|---|
| ID | CD-145 |
| Screen or workflow | /consent, onboarding |
| User segment | Patient |
| User task | Read new wording |
| Business objective | Valid consent over time |
| Candidate alternatives | Conventional state; silent reuse and auto revoke rejected |
| Production references | consents.ts textVersion; feature research A |
| Research evidence | Contract read |
| Accessibility considerations | Banner with action; not colour alone |
| Clinical and privacy constraints | Clinic behaviour while stale undefined [U] |
| Interaction complexity | Low |
| Technical feasibility | High |
| Selected alternative | Info banner with Read the new wording; no auto revoke |
| Rejected alternatives | Silent reuse; auto revoke |
| Decision rationale | Keeps the patient informed without cutting care |
| Validation method | Version mismatch test |
