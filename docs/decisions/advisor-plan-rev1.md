# CarePath — Advisor Plan, Revision 1

Date: 2026-11-19. Amends `advisor-plan.md` after Phase 1 research and the tooling probe. Where the two differ, this note wins. HD = healthcare-domain, CA = competitor-analysis, MP = mobbin-patterns, TP = tooling-probe.

## 1. Changes to the plan

**Schema (fold into WP 2.3, reviewed at C1).**

- Add `Condition`. Derive `PractitionerRole` and generate `Provenance` at export only (HD §0.3).
- `CarePlanVersion.changeNoteForPatient`, required on publish from version 2. The diff against the prior version is computed.
- Roles: `patient`, `physical_therapist`, `care_coordinator`, `clinic_admin`, plus a `system` actor. Coordinator and admin share one shell with different permissions.
- `Consent` types: `treatment_and_data_use` (required), `ai_assisted_features` (optional, enforced), `motion_tracking` (only with Phase 9).
- `Encounter` only for a visit that happened. Async review is a `ReviewTask`.
- `AuditEvent` rejects UPDATE and DELETE by database trigger, with a test. Hash chain is stretch.
- Notes: `draft → signed`, amendments as new versions.

**FHIR (amends ADR-11, WP 5.4).**

- Pin US Core **6.1.0** in one config constant. HD recommended 9.0.0 but saw three versions served in one day, and Synthea emits 6.1.0 or 7 at most (HD §0.1, §0.2). One version across export and import matters more than the newest label. HD read its mandatory-element lists from 7.0.0 to 9.0.0 pages, so differences against 6.1.0 are unverified.
- Three validation layers: `@medplum/core` `validateResource` for base R4 structure and invariants; CarePath checks for references, allowed targets, organisation boundary, fullUrl uniqueness and required US Core elements; duplicate detection. Approved, exact-pinned: `@medplum/core`, `@medplum/fhirtypes`, and `@medplum/definitions` if the validator needs it. Medplum's coverage is unverified (HD §6.1), so a fixture set of broken resources must fail.
- `meta.profile` is not written, because no profile validation runs.
- One 30-minute attempt to obtain the R4 and US Core packages from another host for an offline HL7 validator run. On failure, record "official validation not performed" (TP §4).
- LOINC 72514-3 for pain, local codes where no LOINC was verified, LOINC notice on the About page (HD §3.3).

**Synthea (reverses the earlier cut).** The jar runs here (TP §5). WP 5.4 adds `pnpm synthea:demo`: generate a small seeded population in a scratch directory and import it. Three small generated bundles are committed as fixtures, with command and seed, so tests need no Java. Import skips resource types outside the allow-list with an itemised report and resolves Synthea's conditional references. The 1,000 patients still come from our generator: Synthea has no confirmed rehab content (HD §9), and the gate must not depend on a 197 MB download.

**Tooling.** Playwright uses system Chrome through `PLAYWRIGHT_CHROME_PATH` (TP §1). Chromium only; "mobile" means a 390 px Chromium viewport. `pnpm bench` fetches k6 to a git-ignored cache, falls back to autocannon, and names the tool used.

**Accessibility specifics (WP 2.5, 3.2, 3.3; HD §8).**

- Pain input is the 0 to 10 radio group already in `packages/ui`. No slider.
- Plan-builder reorder uses move up and move down buttons. No drag anywhere, calendars included (2.5.7).
- `scroll-padding` for the bottom tab bar and sticky headers (2.4.11).
- "Contact care team" in the same place on every patient screen (3.2.6).
- Onboarding and booking never re-ask a stored answer (3.3.7).
- Login allows paste and password managers. Eligibility is a pasteable code, not a puzzle (3.3.8).
- Relative type units, checked at 200 percent zoom (CA §1.2).

**Product additions.**

- Plan-change explanation on patient Today (CA Gaps 1).
- "Your therapist will see this" after a pain report, plus a threshold-based contact-your-clinic notice (MP §8).
- Sender name and role on every message, a typical reply time, a separately labelled assistant (CA Avoid 2, MP §12).
- Patient "Sharing and consent" screen. AI generation is refused without consent (MP §4, HD §2.2).

**Access rule.** Clinicians read any patient in their organisation and write only for their care-team patients. Every record open is audited.

**Honesty rules, amended.** "Synthea was run" only with the logged command, seed and count. FHIR wording: "US Core-aligned shapes, validated by CarePath's defined checks". Never claim SMART on FHIR, a conformant US Core server, or Safari and screen-reader testing.

## 2. Research recommendations not adopted

| Recommendation | Decision | Reason |
|---|---|---|
| OAuth 2.0 with PKCE, SMART-style scopes, MFA (HD §7) | Keep ADR-7 cookie sessions | First-party client only. No scenario needs an authorisation server. |
| Break-glass access (HD §2.4) | Cut | Replaced by the access rule above. |
| `remote_monitoring`, `data_sharing_export` consents (HD §2.2) | Cut | Nothing depends on them. A toggle that changes nothing is a dead control. |
| Photo attachments, AI draft replies, queue snooze (MP §12, §16) | Cut | Outside Scenarios A to I. |
| Sandbox push (HD §6.3) | Stays stretch | Egress is unreliable here. |
| Push notifications (MP §17) | In-app only | No delivery service exists. |

## 3. Brief requirement revisions, with reasons

| Brief | Revision | Reason |
|---|---|---|
| §11 models | Adds `Condition` | §12 requires the mapping and §11 has no source for it. |
| §12, Scenario G "valid FHIR Bundle" | Valid means passing the three layers above | The official validator cannot fetch packages here. |
| §12 Synthea | Feeds the import demo, not the main seed | No rehab entities in Synthea. Gate independence. |
| §1, §3 roles | Four roles in three shells. No coach. | Research found no distinct coach workflow. |
| §4 pain reporting | Buttons, never drag-only | WCAG 2.5.7. |
| §5 plan builder | A revision needs a patient-facing note | Makes "the patient application must reflect the changes" legible. |
| §5 review queue | Patient sees a handoff and contact notice | A logged symptom should end somewhere visible. |
| §6 AI | Needs active AI consent. Only signed notes are exported. | Consent must be enforced to mean anything. Drafts are not records. |
| §2, §14 SMART and OAuth | Researched, not implemented | See section 2. |
| §16 accessibility | Chromium only, manual scope stated | TP §1. |
| §4 reminders | In-app, produced by jobs | No delivery channel in the demo. |

Checkpoints are unchanged.
