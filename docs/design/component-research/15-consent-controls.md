# Family 15: Consent and privacy controls

Status: provisional until the advisor signs off. Access date for every external source: 2026-11-20. Protocol: `component-research/PROTOCOL.md`. Source brief: `docs/COMPONENT-BRIEF.md` §11, §14, §16, §19, §21, §22. Decision records: CD-140 to CD-146 in `docs/design/component-decisions/`.

CarePath is a portfolio demonstration. Nothing here claims legal or regulatory compliance, and no copy may imply that these controls make the product HIPAA, GDPR or otherwise compliant (project constraint, [Prior] `docs/research/mobbin-patterns.md` §4). Statutes and regulations are cited only as design reference where I actually retrieved them. Scores are heuristic judgements by the author; no user research was run.

Evidence labels: **[Observed]** retrieved and read today; **[Code]** read in the repository today; **[Prior]** earlier CarePath file, not re-retrieved; **[Assumption]**; **[Not retrieved]**.

## 0. What the code does today [Code]

| Item | Fact |
|---|---|
| Contract | `consents.ts`: three types. `treatment_and_data_use` (required) and `ai_assisted_features` (optional, off until granted) are grantable; `motion_tracking` is not grantable this phase. The required consent is withdrawn through the clinic, not by the patient (advisor decision Q4). A grant must name the current `textVersion` (a mismatch is a 400). History is every consent row, newest first, with `grantedAt`, `revokedAt`, `textVersion`. |
| `/consent` page (`consent-manager.tsx`) | Bordered list of three entries: title, "Required" or "Optional", summary, three detail bullets. Required: text "On. Agreed {date}" or "Not agreed", plus "To withdraw, contact your clinic on {phone}". Optional: a `Switch` labelled "Allow automated drafting tools" with hint "On since {date}. Switch off to stop it." or "Off. Switch on to allow it."; the change is sent immediately; a polite status line says "Automated drafting tools are now on/off"; failure shows a Banner "Not saved" and the choice reverts. Not grantable: text "Off. Not available yet." History table: Choice, Result ("Turned off" or "Agreed"), When. |
| Onboarding consent step (`onboarding-flow.tsx` ~960 to 1040) | Required: a checkbox "I agree to treatment and data use as described above." Optional: the same `Switch` with hint "Off unless you turn it on." The switch value is saved when the patient presses Next, not at once. Camera tracking: dashed box, text only. Footer line: choices can be changed at any time in Sharing and consent; consent text version shown. |
| Copy (`consent-copy.ts`) | One shared source for both screens. The optional feature is named "Automated drafting tools"; the design-system component calls generated content "generated" (matrix §C8). |

Findings: (1) the same `Switch` means "applies now" on `/consent` and "applies when I press Next" in onboarding. (2) A switch labelled "Allow ..." reads as "Allow ... switch on", and the on/off wording sits beside a legal-style permission. (3) Withdrawal of the required consent is a phone instruction with no in-app action. (4) The history table shows "Turned off" but not the wording version. (5) No state exists for "wording changed since you agreed" on `/consent` (feature A lists it for onboarding only).

## 1. Sources used in this file

| Source | URL | What it says (paraphrased) |
|---|---|---|
| GDPR Article 7, Conditions for consent | https://gdpr-info.eu/art-7-gdpr/ | The controller must be able to show consent was given; a request inside a longer document must be clearly separated and in plain language; the person can withdraw at any time, must be told so before consenting, and withdrawing must be as easy as giving it; consent is not free if a service is made conditional on processing it does not need. Reference only: CarePath is a US-style demonstration and makes no GDPR claim. |
| Carbon, Toggle usage | https://carbondesignsystem.com/components/toggle/usage/ | Toggles are for binary settings that take effect at once and can be reversed without confirmation; avoid them where the action needs confirmation or feedback; a checkbox plus a button is for deferred or non-binary changes. |
| WAI-ARIA APG, Switch | https://www.w3.org/WAI/ARIA/apg/patterns/switch/ | A switch is an on/off input with no mixed state; Space toggles; its label should not change when the state changes; use a checkbox when the item belongs to a list of criteria and a toggle button for an action; link supporting text with `aria-describedby`. |
| GOV.UK, Checkboxes and Radios | https://design-system.service.gov.uk/components/checkboxes/ ; https://design-system.service.gov.uk/components/radios/ | Do not preselect options; checkbox for one on/off option inside a form; group in a fieldset with a legend; specific error wording. |
| WCAG 2.2 SC 4.1.3 Status Messages | https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html | A result such as "saved" that appears without a focus change needs `role="status"` or a live region; errors may use `role="alert"`. |
| Mobbin consent and data-sharing screens (iOS) | Bevel https://mobbin.com/screens/5d04a898-c32a-4900-acbd-7feea73af16b ; Swiggy https://mobbin.com/screens/05265bdd-b85a-4594-96d4-a2db7d1b7f6d ; Google Health (Fitbit) https://mobbin.com/screens/33c172f0-f73b-459e-a71b-21516a31d1df ; Perplexity https://mobbin.com/screens/4597c7ea-99cf-40b1-81fa-9b0546b885db ; Structured https://mobbin.com/screens/fd506bc7-2c02-4ba0-ab7c-85f42d286c8e ; Claude https://mobbin.com/screens/1c9fbd84-3e16-410b-ac22-0b8a50a401dd | [Observed] Bevel: a toggle row for one data type under "Opt in", on, with a line that it can be readjusted later in Settings. Swiggy: a toggle (off) for sharing name and phone, with three plain bullets, one of which says shared contact details cannot be withdrawn, plus a terms line. Google Health: an OS permission sheet with a toggle per data type (off), "Turn On All", and equal "Allow" and "Don't Allow" buttons. Perplexity Health: three short bullets (what is protected, never sold, can be disconnected or deleted at any time) and one "I consent" button above a privacy-policy line. Structured: a "Your Privacy and Data" sheet listing data types, FAQ rows ("How long is my data stored?"), and a muted "Accept Terms" button. Claude: a Privacy screen with one toggle ("Help improve our AI models") on, and a "Learn more" link. Only Google Health and Perplexity touch health data; none is a rehab or care-team product. |
| Prior research | `docs/research/mobbin-patterns.md` §4 (Oura/Counsel, Fitbit research consent, Apple Health, Headspace, Google Health) | [Prior] Oura/Counsel separates an optional toggle from a required agreement; Fitbit's optional research consent has equal "No thanks" and "Agree and continue" buttons; Apple Health spreads granular controls over many screens; recommendation to say where consent is revoked when it is granted and to log changes. Not re-retrieved today. |
| Feature research | `feature-research/A-onboarding.md`, `M-ai-summaries.md` | A: required and optional consent separate and worded; stale-wording state. M: a draft needs active `ai_assisted_features` consent; a refusal is audited; copy "AI-assisted features are off for this patient." |

Not retrieved: HHS HIPAA authorization guidance and 45 CFR 164.508 (both fetches failed or were disallowed), so no statement here depends on what HIPAA says about revocation; ICO consent guidance; NHS national data opt-out; Apple HIG and Material switch pages (JavaScript-only); any CMS or DHCW consent component. The advisor's Q4 decision is the only authority used for who may withdraw the required consent.

## 2. Decisions

Weights adjusted for this family: task effectiveness 20, accessibility and usability 25, error prevention and trust 30 (up from 20), business and operational value 10, interaction efficiency 10, implementation cost 5. Reason: a consent control exists to record an informed, reversible choice; trust and clarity weigh most and speed least. Scores are heuristic.

---

### CD-140. Optional consent: switch or explicit action

**1. Task and journey.** A patient who already agreed to the required terms decides whether the optional automated drafting tools may use their records, and later changes their mind. Reached from the footer link "Sharing and consent" and from the Today screen when the state needs review. Needs: what the choice is, what it does and does not do, the current state and since when, how to change it, proof that the change was recorded. Action: allow, or stop allowing.

**2. Business and operational requirement.** The clinic's AI-assisted drafting needs an active consent (AC-F5); a refusal is audited. Changes must be logged with a timestamp and wording version. The choice must be as easy to undo as to make. Healthcare and privacy constraint: no pressure, no default-on, equal prominence for yes and no, no claim of legal status, no promise about what happens to data already processed unless the product confirms it [U].

**3. Production examples.** See §1: Bevel, Swiggy, Claude (toggle rows, state visible, change at once); Google Health (equal Allow and Don't Allow buttons per request); Perplexity (one consent button with bullets); Structured (sheet with FAQ rows). [Observed] Toggles are common for optional data use; the explicit button appears at the moment of first consent. [Prior] Fitbit equal buttons; Oura separate optional toggle. Observation: Swiggy states in bullets what cannot be undone, which is the information a revoke control most needs; none of the toggle screens showed a result confirmation or history in the frame.

**4. Guidance.** Carbon: toggles only where the change applies at once and needs no confirmation. APG: switch for on/off; label must not change with state. GDPR Art. 7(3) (reference): withdrawing as easy as giving; person told beforehand. WCAG 4.1.3: the result needs a status announcement. NN/g, Baymard and healthcare design-system pages on consent were [Not retrieved].

**5. Alternatives (structurally different).** A: switch, immediate (current `/consent`). B: status line plus one explicit button that names the action (Allow / Stop allowing), immediate, symmetric, with a persistent result message and a history row. C: explicit button that opens a confirmation dialog for both directions. D: checkbox in a form with a Save button.

**6. Gates.**

| Gate | A switch | B button | C button + dialog | D checkbox + Save |
|---|---|---|---|---|
| Accessibility (keyboard, name, status not by colour alone, 48 px) | Pass | Pass | Pass (dialog focus rules per CD-120) | Pass |
| Privacy (no default-on, equal ease, state and date visible, change logged) | Pass with hint text; the switch shape implies "settings", not a recorded permission | Pass | Pass | Pass |
| Safety / trust (state is unambiguous; effect stated; reversible in one step) | Conditional: the on/off word beside "Allow" is ambiguous | Pass | Pass, but adds a step to withdrawing | Conditional: nothing happens until Save, easy to leave without saving |

No option fails outright; A and D are conditional.

**7. Weighted evaluation (family weights).**

| Criterion | A switch | B button | C button + dialog | D checkbox + Save |
|---|---|---|---|---|
| Task effectiveness (20) | 3 | 4 | 4 | 3 |
| Accessibility and usability (25) | 4 | 5 | 5 | 4 |
| Error prevention and trust (30) | 2 | 4 | 4 | 3 |
| Business and operational (10) | 3 | 4 | 3 | 3 |
| Interaction efficiency (10) | 5 | 4 | 2 | 3 |
| Implementation cost (5) | 5 | 4 | 3 | 4 |
| **Total (of 5)** | **3.25** | **4.25** | **3.90** | **3.30** |

Arithmetic B: (80 + 125 + 120 + 40 + 40 + 20) / 100 = 4.25. A: (60 + 100 + 60 + 30 + 50 + 25) / 100 = 3.25. C: (80 + 125 + 120 + 30 + 20 + 15) / 100 = 3.90. D: (60 + 100 + 90 + 30 + 30 + 20) / 100 = 3.30. The B to C gap (0.35) is small; see rationale.

**8. Selected: B, status line plus explicit button.** Why: the control names the permission in words ("Allow automated drafting tools", "Stop allowing automated drafting tools") instead of leaving the state to a switch position; both directions take one action; the result stays on the page and in the history; it follows the Carbon rule that a switch is for a settings change that needs no explanation, which a consent is not. Rejected A: ambiguity of "Allow ... on", no recorded result beyond a vanishing status line, and the onboarding copy of the same switch applies on Next, so one control means two things. Rejected C: adds a dialog to a reversible choice; withdrawing should be as easy as giving; the page already states the effect beside the button. Rejected D: a deferred save invites leaving with the old state. Consequence stated openly: B costs one more word on the screen than a switch and gives up the familiar switch shape. Validate by comprehension test (below). If testing shows accidental taps, revisit C for revoke only and give grant the same dialog so ease stays symmetric.

**9. Spec: ConsentChoice.**
- Anatomy: heading (h2) with the consent title; requirement word ("Optional"); summary sentence; "What this does" list; "What it does not do" list; "How to change it" line; a state line ("Allowed since 2 November 2026, 3:14 PM" or "Not allowed"); one button; a status region; a link to the full wording.
- Usage: an optional consent that the patient may grant and revoke on their own. When not to use: the required consent (CD-141); consents that cannot be granted (text only, "Not available yet"); settings that are not consents (notification preferences may use a switch per APG and Carbon).
- Variants: allowed, not allowed, pending, not grantable. No size variants.
- States (§22): default; hover and pressed (standard button); focus-visible; disabled only while pending, with visible "Saving" text; loading (button text "Saving", state line unchanged until the server answers); error (Banner "Not saved. Your choice is as it was. Try again." persistent, button re-enabled); success (state line updates from the server response, status message "Allowed. Your care team can now use automated drafting tools on your records." not shown until the server confirms, then a history row appears); permission restricted (non-patient roles do not see the control); network unavailable (same as error); stale data (reload the list after any change, as the build does); long content (details wrap; the phone number is not truncated); missing information (clinic phone null: omit "contact on" text).
- Behaviour: one request per press; double tap ignored while pending; no optimistic flip, because a consent should not appear changed before the server records it (brief §14). After success, focus stays on the button, whose label has changed; the status message is announced politely. After failure, focus stays on the button and the Banner is announced as an alert.
- Keyboard: Tab to the button, Enter or Space activates.
- Screen reader: button name is the full action; the state line is linked with `aria-describedby`; result via a single polite `role="status"` region (WCAG 4.1.3); error via `role="alert"`.
- Responsive: button full width below `md`, at least 48 px; text wraps; no horizontal scroll at 320 CSS px.
- Data: `ConsentList.types[].active`, `currentTextVersion`; POST grant with `textVersion`; POST revoke on `active.id`.
- Permissions: patient role on own record only.
- Testing: grant then revoke leaves two history rows with correct times; no state change before the server responds; failure leaves the state line as it was; axe pass; screen-reader announcement text; copy test (no legal claim, no "HIPAA", banned diagnostic terms).
- Validation with people (not run): comprehension check with five or more adults including two over 60: "What happens if you press this? How would you undo it? Who can see your records?"

---

### CD-141. Withdrawing the required consent

**1. Task.** A patient decides they no longer agree to treatment and data use. By advisor decision (Q4) they cannot revoke it themselves, because the care team needs to know.

**2. Requirements.** The patient must still be able to find out how to withdraw, at the moment they look, and must not be left with only a phone number if they cannot call. The product must not imply it is monitored for urgent matters.

**3. Examples.** [Observed] Swiggy states plainly in a bullet what cannot be undone; Perplexity and Claude say data can be disconnected or deleted from Settings. [Prior] Oura says where consent can be withdrawn at the moment of granting. No clinical product frame showing a "request to withdraw" was retrieved.

**4. Guidance.** GDPR Art. 7(3) as reference only (withdrawal as easy as giving); it is not applied as a legal claim here, and the product decision (Q4) is a deliberate departure that this file records rather than argues away. HIPAA revocation terms [Not retrieved].

**5. Alternatives.** A: text with the clinic phone number (current). B: the same text plus an in-app action "Message your care team about withdrawing" that opens the existing messaging composer with a subject line, and a stated reply-time line from messaging. C: in-app direct withdrawal button.

**6. Gates.** C **fails** the product constraint (Q4) and is excluded. A passes but is weak when the clinic phone is null or the patient cannot call. B passes if the message route does not imply urgent monitoring (the composer already carries the not-for-emergencies line, REQ-MSG-02).

**7. Evaluation (family weights).** A 2,3,2,3,2,5 = **2.50**. B 4,5,4,4,4,3 = **4.20**. A: (40 + 75 + 60 + 30 + 20 + 25) / 100 = 2.50. B: (80 + 125 + 120 + 40 + 40 + 15) / 100 = 4.20.

**8. Selected: B.** Rejected A (a phone-only route), C (gate). Wording stays plain: "To stop agreeing, tell your clinic. They will help you, and they need to know first." followed by "Call (phone)" when a number exists and "Message your care team". Dependency: needs the messaging contract to accept a pre-filled subject [Assumption: check]; if not, the button opens the composer unfilled. Optional contract request CR-15-01: a structured "withdrawal requested" event so the clinic sees it as a task rather than a message. **Spec:** a short block under the required consent state line; both actions are real links or buttons at least 48 px; the state line keeps "Agreed on {date}"; after the clinic records a withdrawal the line reads "Withdrawn on {date}" and the history shows it. Tests: no phone shown when null; the message route opens for patients only.

---

### CD-142. Controls on the onboarding consent step

**1. Task.** At step 10 of 11 of intake the patient reads two choices, one required and one optional, and moves on. Form answers are committed when Next is pressed.

**2. Requirements.** Required and optional are separate and said in words (REQ-ONB-05). The required one must be an active agreement, never pre-ticked. The optional one defaults to off but its answer should be a recorded choice, not an untouched default. The step saves `treatmentAndDataUse: true`, `aiAssistedFeatures: boolean`, and `textVersion`.

**3. Examples.** [Observed] Perplexity: one consent button under three bullets. Google Health: equal Allow and Don't Allow. Bevel: a toggle inside an "Opt in" step with a note that it can be changed in Settings. [Prior] Fitbit: equal buttons, "completely optional".

**4. Guidance.** GOV.UK: do not preselect; checkbox for one yes/no answer inside a form; radios when "no" must be an explicit answer. Carbon: a toggle is for immediate effect, so a deferred form answer should be a checkbox or radios.

**5. Alternatives.** A: switch for the optional choice (current). B: unticked checkbox for the optional choice. C: two radios "Yes, allow ..." and "No, do not allow ...", neither preselected, with an answer needed before Next.

**6. Gates.** A: conditional (a switch in a deferred form misleads, per Carbon and the finding above). B: pass. C: pass, adds one required tap for an "optional" item, which must be explained in the copy.

**7. Evaluation (family weights).** A 3,3,2,3,5,5 = **3.00**. B 4,5,3,4,5,5 = **4.10**. C 4,5,5,4,4,4 = **4.55**. A: (60 + 75 + 60 + 30 + 50 + 25) / 100 = 3.00. B: (80 + 125 + 90 + 40 + 50 + 25) / 100 = 4.10. C: (80 + 125 + 150 + 40 + 40 + 20) / 100 = 4.55.

**8. Selected: required consent = checkbox "I agree to treatment and data use as described above" (unticked, error "Tick the box to agree before you continue" linked); optional consent = radio pair (C).** Rejected A (one control, two meanings), B (an untouched box cannot be told from a considered "no"; weaker audit story). Copy under the radio legend: "Optional. Either answer is fine, and you can change it later in Sharing and consent." Open item for the product and clinical owners [U]: what happens, and what is kept, if a patient does not agree to the required consent after the account and earlier steps have been saved. The UI must not dead-end: provide a visible "I do not agree" route to a plain explanation and the clinic contact, once that behaviour is defined. Not designed here. **Spec:** `FieldGroup` per choice with its own legend; checkbox row at least 48 px; radio group per CD-105; each choice sits in its own section with a heading so a screen-reader user can jump between them; the footer line keeps the wording version.

---

### CD-143. Plain-language explanation

**1. Task.** A patient understands what they are agreeing to before choosing, without reading legal text. Needs: what it is, who sees what, what it does not do, how to change it.

**2. Requirements.** One shared wording source for onboarding and `/consent` (already so). No legal-status claim, no named condition (AC-A9). Wording needs clinical and legal review before real use.

**3. Examples.** [Observed] Perplexity: three one-line bullets, each with an icon. Swiggy: three bullets including an irreversible one. Structured: FAQ rows. Google Health: one sentence and a list of data types. Bevel: one sentence and a note on where to change it. Oura [Prior]: long legal text behind links.

**4. Guidance.** GDPR Art. 7(2) (reference): a consent request inside a longer document must be separated, understandable, easy to access, in plain language. GOV.UK: hints one short sentence. No retrieved page gives a reading-level target, so none is claimed.

**5. Alternatives.** A: always-visible summary sentence plus three labelled short lists (does, does not do, how to change), full wording one link away. B: summary visible, details behind a disclosure. C: link to a full policy only.

**6. Gates.** A pass. B conditional (an essential fact hidden behind a control that may be missed; a disclosure must expose its state). C **weak** on the plain-language requirement.

**7. Evaluation (family weights).** A 5,5,5,4,3,5 = **4.70**. B 3,4,3,3,4,4 = **3.40**. C 2,3,2,3,5,5 = **2.80**. A: (100 + 125 + 150 + 40 + 30 + 25) / 100 = 4.70.

**8. Selected: A.** Rejected B (the facts a patient needs to choose should not be optional to read), C. Content rules: sentences under about 20 words [E, no source]; second person; no jargon; say "AI" or "computer program" once in the summary so the patient can identify what the "automated drafting tools" are (naming to be reconciled with family 6, which owns AI vocabulary); say what is not done ("It does not change your plan or your care. A therapist reads and approves every draft", all of which is already in the current copy and must remain true); say how to change it and that changes are logged. **Spec:** `ConsentChoice` anatomy in CD-140; the "full wording" link opens in the same tab or a dialog that meets CD-120 and returns focus to the link; wording version shown as small text. Tests: copy test for banned terms and legal claims; readability review by a human; same strings on both screens.

---

### CD-144. Consent state vocabulary and history

Conventional (table). **Selected:** state words follow the control: required consent "Agreed on {date}" / "Not agreed" / "Withdrawn on {date}"; optional consent "Allowed since {date}" / "Not allowed"; not grantable "Not available yet". Retire "On" and "Off" as state words once the switch is gone. History table keeps its columns (Choice, What happened, When) and adds "Wording version" because the contract holds `textVersion`; "What happened" uses "Agreed", "Allowed", "Stopped allowing", "Withdrawn". Newest first; times in the clinic time zone with the zone name (matrix finding G3). On narrow screens the table may stay a table if each cell wraps (WCAG 1.4.10 data-table exception, still no clipping), or become a list; layout choice belongs to family 9. Never colour alone. Final status vocabulary is owned by family 12; this is the proposal to reconcile. **Rejected:** On/Off words with buttons; icons without text. **Tests:** every history row has text for the result; the vocabulary matches the status map.

---

### CD-145. Consent wording changed since the patient agreed

State, not a new component. **Selected:** when `active.textVersion` differs from `currentTextVersion`, `/consent` shows a Banner (info tone) under that consent: "The wording changed on {date}. Read the new wording." with a "Read the new wording" action and, for the optional consent, the normal Allow / Stop allowing button; an existing agreement is not revoked or paused by the UI. What the clinic does while a patient has not re-read it is a product decision [U] and must be defined before building. In onboarding, a saved step whose version is stale shows "The consent wording changed. Please read it again." (feature A) and requires a new agreement. **Rejected:** silent re-use of an old agreement; automatic revocation. **Tests:** version mismatch shows the banner; a grant with an old version is refused (400) and the UI reloads the current wording.

---

### CD-146. Clinician-side display of consent

**Selected:** read-only text on the patient record (Overview and header area): the consent types with state, date and wording version; no control. Where a feature depends on a consent (AI drafting), the blocked state says why: "AI-assisted features are off for this patient. A summary was not generated. Consent can be changed by the patient or the clinic." (feature M). Staff recording a patient's request to withdraw the required consent is a high-impact action owned by family 8 and is not designed here; the UI must not offer a one-click revoke next to the status text. **Rejected:** a switch or button in the record header; hiding consent state. **Gates:** privacy (staff only see what their role needs; opening the record is logged: existing); accessibility pass. **Tests:** role check; no consent control rendered for staff roles.

## 3. Interaction with other families

Family 6 (AI verification) owns the patient-facing name for the AI feature and what happens to drafts when consent is withdrawn; family 8 (high-impact actions) owns any staff-side withdrawal; family 10 (error recovery) owns the persistent-error pattern used by CD-140; family 12 (status vocabulary) reconciles CD-144.

## 4. Contract and product requests (not made here)

- **CR-15-01 (optional):** a structured "withdrawal requested" event for the required consent so the clinic receives a task.
- **Product decisions needed:** what is kept if the required consent is declined mid-onboarding; what happens to drafts in progress when the optional consent is withdrawn; clinic behaviour while consent wording is stale.

## 5. References not accessible

HHS HIPAA authorizations page (fetch failed); eCFR 45 CFR 164.508 (robots disallowed); Apple HIG toggles and Material 3 switch guidelines (JavaScript-only pages, no guidance text returned); ICO and NHS consent pages (not attempted). No clinical product screen showing a "request to withdraw consent" flow was found. The Mobbin consent frames are consumer products except Google Health and Perplexity, which handle health data but are not care-team products, and frames show screens not behaviour, so no claim is made about how they announce or log changes.
