# 02 Patient identity (family 2)

Protocol: `component-research/PROTOCOL.md`. Brief: `docs/COMPONENT-BRIEF.md` sections 6, 16, 18, 19, 21, 22. Access date for every external source: 2026-11-20. Decision records CD-200 to CD-206 in `docs/design/component-decisions/`. Builds on `feature-research/J-patient-record.md` (selected: persistent summary with contextual workspace) and `I-patient-directory.md`. Colours are not chosen here; only semantic token roles are named. All scores are heuristic judgements, not measurements.

Evidence labels: **[Observed]** retrieved and read this session; **[Prior]** from earlier repo research, not re-observed; **[Standard]** cited by number from knowledge, page not re-fetched; **[Judgement]**; **[Assumption]**.

## 0. What is in the code today

Read 2026-11-20: `apps/web/app/(clinician)/patients/[patientId]/record.tsx` (`RecordHeader`), `(clinician)/_components/common.tsx`, `apps/web/components/shells.tsx`, `(patient)/_components/patient-frame.tsx`, `packages/shared/src/contracts/patients.ts`.

- `PatientHeader` contract fields: `id`, `mrn`, `givenName`, `familyName`, `birthDate` (ISO date), `gender` (female, male, other, unknown), `status`, `timezone`, `preferredLanguage`, `onCareTeam`. No title, no preferred name, no photo, no age, no allergies or medications, no NHS-style national number.
- `RecordHeader` is a sticky `PageHeader`: eyebrow link "All patients", name as page title, then one line: MRN (mono), "Born {date}", status Tag, "Time zone {tz}", "Care team: {names}"; the "Open care plan builder" button sits in the same header. Gender and preferred language are fetched but not shown. `document.title` is set to the patient's full name.
- Patient name is a plain link in six lists (`/patients`, `/review-queue`, `/overview`, `/schedule`, `/inbox`, `/admin/patients`) with no second identifier except the directory (MRN).
- The only identity element in the staff shell is `Avatar` (initials) plus display name and role in the `SideNav` footer. The patient app header shows "CarePath", "Contact care team" and "Sign out"; nothing says who is signed in.

## 1. Decision CD-200: how the open record shows who the patient is

**Task and place in journey.** A therapist arrives from a visit row, review task, message or the directory, and acts in one record for seconds to minutes, many times a day. They need name plus a second identifier visible without any interaction, for every section and every action (publish plan, mark check-in reviewed, resolve a task). The action wanted is "confirm this is the right person" and then do the work. [Judgement, consistent with J section 2]

**Business and healthcare constraints.** Wrong-patient actions are the central risk (J section 3). The banner must exist only on single-patient screens. Identity data is PHI: show the minimum that disambiguates. `onCareTeam` governs writes, not identity display.

**Production and standards evidence.**

| Source | Surface | URL | Observed |
|---|---|---|---|
| NHS Common User Interface guidance "Patient Banner" (hosted as a community copy on pacharanero.github.io, original authorship not verified by me) | Specification | https://pacharanero.github.io/nhs-cui/patient-identification-and-information-entry-and-display/patben | [Observed] Required fields in order: name, date of birth, gender, NHS number, plus age for living patients. DOB labelled "Born", age in parentheses straight after. Banner appears only when one patient record is open and never on multi-patient screens. Full width, fixed at top, nothing may obscure it, visually distinct. Zone 1 always visible, Zone 2 collapsed by default and expands as one. Unknown values show blank or self-explanatory text such as "Not Known"; "?" and "-" were found to confuse users. Scroll behaviour is implied, not stated. |
| DHCW Single Record Design System | README | https://github.com/DHCW-Digital-Health-and-Care-Wales/single-record-design-system | [Observed] The README lists "Patient Banner" among components, alongside foundations, patterns and decision records. The component folder was blocked to my fetch tool (robots), so its fields and behaviour were **not read**. Not claimed beyond existence. |
| Epic Hyperspace Storyboard | Public pages (UNMC, Connect Care) | see `J-patient-record.md` section 6 | [Prior, text only] Persistent patient-context panel docked on the left on every chart section; no interface inspected. |
| Heidi clinical scribe | Mobbin flows | see J section 6 | [Prior] Patient name and condition chips stay at top while a tab strip changes. |
| Mobbin search "healthcare patient chart header with patient name, date of birth, MRN" (web) | Search | https://mobbin.com/ (query only) | [Observed] Six results returned (Monarch, Givingli, Upwork, Searchable, Plane, Quo); none was a clinical patient header. **No Mobbin clinical banner was found**; nothing inferred from them. Plane's "Customers" page does show a name header over a properties rail, which is the same structure as J's summary, but it is not clinical. |
| WebPT, SPRY, MedBridge, Tebra, MyChart | n/a | n/a | Not accessible (see J). |

**Alternatives (structurally different).**

| | Model |
|---|---|
| A | Identity inside the page header (today): title, meta line, actions in one sticky block. |
| B | Dedicated identity banner: a full-width strip at the top of the record, identity only, separate from the page header and from J's state summary. Actions move into the workspace header below. |
| C | Identity and state in a persistent side panel (J option C as written). |
| D | Identity chip in the app shell top bar only, details in a menu. |

**Mandatory gates.**

| Gate | A | B | C | D |
|---|---|---|---|---|
| Name + second identifier visible with no interaction | Pass | Pass | Pass | **Fail** (details in a menu) |
| Not obscured by focus (WCAG 2.2 SC 2.4.11) [Standard] | Pass if scroll padding set | Pass if scroll padding set | Pass | n/a |
| Works at 400 percent zoom (SC 1.4.10) [Standard] | Conditional | Pass with unstick rule (CD-203) | Needs collapse below 1024 | n/a |
| Privacy: no more PHI than needed | Pass | Pass | Pass | Pass |

**Weighted evaluation** (weights 25/25/20/15/10/5; reason for no adjustment: this is a safety-critical but conventional element, so the default weights fit).

| Criterion | A | B | C | D |
|---|---|---|---|---|
| Task effectiveness (25) | 3: actions crowd identity | 5 | 4 | 2 |
| Accessibility and usability (25) | 4 | 4 | 3: side panel fails at narrow widths | 3 |
| Error prevention and trust (20) | 3: identity reads as page title | 5: identity is its own element | 5 | 2 |
| Business and operational value (15) | 3 | 4 | 4 | 3 |
| Interaction efficiency (10) | 4 | 4 | 4 | 5 |
| Implementation cost (5) | 5 | 4 | 2 | 4 |
| Weighted (out of 5) | 3.45 | 4.45 | 3.85 | 2.80, ineligible |

Arithmetic: B = (125+100+100+60+40+20)/100 = 4.45.

**Selected: B, an identity-only banner**, with J's summary panel (state, "Not recorded" block, "Record as of") below or beside it. This refines J rather than contradicting it: J put identity inside the summary panel, which collapses below 1024 px; hoisting identity into a separate banner means it never lives in a collapsible region. **Rejected:** A (identity and actions share a block, and the name is a page title not an identity element), C as the identity carrier (fine for state; fails narrow widths), D (fails the first gate).

**Spec (brief section 21).**

- Name: `PatientBanner` (healthcare layer, `packages/ui` with data passed as props; no fetching inside).
- Purpose: state which single patient is open, on every section of the record.
- Anatomy: It sits inside the main region, so it is a `<section aria-label="Patient">`, not a second banner landmark. Zone 1: name (heading level 1 of the record page), MRN with label "MRN", "Born {date} ({age})" (CD-201), status Tag (CD-231), "Record as of {time}" (J). Zone 2, collapsed by default behind a button "Patient details": gender, preferred language, time zone, care team, and any "Not recorded" lines.
- Usage: single-patient screens only (record, plan builder, check-in detail opened from a record). Never on directory, queue, schedule or inbox lists (CD-204).
- When not to use: any screen listing more than one patient; the patient's own app (CD-205 covers that).
- Variants: `full` (>= 1024), `compact` (< 1024, see CD-203). No avatar or photo variant: no photo data, initials do not identify.
- Tokens (roles only): surface-raised background distinct from page, border-subtle bottom, text-primary name, text-muted labels, mono for MRN; status Tag per CD-231.
- Typography: name at heading level 1 size of the clinician theme; labels caption; MRN mono with tabular numerals (existing `Mono`).
- States: default; loading (name and MRN skeleton with label "Loading patient"); header fetch error replaces the whole record with `QueryError` (existing behaviour, keep); permission restricted (no `clinical.read`: identity still shows, clinical sections hidden by API); partial (Zone 2 value missing shows "Not recorded", never blank, "?" or "-"); stale (the "as of" stamp, J); network unavailable ("You are offline. This record is from 9:02 AM.", J).
- Behaviour: sticky (CD-203). Zone 2 toggles with one button, `aria-expanded`, `aria-controls`.
- Keyboard: Tab order name (not a link), MRN (selectable text), details button. No custom shortcuts.
- Screen reader: the section is labelled "Patient"; the first line is read as "{Name}, MRN {mrn}, born {long date}, age {n}, status {status}". Expanding announces nothing extra (button state change only). Document title does not contain the name (CD-203).
- Data dependencies: `GET /patients/:id` (`PatientHeader`), care team read, J's summary reads. Banner renders from the header alone; Zone 2 care team loads independently.
- Permissions: all roles who can open the record see identity; the care-plan builder button and write actions are not in the banner.
- Testing: unit render of every `PatientStatus` and every missing field; axe at 375, 768, 1440; zoom 400 percent check that banner unsticks; keyboard check that focused elements are not covered (2.4.11); a Playwright test that the banner is absent on `/patients`, `/review-queue`, `/schedule`, `/inbox`.

## 2. Decision CD-201: birth date and age

**Task.** Confirm identity against what the patient says or what is on a referral, and apply age-appropriate judgement. Information: birth date as the identifier, age as a sanity check. [Judgement]

**Evidence.** NHS Patient Banner [Observed above]: date labelled "Born", age in parentheses immediately after. Date formats are ambiguous when numeric (day-month versus month-day); this is general knowledge, not retrieved this session. [Judgement]

**Alternatives.** A: birth date only (today). B: age only. C: birth date with age in parentheses, month written as a word. D: numeric date.

**Gates.** B fails (age alone does not identify). D fails (ambiguous order is a wrong-patient risk). A and C pass.

**Weighted** (default weights): A: 3,5,3,3,4,5 = 3.70. B: ineligible. C: 5,5,5,4,4,4 = 4.70. D: ineligible (3,2,1,3,4,5 = 2.55). Arithmetic C = (125+125+100+60+40+20)/100.

**Selected C.** Format "Born 3 Mar 1989 (37 years)" in the clinician theme using the existing `formatLocalDate(..., true)` for the date; the screen-reader string spells the month and says "age 37". Age is computed from `birthDate` and today's date in the organization time zone, never stored. Under 2 years, show months (not expected in this product; implement the branch only when needed). Rejected A (clinicians do mental arithmetic), B, D. Patient onboarding birth-date input is family 1, not here.
Open: the banner's age and the record's `timezone` field (patient time zone) can differ from clinic time zone near midnight on a birthday; use the clinic zone and accept a one-day edge case. [Assumption]

## 3. Decision CD-202: MRN, name order, gender and other identity fields

- **MRN.** Always labelled "MRN", mono, tabular, selectable plain text. No copy button (an extra control with no evidenced need), no grouping or masking (the contract holds a plain string; do not invent a format). Appears in banner Zone 1 and the directory only.
- **Name.** Alternatives: given-first as stored (today), family-name-first with comma and upper-case family name (NHS Patient Banner [Observed] shows this and a preferred name under it), display-name plus legal name. Selected: given-first as stored, no case change. Reasons: contracts hold only `givenName` and `familyName`, no title and no preferred name, and the patient app and messages show given-first, so a reversal would create a cross-app mismatch. Risk: given and family names are easy to swap for some names, which is what the NHS pattern guards against. Mitigation: second identifier (CD-201). Open question: switch to "Family, Given" if wrong-patient incidents or testing show confusion. [Assumption, untested]
- **Gender.** Fetched, not displayed today. NHS shows it in the required set [Observed]. Here it is not needed to disambiguate, so show it in Zone 2 only, label "Gender", values Female, Male, Other, and "Not recorded" for `unknown`. Minimum-necessary on the always-visible line.
- **Preferred language, time zone.** Zone 2. Time zone leaves Zone 1 (today it competes with identity on the main line).
- **Care team.** Zone 2, names joined, role in words, truncate none (wrap); `onCareTeam` false shows "You are not on this patient's care team" as text in Zone 2 and the existing reason beside the disabled builder action in the workspace header.
- **Missing values.** The word "Not recorded" (self-explanatory text, per NHS evidence) not a dash.
- **Rejected:** deceased-patient variant (no field in the contract; do not add UI for data that does not exist).

## 4. Decision CD-203: stickiness, narrow widths and the page title

Alternatives: always sticky full height; sticky compact (shrinks to one line on scroll); non-sticky at top only; sticky but auto-unstick when tall. Selected: **one-line compact sticky bar below 1024 px, full banner at and above, and unstick when the banner is taller than 30 percent of the viewport (large text or 400 percent zoom)**. Evidence: NHS pattern says fixed and unobscured [Observed] but gives no zoom rule; WCAG 2.2 SC 2.4.11 and SC 1.4.10 [Standard]. The 30 percent value is a [Judgement] to be tested. Add `scroll-padding-top` equal to banner height so focused elements are never hidden. Compact content: name, MRN, status Tag, "Details" button; Born and age move to Zone 2 below 768 only if the line would wrap (name and MRN always stay; J's "always stays" list adds birth date, so keep Born at 768 and drop it at 375 and 390 into the one-tap details region, a documented exception to J). **Page title:** `document.title` becomes "Patient record | CarePath" (J weakness 7: names persist in history and window lists); the name stays in the h1.

## 5. Decision CD-204: telling patients apart in lists

Task: open the right record from a list, or act on a row (assign, mark reviewed, resolve). Alternatives: A name only; B name plus Born date; C name plus MRN; D initials avatar plus name; E photo. Gates: photo fails (no data, privacy); avatar fails to identify. Scores (default weights, scores for task/access/error/business/efficiency/cost): A 3,4,2,3,5,5 = 3.35 (fails the "two identifiers where action is taken" requirement, so conditional); B 4,4,4,4,4,4 = 4.00; C 4,4,4,4,4,4 = 4.00; D 2,3,2,2,3,4 = 2.45; E ineligible. Arithmetic B = (100+100+80+60+40+20)/100 = 4.00.
**Selected:** name link plus muted "Born {date}" on a second line wherever a row opens a record or acts on a patient (queue, schedule, overview work list, inbox conversation, admin patients); the directory keeps MRN and adds Born as a column. B and C tie; B chosen because Born is what staff verify aloud, and MRN stays in the directory and banner where it is the lookup key. **Rejected:** A, D, E. Read-only counts and the message thread header use name only. The name link text stays the patient's name (link purpose clear from the cell). Clickable-row behaviour is family 9. Banner is never shown on these screens (NHS rule [Observed]).

## 6. Decision CD-205: patient app, "who am I signed in as"

**Task.** A patient on a shared or borrowed device, or with more than one account, wants to know whose care information is on screen before reading, booking or messaging, and before signing out. Frequent: glanced at on opening; rarely acted on. [Assumption: shared devices exist; not evidenced]

**Constraints.** Display name only (`session.user.displayName` exists; the staff shell already uses it). No MRN or birth date on the patient's own screen (not needed; shoulder-surfing). Header already has two actions and wraps at 375.

**Alternatives.** A: nothing (today). B: plain text "Signed in as {name}" in the header beside Sign out. C: avatar button opening a menu with name, Sign out. D: "Account" page holding identity.

**Gates.** C: `DropdownMenu` is unused in product and hides Sign out one tap deeper (frequent-task rule in brief 8); not a hard fail but conditional on a tested menu. A: fails the visible-identity need. D: identity not visible on the main screens.

**Weighted** (default): A 2,4,2,3,5,5 = 3.10; B 4,5,4,4,5,5 = 4.40; C 4,3,4,3,3,2 = 3.40; D 2,4,3,3,2,4 = 2.95. Arithmetic B = (100+125+80+60+50+25)/100 = 4.40.

**Selected B.** Plain text line in the header: label "Signed in as" (caption, muted) over or beside the name (body); wraps to its own row at 375 and 390; the name wraps rather than truncates. Rejected C and D. No avatar. In the focused session layout (`variant="focus"`) the line is omitted (the "Today" back link and the task need the space; the user came from Today). Spec: component `SignedInAs` (patient frame local, `text-small`), `aria-label` none needed (visible text is the name), included in header landmark; announces on load only as part of normal reading order. Testing: 375 and 200 percent text size wrap check; demo role switch shows the correct name. Source: `session.user.displayName`.

## 7. Decision CD-206: staff shell signed-in identity

Reuse the existing pattern (Avatar initials, display name, role label in the `SideNav` footer, then Sign out). This is established and adequate; no alternatives invented. Change only: let the name wrap to two lines instead of `truncate` so a long name is fully readable (the cell has no hover alternative on touch or keyboard). Admin shell identical. Testing: long synthetic name at 1024.

## 8. Cross-cutting notes

- Pain and other clinical values are not part of identity; the J summary carries state.
- Banner copy uses "Not recorded", never "Unknown" for a missing field, and the `gender: unknown` enum value displays as "Not recorded".
- References listed as not accessed this session: CMS, USWDS, GOV.UK (no patient banner component exists there), Material 3, Apple HIG, Carbon, Spectrum, Fluent, Polaris, NN/g, Baymard. DHCW Patient Banner internals blocked.
