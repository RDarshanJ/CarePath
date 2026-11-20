# Feature A: Authentication and patient onboarding

Status: provisional until the advisor signs off. Access date for every external source: 2026-11-20. Source brief: `docs/DESIGN-BRIEF.md` §5 to §9 and §7 A. Protocol: `docs/design/RESEARCH-PROTOCOL.md`.

Evidence labels used below: **R** = research evidence (a source I retrieved), **E** = expert judgement, **U** = untested assumption. Reference tags: **[Observed]** = I retrieved and looked at it in this session; **[Prior]** = taken from `docs/research/*.md` (2026-11-19) and not re-retrieved; **[Assumption]** = inference, not seen.

## 1. User problem

A new patient has an invitation from their clinic and wants to get in, tell the clinic what it needs, and know they are done. They do not want to retype things, guess what the clinic will do with their answers, lose their work if the phone call ends the session, or be told they have a medical label. The clinic needs a complete, honest intake before a therapist builds the first plan.

## 2. User and context

- **Who:** an adult patient joining a rehab program with an eligibility code from their clinic. Personas in the PRD include a desk worker with recurring low-back pain (phone-first, short sessions) and older patients (adults, some over 60). [Prior: `docs/product/prd.md` P2]
- **Where and on what:** mostly a phone in the browser at 390 wide, sometimes a laptop. First visit is often sitting down at home, but interruptions are normal (a call, a child, a door).
- **State:** they may be in pain, anxious about the program, or unsure whether the code is typed right. Some are unfamiliar with passwords; some use a password manager.
- **Frequency:** once. Resume may happen over several days. Sign-in afterwards is repeated, so it must be fast and forgiving. [E]

## 3. Business objective

Raise the share of invited patients who finish intake and reach a first completed session, without hiding choices or asking for data the clinic does not use.

Metrics (names only, no targets invented): enrollment completion rate; time to completion; abandonment by step; validation-error frequency by field; resume rate (returned after leaving and finished); eligibility-code rejection rate; time from account creation to first session started; share of patients whose intake is "missing" on day 3 (the existing review rule).

## 4. Constraints

**Functional (checked in `packages/shared/src/contracts/onboarding.ts`, `intake.ts`, `consents.ts`, `auth.ts` and `docs/architecture/api-phase3.md` §4):**
- `POST /onboarding/accounts` is the one public write. It takes email, password (min 12, max 256, no composition rules), eligibility code (4 to 64, spaces and case ignored), given name, family name, birth date. Code check, redemption, user, patient and intake are one transaction. Invalid, used or expired code answers 400 `eligibility_code_invalid` and creates nothing; duplicate email answers 409 `account_exists`; 429 `rate_limited`.
- After that, nine steps are saved one at a time with `PUT /patients/:id/intake/steps/:step` (autosave and resume). `firstIncompleteStep` drives resume. `POST .../intake/submit` answers 409 `intake_incomplete` listing missing steps; patient status moves `intake_incomplete` to `awaiting_assignment`.
- Required answers per step are fixed by `intakeAnswerSchemas`: three pain numbers (0 to 10, all required), body area plus side (side has `not_applicable`), limitations (array, may be empty, plus optional text), clinician preferences, availability (at least one day and one time band), consent (required consent must be `true`; AI consent boolean), review (`confirmed: true`).
- `INTAKE_TOTAL_STEPS` is 11 and the two account steps count as 1 and 2 (REQ-ONB-01 "Step n of 11").
- There is **no** endpoint that checks a code without creating an account, **no** email verification, **no** MFA, **no** "save a partial account". A partly filled account step lives only in browser memory.
- The required consent can only be withdrawn through the clinic; the optional AI consent is off until granted.

**Technical:** Next.js app router, `packages/ui` components (`Field`, `FieldGroup`, `Progress`, `RadioGroup`, `Banner`, `Checkbox`, `Switch`, `PainScale`), session cookie plus CSRF token, 30 minute idle and 12 hour absolute session.

**Safety and privacy:** no output may state or imply a diagnosis (REQ-ONB-06; banned terms list in `@carepath/shared`). Required and optional consent are separate and worded (REQ-ONB-05). Intake answers are clinical data: staff see them only with the right role. The product is a demonstration: synthetic data and a standing banner. Never imply regulatory compliance.

**Accessibility (WCAG 2.2 AA):** 3.3.7 Redundant Entry (do not make people re-enter what the process already holds); 3.3.8 Accessible Authentication (paste and password managers must work; no puzzles); 2.5.8 target size (24 px floor, house floor 48 px on patient pages); 3.2.6 Consistent Help; errors linked to fields and announced; visible labels; 200 percent zoom.

## 5. Current CarePath implementation

Read: `apps/web/app/(patient)/_components/onboarding-flow.tsx` (1,174 lines), `_lib/onboarding.ts`, `onboarding/page.tsx`, `(public)/login/login-form.tsx`, `_lib/consent-copy.ts`. Screens read: `docs/screenshots/3.2b/a01-account-390.png`, `a06-pain-error-390.png`, `a11-review-390.png` (the full a01 to a14 set exists at 390 and 1440).

What exists and works: one linear flow of 11 steps in one component; progress bar and "Step n of 11"; focus moves to the new step heading; errors are summarised, linked to fields and announced; "why we ask" text on clinical fields; show-password checkbox; paste allowed; autosave with a "Saved. You can leave and come back" line; resume at `firstIncompleteStep`; a review page with a Change link per section and a confirm checkbox; a done screen that says what happens next. Sign-in has demo role buttons plus a typed form and a link to `/onboarding`.

Weaknesses (each with evidence):
1. **Steps 1 and 2 are not saved.** Name, email, password, code and birth date exist only in component state until the final POST. A reload or phone call at step 2 loses everything, and the "you can leave and come back" promise starts only at step 3. (`onboarding-flow.tsx` `createAccount()`; resume reads `intake.firstIncompleteStep`, which exists only after the account exists.)
2. **The code is checked last.** The patient types name, email and a 12-character password before learning that the code is wrong. The error text is good ("No account was created") but late. The API has no code pre-check.
3. **Progress starts at 1 of 11 on a form with six fields,** so the bar says little; nine steps then each ask one small thing. Three of them (goal, limitations, preferences) are mostly optional text. Total length is reasonable but the screens are visibly thin on a phone (one short question per screen) while the account step is a four-field form.
4. **Pain is asked three times on one screen** (now, worst, best last week) and each shows a live line with a mild, moderate or severe word ("You chose 7 of 10: severe"). Those bands match one published cut-point scheme among several and were not derived for labelling a patient's own rating; see feature D.
5. **No email verification and no second factor.** A mistyped email creates a real account the clinic cannot reach. [E] (Prior research recommended a confirm-your-email step and MFA: `docs/research/mobbin-patterns.md` §1.)
6. **Date of birth uses the browser date control** (`type="date"`). Behaviour differs across phones and keyboards; a three-field day, month, year entry is the common alternative in public-sector systems but I could not retrieve the NHS page to confirm (see §6, not accessible). [U]
7. **Review page is strong** (Change links, plain summary) but the confirm checkbox error appears as soon as the screen opens in the screenshot state, which is a test artifact; check that it does not show before the first attempt. [Assumption]

## 6. Production references observed

Mobbin: loaded `search_flows` and `search_screens` (iOS). Flows sample 3 to 5 frames of long flows; observations below are only of frames returned.

| Product | Platform | Screen or flow | URL | Accessed | Observed |
|---|---|---|---|---|---|
| Zocdoc | iOS | Onboarding, Creating Account, Verifying (14 frames) | https://mobbin.com/flows/a39e9def-e888-4663-a597-f2abc49c5d29 | 2026-11-20 | [Observed] Sign up asks for email only, with Continue, Apple and Google, an "Already have an account? Log in" line and a privacy link. Next screens: mobile number with a "Text me with PIN" button and "Verify with email instead"; PIN screen with a numeric keypad and "Didn't receive a PIN? Tap to send another". |
| Zocdoc | iOS | Onboarding (18 frames) | https://mobbin.com/flows/dba4d8d7-d818-4dec-b88c-e61a9bb13fc0 | 2026-11-20 | [Observed] A Profile screen asks legal first and last name (with help icons), date of birth as three separate boxes (MM, DD, YYYY), sex as two buttons with "Add more sex and gender info (optional)", and a terms checkbox. A Verify Phone screen has "Not now, I'll do this later". Cancel is always top left. |
| Hims | iOS | Onboarding, Creating Account (17 frames) | https://mobbin.com/flows/52006b3b-d088-410d-97f4-09789e316d4b | 2026-11-20 | [Observed] "Getting started" screens come before the account: home state with a one-line reason ("This lets us find local providers") and a telehealth consent checkbox with link; date of birth as one numeric field. The account screen ("Let's get your account set up") comes later in the sampled frames (position 13 of 17) with email, password, a terms line, Apple and Google. A round back button sits top left; one question per screen. |
| Future Pro (fitness coaching) | iOS | "Do you have any injuries or limitations?" screen | https://mobbin.com/screens/5b7ff37d-ad94-40c0-a389-b8a3dff5533f | 2026-11-20 | [Observed] One yes/no question per screen, a coach avatar line explaining why ("anything that has a big impact on your movements"), segmented progress line, Back and Continue at the bottom, Continue disabled until answered. |
| Hinge Health | Web | Home page | https://www.hingehealth.com/ | 2026-11-20 | [Observed] Offers "check eligibility" before anything else; describes "Step 1 of 4" as a personalised plan from pain, goals and abilities. Page does not describe the eligibility check itself. |
| Hinge Health | Web | Per prior competitor analysis | `docs/research/competitor-analysis.md` §1.1 | 2026-11-19 | [Prior] Eligibility form, then a roughly 10 minute questionnaire that creates the account, then a few exercises to personalise the plan. Not re-fetched today. |
| Physitrack PhysiApp | Web | Patient experience page | https://physitrack.com/physiapp-patient-experience | 2026-11-20 | [Observed] Patient gets an email with a program code and a download link and types the code into the app to begin. |
| Medbridge GO | iOS | App Store listing | https://apps.apple.com/us/app/id1089747982 | 2026-11-20 | [Observed] Patient enters the access code from their provider to sync the program; a QR code reader for the code was added in version 2.5.7. |
| NHS service manual | Web | Complete multiple tasks | https://service-manual.nhs.uk/design-system/patterns/complete-multiple-tasks | 2026-11-20 | [Observed] Task list for long or complex services; use only after trying to shorten; statuses Completed, Incomplete, Not yet started, In progress, Cannot start yet, There is a problem; statuses are text, not colour only; do not use it to show answers. |
| NHS service manual | Web | Question pages | https://service-manual.nhs.uk/design-system/patterns/question-pages | 2026-11-20 | [Observed] Start with one question per page; group only when research supports it; a back link at the top of every question page that does not break the browser back button. |
| GOV.UK Design System | Web | Create accounts | https://design-system.service.gov.uk/patterns/create-accounts/ | 2026-11-20 | [Observed] Create accounts only when users will return; let people do as much as possible before requiring one; keep account creation separate from sign-in; label "Create a password"; avoid CAPTCHAs; do not make users enter the same thing twice. |
| GOV.UK Design System | Web | Check answers | https://design-system.service.gov.uk/patterns/check-answers/ | 2026-11-20 | [Observed] One summary before sending, a Change link per row with specific hidden text, return to the summary after an edit, show skipped optional questions as "Not provided", button names the action. |
| CMS Design System | Web | Home (component index) | https://design.cms.gov/ | 2026-11-20 | [Observed] Lists a Step List, Alert, text and date fields (single and multi input), Label and Legend, Hint, Inline Error, and form validation and form review patterns. Page names components only; details not read. |
| W3C WCAG 2.2 | Web | SC 3.3.7, 3.3.8, 2.5.8 Understanding pages | https://www.w3.org/WAI/WCAG22/Understanding/redundant-entry.html and `/accessible-authentication-minimum.html` and `/target-size-minimum.html` | 2026-11-20 | [Observed] 3.3.7: do not make users re-enter information from earlier in the same process (exceptions include security and newly invalid data). 3.3.8: no cognitive test at login unless an alternative exists; pasting and password managers must work; email-link login is a listed technique. 2.5.8: 24 by 24 px minimum with spacing exception. |
| CVS Health, Hers, Headspace, Oura, WHOOP, Fitbit | iOS | Questionnaire and account flows | `docs/research/mobbin-patterns.md` §2.1 to §2.4 | 2026-11-19 | [Prior] Visit checklist with Action Needed and Completed rows (CVS); described options and "I have nothing to add" (Hers); email confirmation screen (Oura); detect existing identity (Fitbit); one question per screen (WHOOP). Not re-observed today. |

**Not accessible or not found:**
- Hinge Health and Sword Health returned no usable flows on Mobbin (`Hinge Health` search returned zero flows; `Sword Health onboarding` returned an unrelated app, Mindvalley). Public pages only, and they do not show onboarding screens.
- NHS "Ask users for dates" pattern: fetch failed (client error). The three-field date claim in §5 item 6 is therefore **not** supported by a source I read.
- MedBridge patient-engagement page and the Physitrack `/patient-app` page: fetch failed. App Store and `physiapp-patient-experience` were used instead.
- MyChart and One Medical were not accessible on Mobbin in prior research and were not retried. Omada, Maven, SPRY, WebPT, Headway, Abridge, Ambience, Tebra and Medplum were not needed for this feature and not researched here.
- I did not see any logged-in healthcare app screens; Mobbin captures are partial samples of long flows.

## 7. Established patterns

1. **Ask little first, and say why.** Zocdoc takes one email; Hims asks a reason-labelled question before the account. Both put effort after a small first commitment. Why it works: the patient sees progress before investing a password. [R, Observed]
2. **One topic per screen with a back control and a visible way out.** NHS question pages, Hims and Future Pro. Why: lower load per screen and easy correction. [R]
3. **Code-based entry for clinic-assigned care.** Physitrack and Medbridge GO both use a provider-issued code; Medbridge adds a QR reader. Why: the clinic, not the patient, decides who is eligible. [R]
4. **A review page with Change links before sending.** GOV.UK, and CarePath already has it. [R]
5. **Plain-text status instead of colour-only.** NHS task list. [R]
6. **Verification and identity are separated from care questions,** often with "not now" (Zocdoc phone). [R, Observed]
7. **Sensitive items carry a reason and an optional route** ("Add more sex and gender info (optional)" at Zocdoc; "I have nothing to add" at Hers [Prior]). [R]

## 8. Alternatives

All four use the same contract (account POST, nine saved steps, submit). They differ in how the patient moves and what the screen asks.

### A1. Linear step-by-step, refined (current model, with fixes)

- **Interaction model:** one topic per screen in a fixed order; Back and Continue; progress as "Step n of 11"; autosave per step. Refinements: show a short promise on the first screen ("About 10 minutes. You can stop after you create your account and come back."); move the eligibility code first (the thing the patient holds in hand) and keep the password last in the account part; keep the account form to one screen if it fits; name three parts under the bar ("Your account", "About your pain", "Your care") while keeping the "Step n of 11" text; add a three-field date of birth; add a "Not now" / "Prefer not to say" route on optional items; resume lands on a short "Welcome back, you are on step 6" line.
- **Benefits:** matches the API exactly (`firstIncompleteStep`); lowest risk; predictable for assistive tech and keyboards; every error is local to one screen. [E, R for one-question-per-page: NHS]
- **Limitations:** still 11 screens; account part is not saved until the end; code is still validated last unless a pre-check is added.
- **Accessibility:** focus to heading on each step (exists); linked errors (exists); paste works (exists). Target size already 48 px. Three-field date needs grouped legend and per-field errors.
- **Business:** fewest unknowns; measurable abandonment by step.
- **Technical complexity (vs API):** low. A date input change and copy. Optional: a code pre-check endpoint (contract request CR-A1, see §11).
- **Error and recovery:** invalid code, duplicate email, rate limit and network loss all keep what was typed; autosave covers steps 3 to 10. Gap: steps 1 to 2 (fix: keep typed values in `sessionStorage` for the tab, never the password, and say so).
- **Evidence:** NHS question pages [R]; GOV.UK check answers and create accounts [R]; Zocdoc and Hims frames [R, Observed]; fit to API [R: contracts].

### A2. Modular onboarding checklist (task list)

- **Interaction model:** after a minimal account, the patient lands on a hub: "About you", "Your goal and pain", "Your preferences and availability", "Sharing and consent", "Review and send". Each opens its own small form; statuses are text (Not started, In progress, Completed); order is free; "Send to the clinic" unlocks when all are complete.
- **Benefits:** shows the whole job at once; easy to return to; fits people who want to do consent first or skip around; matches NHS and CVS checklist patterns. [R]
- **Limitations:** NHS says use it for long or complex services after simplifying; this intake is nine short steps. A hub adds a decision and a tap per step; patients can leave a required task for later and then stall; "Step n of 11" (REQ-ONB-01) stops making sense. [R, E]
- **Accessibility:** statuses as text linked to the task name (NHS does this); non-links for blocked tasks. Good.
- **Business:** may help people who stop and return; may add abandonment on the hub (U).
- **Technical complexity:** medium. API saves steps independently, so a hub is client-side only; `firstIncompleteStep` and "Step n of 11" copy need rework; needs a new task-list component (not in `packages/ui`).
- **Error and recovery:** errors per task, "There is a problem" status; resume simply returns to the hub.
- **Evidence:** NHS complete multiple tasks [R]; CVS visit checklist [Prior]; no source shows it beats linear for a ten minute intake [U].

### A3. Adaptive questionnaire with conditional questions

- **Interaction model:** one question at a time; the next question depends on earlier answers (for example, ask side only for lateral body areas; ask follow-ups about limitations only when a limitation is chosen; skip phone prompts if declined).
- **Benefits:** fewer irrelevant questions; feels conversational. [E]
- **Limitations:** the contract requires every step and every field except a few optionals, so most branching cannot remove questions; branching that infers (for instance, hiding a question because of a body area) risks silently deciding what the clinic sees; progress length changes (CVS prior research notes progress rings stop being meaningful when branching changes length [Prior]); harder to test and to explain "Step n of 11".
- **Accessibility:** changes in the page after an answer must be announced; focus management is harder.
- **Business:** little saving in questions today. Real value only if the clinic agrees to drop required fields (not this phase).
- **Technical complexity:** high against the API: conditional schemas, a new `missing` logic, and tests for every branch.
- **Error and recovery:** a wrong earlier answer silently changes later screens; going back must restore both. Risky.
- **Evidence:** Hers and CVS use branching [Prior]; no source shows an enrollment gain [U].

### A4. Two-phase: account and consent now, intake in context later

- **Interaction model:** create the account, give the required consent, then land on Today with intake questions asked later at the moment each matters (goal when the therapist first opens the plan, pain at the first check-in).
- **Benefits:** shortest path to "in"; spreads effort over days. [Headspace-style progressive asking: Prior]
- **Limitations:** the therapist needs the intake to build the first plan (REQ-ADM and F2 in `docs/decisions/checkpoint-c2.md`); `intake/submit` requires every step; patients would sit in an unclear state; the clinic loses the "missing intake" review rule's meaning.
- **Accessibility:** neutral.
- **Business:** may raise account creation, lowers clinic readiness (U).
- **Technical complexity:** very high: partial submit, new patient status, new reminders.
- **Error and recovery:** many partial states; "missing" ambiguity.
- **Evidence:** prior research recommended "4 steps max before reaching Today" for a generic wellness app (`docs/research/mobbin-patterns.md` §2 pattern 2); it does not fit a clinic-gated enrollment [E].

## 9. Mandatory gates

| Gate | A1 Linear refined | A2 Checklist | A3 Adaptive | A4 Two-phase |
|---|---|---|---|---|
| Accessibility (WCAG 2.2 AA: 3.3.7, 3.3.8, 2.5.8, linked errors, focus) | Pass | Pass (statuses are text) | Pass only if dynamic changes are announced; conditional pass | Pass |
| Privacy (data minimised; no clinical data without consent; no diagnosis wording) | Pass | Pass | Conditional: branching must not infer or hide clinical content | Pass for privacy; creates a state where clinical data is held without a submitted intake |
| Safety (no diagnosis, emergency wording where pain is asked, no dead end) | Pass | Pass | Conditional: hidden questions must not drop the contact-and-emergency line on the pain step | Pass |

No alternative is ineligible on the mandatory gates. A3 and A4 carry conditions that cost them in scoring rather than disqualifying them.

## 10. Weighted evaluation

Default weights (task effectiveness 25, clinical safety/privacy/trust 20, usability/accessibility 20, business value 15, operational efficiency 10, technical feasibility 5, design-system consistency 5). No adjustment: the feature has no special safety-critical moment and the weights already favour task completion and trust. Score 1 to 5.

| Criterion (weight) | A1 Linear refined | A2 Checklist | A3 Adaptive | A4 Two-phase |
|---|---|---|---|---|
| Task effectiveness (25) | 4: finishes all required data in a known order; fixes close the lost-account-data gap | 3: free order helps some, adds a hub decision and lets required tasks linger | 3: contract keeps most questions required so few are saved | 3: quick entry, but the clinic still lacks intake for the first plan |
| Safety, privacy, trust (20) | 4: reasons next to fields, separate required and optional consent, review page | 4: same content, status in text | 3: hidden logic can hide wording or inference | 4: less data early, but a state without intake |
| Usability and accessibility (20) | 4: one topic per screen, back, linked errors | 4: overview helps return visits | 3: changing length and announcements | 4: light at start |
| Business value (15) | 4: measurable per step; reaches first plan | 3: unknown effect on drop-off (U) | 3: gain depends on clinic dropping fields | 4: may raise sign-ups (U) |
| Operational efficiency (10) | 4: complete intake before assignment | 4: per-task completeness visible to staff | 3: varying data completeness | 2: new incomplete states for staff |
| Technical feasibility (5) | 5: current API | 4: client-side hub | 2: conditional schemas and tests | 1: partial submit and new states |
| Design-system consistency (5) | 5: existing components | 3: needs a task-list component | 4: existing components | 4: existing components |
| **Weighted total (out of 5)** | **4.10** | **3.55** | **3.00** | **3.40** |

Arithmetic: A1 = (4×25 + 4×20 + 4×20 + 4×15 + 4×10 + 5×5 + 5×5) / 100 = 4.10. A2 = (75 + 80 + 80 + 45 + 40 + 20 + 15) / 100 = 3.55. A3 = (75 + 60 + 60 + 45 + 30 + 10 + 20) / 100 = 3.00. A4 = (75 + 80 + 80 + 60 + 20 + 5 + 20) / 100 = 3.40. Scores are expert judgement against the sources in §8; none comes from usability testing.

Sensitivity: if task effectiveness for A2 rose to 4 and design-system consistency to 4, A2 would reach 3.80, still below A1.

## 11. Recommendation

**Select A1, linear step-by-step, refined.** Runner-up: **A2, the checklist,** used only as a **resume summary** for a returning patient (a short list of steps with Completed and Not started, then Continue), not as the main model.

Why A1 beats A2: the intake is nine short steps the clinic needs in full; NHS guidance reserves the task list for long or complex services after simplification; a free order adds decisions without removing any required field; and A1 matches the API's `firstIncompleteStep` and the PRD's "Step n of 11". Why not A3: the contract makes most questions required, so branching saves almost nothing and adds hidden logic. Why not A4: the therapist needs intake before the first plan and `intake/submit` has no partial form.

Refinements to carry into design (all within the current contract unless marked):
1. Tell the patient the length and the safe-to-stop point on screen 1.
2. Put code and date of birth first, name and email and password after. (Does not move validation earlier without CR-A1, but puts the thing most likely to be wrong in front of the patient sooner and lets the form say "keep your code handy".)
3. Keep typed account fields (never the password) in tab storage so a reload does not erase them; say so in one line.
4. Three-field date of birth with a grouped legend [U: validate with users; source page not retrieved].
5. "Not now" or "Prefer not to say" on genuinely optional items (phone, limitation text, preference notes).
6. Keep the review page and Change links; return to review after an edit (already implemented).
7. Drop the mild, moderate and severe words from the live line under the pain numbers and keep only the two end labels (see feature D for the source check). Keep the contact and emergency line on the pain step.

**Contract requests (for the orchestrator, not made here):**
- **CR-A1 (optional):** `POST /onboarding/eligibility-check` returning only valid or not valid, rate-limited per address, so the code can be confirmed before a password is typed. Needs a security review: it creates a code-guessing oracle.
- **CR-A2 (optional):** an email confirmation step after account creation. Not in the PRD today. Advisor decision.

**Rejected and the trade-off:** the checklist (A2) is not the main model, which costs us free-order flexibility for the minority who want to do consent first. Adaptive (A3) is rejected, which costs the chance to ask fewer questions, until the clinic agrees to drop required fields. Two-phase (A4) is rejected, which costs a quicker first sign-up.

## 12. Requirement alignment row

| Field | Value |
|---|---|
| User segment | New patient with a clinic eligibility code; phone-first, may be in pain, may be older |
| Job to be done | Join the program and tell the clinic what it needs, once, then know what happens next |
| User pain point | Losing early work; learning late that the code is wrong; not knowing why each question is asked; fear of being labelled |
| Business objective | More invited patients reach their first completed session |
| Functional requirement | REQ-ONB-01 to 07; AC-A1 to A9 (resume, code rejection, linked errors, no re-asking, consent wording, no diagnostic terms) |
| Success metric | Enrollment completion rate; abandonment by step; validation-error frequency by field; resume rate; code-rejection rate; time from account to first session started |
| Design hypothesis | If the length and safe stopping point are stated, the account part survives interruption, and each question shows its reason, then fewer patients abandon before the first plan [U, untested] |
| Selected pattern | Linear step-by-step with parts, reasons, review page; checklist only as a resume summary |
| Technical dependency | `POST /onboarding/accounts`, `PUT /intake/steps/:step`, `POST /intake/submit`, `firstIncompleteStep`; optional CR-A1 |
| Validation method | Moderated walkthrough at 390 with five or more adults including at least two over 60 and one screen reader user; analytics by step once real use exists; Playwright keyboard-only pass |

## 13. States to design

| State | Microcopy (plain, no diagnostic terms) | Recovery |
|---|---|---|
| Default | "Step 3 of 11. Tell us your goal." with reason line under each field | Continue |
| Hover, focus, active | Visible 2 px focus ring; hover on option rows | Not applicable |
| Selected | Radio and checkbox filled with a check mark, not colour only | Change by tapping again |
| Disabled | Continue is never disabled for validation; errors are shown on press | Press Continue to see what to fix |
| Loading | Button: "Saving" / "Creating your account" | Wait; button stays in place |
| Empty (fresh start) | "About 10 minutes. You can stop after you create your account." | Start |
| Partial data (resume) | "Welcome back. You are on step 6 of 11. Your earlier answers are saved." plus a list of done steps | Continue; Change on any done step |
| Validation error | Summary "2 things to fix" with links; inline "Enter your date of birth as day, month and year." | Link moves focus to the field |
| Eligibility code rejected | "This code was not accepted. It may be mistyped, already used or expired. No account was created." plus "Ask your clinic for a new code" with clinic phone if known | Edit code; contact clinic |
| Account exists | "An account with this email already exists. Sign in instead, or use a different email." | Sign in link; edit email |
| Server error | "Account not created. What you typed is still here. Try again." | Try again |
| Network loss | "No connection. Nothing was saved yet. Your answers on this screen are still here." | Retry on reconnect; on steps 3 to 10 the next autosave retries |
| Rate limited | "Too many tries. Wait a minute, then try again." | Wait; text states nothing was created |
| Permission denied | Signed-in non-patient opening onboarding is redirected to their own home | Redirect |
| Success | "Your details are with the clinic. A care team member will assign your therapist." | Go to Today |
| Cancellation | Back is always available; leaving the page keeps saved steps | Return later via Sign in |
| Interrupted workflow | Account fields held in tab storage (not the password) for 30 minutes | Reload restores text fields; password re-entry only |
| Stale information | If the consent text version changed since the step was saved, "The consent wording changed. Please read it again." | Re-grant |
| Unsaved changes | Autosave line shows "Saved" only for what is on screen; edits show no "Saved" until next save | Continue saves |
| Session expired | "You were signed out for safety. Sign in to carry on where you stopped." | Sign in then resume at first incomplete step |

## 14. Responsive behaviour

- **375 and 390:** single column, 48 px targets, full-width Continue at the bottom, Back below it; progress bar and "Step n of 11" at top; date of birth fields stack in one row of three short boxes.
- **768:** same single column, centred, 40 rem measure; Continue and Back sit side by side.
- **1024:** a quiet step list appears on the left (text statuses: Done, Now, Next) beside the single form; the form model does not change.
- **1440 and 1920:** the form stays at reading width; the step list and a short "Why we ask" panel sit either side of it; nothing stretches beyond a readable measure. The review page may show answers in two columns.
- **What changes model:** nothing. All sizes keep the linear flow; larger screens add context, not a different interaction.
- Check at 200 percent zoom and 320 CSS px reflow; error summary stays above the form.
