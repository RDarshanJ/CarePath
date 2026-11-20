# CarePath product opportunities

Date: 2026-11-19. Author: advisor. Synthetic data only; not for clinical use.

This document selects the strongest opportunities from Phase 1 research. It adds no new sources. Every piece of evidence points to a section of an existing research document, which carries the URLs and access dates.

Short names used below:

- **CA** = `docs/research/competitor-analysis.md`
- **MP** = `docs/research/mobbin-patterns.md`
- **HD** = `docs/research/healthcare-domain.md`
- **JM** = `docs/research/job-market-alignment.md`
- **TP** = `docs/decisions/tooling-probe.md`

## How strong the evidence is

Read every opportunity with these limits in mind.

- No patient, clinician or administrator was interviewed. Every "problem" below is an inference from public material, not a reported need.
- CA read marketing pages, help articles and one App Store listing. "Not found in public sources" means the pages read do not say it. It does not show a competitor lacks the feature (CA, Method and limits).
- MP found no rehabilitation product and no healthcare desktop product on Mobbin. Pain logging is inferred from a cycle-tracking app, and clinician patterns are transfers from non-health tools (MP §1, Known gaps).
- JM sampled 13 postings, several closed. Counts are indicative only (JM, Sample and limits).

Each opportunity is tagged:

- **Observed gap**: a source shows a weakness or a complaint.
- **Absence gap**: nothing was found in the sources read. This is an assumption.
- **Standards-driven**: a primary standard requires or recommends it.
- **Hiring signal**: job postings ask for the skill.

## Summary

| # | Opportunity | Primary user | Evidence type | Scenario that shows it |
|---|---|---|---|---|
| 1 | Evidence-linked AI progress review | Physical therapist | Observed pattern elsewhere, absence gap for progress review, hiring signal | F |
| 2 | "Why did my plan change?" for patients | Patient | Absence gap (assumption) | B |
| 3 | Pain report with a visible handoff and an explained queue item | Patient and therapist | Observed gap in references, observed competitor pattern | C, D |
| 4 | Guided exercise that does not depend on a camera, drag gestures or small text | Patient | Observed complaints, standards-driven | C |
| 5 | Consent the patient can see, change and that the system enforces | Patient | Absence gap, standards-driven | A, F |
| 6 | Always clear who or what is speaking | Patient | Observed gap | E (messaging), assistant |
| 7 | Three roles on one persisted, FHIR-aligned record | All three | Absence gap, hiring signal | B, C, G, H |
| 8 | Isolation and audit as visible product behaviour | Clinic admin | Observed pattern (Medplum), hiring signal | I |
| 9 | Booking that cannot double-book and recovers politely | Patient, coordinator | Observed pattern, design inference | E |

Ranked by how much they separate CarePath from the material reviewed and how provable they are in a demo. Items 1 to 4 are the core story. Items 5 to 9 are supporting proof.

---

## 1. Evidence-linked AI progress review

**User.** Physical therapist reviewing a patient between visits.

**Problem.** A generated summary saves time only if the reviewer can check it quickly. A summary with no visible sources asks the clinician to trust it or to re-read the record, which removes the saving.

**Evidence.**

- Abridge links note text to the matching transcript passage. CA calls it the clearest public example of source-linked verification in the set, and it covers visit documentation, not between-visit progress (CA §5.1; CA matrix row "Source-linked AI verification").
- SPRY flags mismatches and gaps before sign-off and requires the clinician to sign (CA §3.1). Commure's base tier describes no review step (CA §5.2; CA Avoid 3).
- The AI review references on Mobbin approve a whole item at once, show small source chips with unseen behaviour, and none records who approved what (MP §18, Limitations).
- Four of seven design postings ask for human-plus-AI experience design and judgment about safe AI in healthcare (JM, Recurring requirements).

**CarePath response.** Each statement in a progress summary carries references to the check-ins, sessions, messages or appointments it came from. A server-side verifier marks statements with no resolvable reference as unsupported. The clinician opens evidence in a side panel, edits, then approves or rejects. Generation and review are both written to the audit log. The draft is labelled with its provider.

**Demonstrable as.** Scenario F end to end, plus the unsupported-statement rate from the evaluation set of 50 synthetic encounters.

**Honest limits.** CA's gap list mentions "visible confidence". CarePath will not show a numeric confidence score, because the demo provider is rule-based and has no calibrated confidence. It shows three states instead: supported, unsupported, and missing information. Whether evidence links actually speed up review is an assumption. No clinician has used it.

## 2. "Why did my plan change?" for patients

**User.** Patient whose exercises changed after a clinician review.

**Problem.** A plan that changes without explanation may confuse a patient or reduce trust in it. This is an assumption with no user evidence behind it.

**Evidence.**

- A patient-readable explanation of a plan change was not found in any public source reviewed. CA marks this as a gap in public material and not proof of absence (CA, Gaps to exploit 1; also the Gaps lines in CA §1.1, §2.1, §2.2).
- MP proposes that prescribed fields show "Set by your care team" (MP §3, principle 7) and that clinician charts annotate plan changes (MP §9, CarePath C).

**CarePath response.** Publishing a revised plan requires a short plain-language note from the clinician. The system adds a computed list of what was added, removed or changed. The patient sees both on Today, with the clinician's name and date, until dismissed. Version history keeps every note. The explanation is written by the clinician, never generated.

**Demonstrable as.** The cross-role test in Scenario B: publish version 2 as clinician, see the explanation as patient.

**Honest limits.** This is the weakest evidence in the list and the most original idea. It should be presented as a design hypothesis.

## 3. Pain report with a visible handoff and an explained queue item

**User.** Patient reporting discomfort, and the therapist who receives it.

**Problem.** A patient who logs pain does not know whether anyone will see it. A clinician with a long list does not know why an item is on it.

**Evidence.**

- In the symptom-logging references, nothing shows how a logged symptom reaches a clinician (MP §8, Limitations). Neither guided-activity reference has a way to stop for pain (MP §7, Limitations).
- Medbridge GO and PhysiApp collect post-session pain or discomfort (CA §2.1, §2.2; CA Adopt 2). MedBridge's RTM product has alerts that prompt outreach (CA §2.1; CA Adopt 7).
- MP's queue references show state, age and priority but are all non-health tools (MP §16).

**CarePath response.** The pain control is a 0 to 10 set of buttons. After submitting, the patient reads "Your therapist will see this". A report at or above a configured threshold also shows how to contact the clinic and the emergency notice, with no diagnostic wording. On the clinician side the matching review task states the rule that fired, the value, the threshold and a link to the source check-in.

**Demonstrable as.** Scenarios C and D, with the rule explanation asserted in tests.

**Honest limits.** The rules are administrative thresholds set by the clinic. They are not clinical risk prediction and have no clinical validation. The threshold values in the seed are arbitrary demo values.

## 4. Guided exercise that does not depend on a camera, drag gestures or small text

**User.** Patient with limited vision, dexterity, space or technical confidence.

**Problem.** Motion tracking fails in poor conditions, sliders need a dragging movement, and fixed text sizes shut out people who enlarge type.

**Evidence.**

- App Store reviewers of Sword report sensors that fail to track and text that ignores system font settings. These are unverified user reviews (CA §1.2, Accessibility and Gaps; CA Avoid 1).
- Hinge states that motion tracking needs good light and a flat surface (CA §1.1, Onboarding). CA's advice to offer a no-camera path is tagged as an assumption (CA Avoid 5).
- None of the vendor pages read publish accessibility detail (CA matrix row "Accessibility stated"; CA Gaps 4 and 5).
- WCAG 2.2 SC 2.5.7 requires a non-dragging alternative, 2.5.8 sets a 24 px minimum target, 2.4.11 forbids fully hidden focus (HD §8).
- Accessibility appears in a minority of postings, which JM reads as a differentiator. That reading is tagged as an assumption (JM, Interpretation notes).

**CarePath response.** The whole session runs with taps or keyboard: Done, Skip, "Stop, this hurts", a rest timer, text steps for every exercise. Pain input is buttons, not a slider. Type is sized in relative units and layouts are checked at 200 percent zoom. Camera tracking is an optional later experiment and never required.

**Demonstrable as.** Scenario C run by keyboard alone in Playwright, axe results, and a written manual review.

**Honest limits.** Automated checks do not establish WCAG conformance. No assistive-technology user has tested it. Testing covers Chromium only (TP §1), so nothing can be claimed about Safari or VoiceOver.

## 5. Consent the patient can see, change and that the system enforces

**User.** Patient deciding what to allow.

**Problem.** Consent captured once at sign-up and never shown again gives the patient no control.

**Evidence.**

- Public competitor pages mention notices but not in-product controls (CA Gaps 6). This is an absence gap.
- Oura's Counsel setup separates required from optional in words, defaults optional sharing to off and says where to revoke (MP §4).
- FHIR Consent records choices and leaves enforcement to the application (HD §2.2).

**CarePath response.** Onboarding separates the required agreement from optional AI-assisted features. A "Sharing and consent" screen shows each choice, when it changed and where to revoke it. If AI consent is off, summary generation for that patient is refused with a clear reason and the refusal is audited. The clinician sees the consent state.

**Demonstrable as.** Scenario A captures consent; an API test in Scenario F shows the refusal.

**Honest limits.** Only consent types that change system behaviour are built. These controls are not a HIPAA authorisation and make no compliance claim.

## 6. Always clear who or what is speaking

**User.** Patient messaging the care team or asking the navigation assistant.

**Problem.** A patient who cannot tell an automated reply from a clinician's may over-trust the first or wait on the second.

**Evidence.**

- Hinge's pages do not label its assistant as AI (CA §1.1, AI; CA Avoid 2). How a Sword member sees who is talking is not public (CA §1.2, Gaps, assumption).
- In Oura's medical chat the AI-versus-human distinction is only a label (MP §12, Limitations). References show reply-time expectations and a persistent emergency line (MP §12, Strengths).

**CarePath response.** Every message shows the sender's name and role. The assistant lives on a separate screen, is labelled as automated, answers only navigation questions from approved help content and the patient's own plan, and declines clinical questions with a link to message the care team. Messaging shows a typical reply time and "Not monitored for emergencies".

**Demonstrable as.** Messaging tests in Phase 4 and refusal cases in the AI evaluation set.

**Honest limits.** The reply-time text is a fixed clinic setting, not a measured figure.

## 7. Three roles on one persisted, FHIR-aligned record

**User.** Patient, therapist and clinic staff acting on the same data.

**Problem.** Products in this market tend to lead with one side: member programs or clinician software.

**Evidence.**

- CA found no single product that publicly documents patient, clinician and coordinator experiences on shared FHIR data (CA Gaps 3; CA Segmentation). This is an absence gap drawn from marketing pages.
- Medplum models care plans, tasks, scheduling and audit on FHIR resources (CA §6.1).
- HD maps ten internal models to R4 and found the brief's model list lacked Condition (HD §0 item 3, §4).
- Postings ask for multi-role surfaces, end-to-end journeys and backend data modelling (JM, Recurring requirements).

**CarePath response.** One database serves three distinct shells. A plan published by a clinician is what the patient opens. A session the patient completes is what the clinician charts. Admin metrics are SQL over the same rows. The record exports as a FHIR R4 Bundle, and Synthea output can be imported (TP §5).

**Demonstrable as.** Scenarios B, C, G and H.

**Honest limits.** Export is "US Core-aligned shapes". It has not passed the official HL7 validator, which cannot run here (TP §4), and CarePath is not a FHIR server (HD §11 items 5 and 6).

## 8. Isolation and audit as visible product behaviour

**User.** Clinic administrator answering "who saw this record?".

**Problem.** Access control that cannot be inspected has to be taken on trust.

**Evidence.**

- Medplum records each read, write and login as an AuditEvent (CA §6.1; CA Adopt 8). Most other products show nothing public on audit (CA matrix row "Audit/role-based access").
- FHIR AuditEvent guidance says audit records should not be updated or deleted (HD §2.3). HD defines a deny-by-default permission matrix (HD §2.4).
- Four of six engineering postings mention regulated-environment familiarity, usually as preferred (JM, Recurring requirements).

**CarePath response.** A cross-organisation request returns 404 and writes a security event. Record reads, writes, AI generations, reviews, exports and consent changes are audited. Audit rows cannot be updated or deleted at database level. The admin audit viewer filters by actor, patient and event type.

**Demonstrable as.** Scenario I, plus a test that calls every patient-scoped route with a foreign-organisation session.

**Honest limits.** Selected controls only. Not assessed against HIPAA and not described as compliant or ready.

## 9. Booking that cannot double-book and recovers politely

**User.** Patient booking a visit; coordinator managing calendars.

**Problem.** Two people choosing the same slot at the same moment.

**Evidence.**

- Zocdoc shows open slots before commitment (CA §4.1; MP §10). MP's principle that a conflict should offer nearby alternatives is an adaptation, not an observed behaviour (MP §3, principle 9).
- k6 runs in this environment, so a concurrency claim can be measured (TP §2).

**CarePath response.** The database rejects overlapping booked appointments for a practitioner or a patient. A lost race returns a conflict response and the patient sees the nearest open slots with their other choices kept.

**Demonstrable as.** Scenario E and the repeated 50-way concurrency test.

**Honest limits.** A guarantee on one database instance on a two-CPU machine. Not a scale claim.

---

## Considered and not pursued

| Idea | Source | Why not |
|---|---|---|
| Real-time movement feedback | CA §1.1, §1.2 | Competitors lead here with regulated devices and years of work. Optional Phase 9 experiment only, with no correctness claim. |
| RTM billing codes and timers | CA §2.1 | Billing is outside the brief and would need payer rules we cannot verify. |
| Health coach role | Brief §1; JM mapping table | No distinct workflow was found for it in research. Building a fourth shell would thin the other three. |
| Photo attachments in messages | MP §12 | File storage and scanning are a new attack surface for little demo value. |
| SMART on FHIR app launch | HD §7 | CarePath has no third-party clients. HD itself advises against the claim without a tested launch flow. |
| Offline-first sessions | JM, priorities | One posting of thirteen. Session resume after interruption covers the user need. |
| Patient-facing "pain is lower than two weeks ago" sentence | MP §9 | Kept only as a neutral comparison of reported values, labelled patient-reported. It must not read as clinical improvement. |

## Assumptions to test if real users were ever available

1. Patients want an explanation when a plan changes, and read it.
2. Evidence links shorten review time without lowering scrutiny.
3. "Your therapist will see this" raises reporting and does not create an expectation of immediate response.
4. Button-based pain input is at least as fast as a slider for most patients.
5. Patients will find and use consent controls after onboarding.

None of these has been tested. The usability scenarios in the design case study should target them.
