# Family 1: Clinical and health inputs

Status: provisional until the advisor signs off. Access date for every external source: 2026-11-20. Protocol: `component-research/PROTOCOL.md`. Source brief: `docs/COMPONENT-BRIEF.md` §7, §17, §19 to §23. Decision records: CD-100 to CD-111 in `docs/design/component-decisions/`. Prototype spec: `design-alternatives/prototypes/pain-input.md`.

Nothing here is clinical advice. Scores are heuristic judgements by the author, not measurements, and no user research was run. Colours are referred to by semantic token role only.

Evidence labels: **[Observed]** = retrieved or looked at in this session. **[Prior]** = from earlier CarePath research files, not re-retrieved today. **[Code]** = read in the repository today. **[Assumption]** = inference, not seen. **[Not retrieved]** = tried and failed; listed in the last section.

Builds on, and does not contradict, `feature-research/D-pain-reporting.md` (select D1 one-screen numeric rating) and `feature-research/A-onboarding.md` (select A1 linear steps; three-field date of birth marked "validate with users"). Where this file goes further it says so.

## 0. What the code does today [Code]

| Input | Where | Control today | Finding |
|---|---|---|---|
| Pain 0 to 10 (x3 in onboarding, check-in, stop sheet) | `packages/ui/src/components/pain-scale.tsx` | Radix radio group, 11 items, 6 columns below `@xl`, 11 above; each item `aria-label="n of 10"`; end labels `aria-hidden`; live line "You chose n of 10: mild/moderate/severe" | Severity words are attached to the patient's own number; the end anchors are hidden from screen readers, so a screen-reader user hears numbers but never "No pain" or "Worst pain"; the selected state is a fill colour change only (no mark seen in the item markup). |
| Date of birth | `onboarding-flow.tsx` ~562 | `<input type="date" autoComplete="bday">` inside `Field` | No format hint, no plausible-range rule found in the markup; behaviour varies by browser [Assumption]. |
| Goal target date, schedule day | `builder.tsx` ~786, `schedule.tsx` | native `type="date"` | Same; clinician only. |
| Goal target value and unit | `builder.tsx` ~763 to 790 | raw `<label>` + text input, free-text unit | Bypasses `Field`; no required/optional word, no error wiring. |
| Dose fields (sets, reps, hold, rest) | `plan/item-editor.tsx` `NumberField` | local component, raw label | Same bypass of `Field`. |
| Body area (10 values) and side (4 values) | `onboarding-flow.tsx` 670 to 705 | `RadioGroup` in `FieldGroup`, 2 columns from `sm`, illustration appears after choice | Fine; the picture is decorative and follows the choice. |
| Activity limitations (10 values, optional) | `onboarding-flow.tsx` 744 | checkbox grid, 2 columns | No "none of these" option; empty array means both "none" and "skipped". |
| Clinician preferences | `onboarding-flow.tsx` 787 to 807 | radio groups with a no-preference value | Fine. |
| Availability days (7) and times (3) | `onboarding-flow.tsx` 835 to 870 | checkbox groups | Fine. |
| Validation | `onboarding-flow.tsx` 134 to 203 | error summary with focus, per-field errors on step submit | Only onboarding has a summary (matrix finding). |
| Autosave | `intake.ts` header comment | per-step save with resume | Step is saved when the patient moves on, not per keystroke. |

Contract limits that bound every decision [Code]: `POST /patients/:id/check-ins` takes `painScore` integer 0 to 10 (required), optional `difficulty` and `notes`; there is no body area, side, timing or "prefer not to say" on a check-in. Intake has `bodyArea` from ten fixed values and `side` of left, right, both or not_applicable. `birthDate` is a local-date string.

## 1. Form control "when to use" (brief §7), compact decision table

How to read: pick the first row whose condition matches. "Native" means plain semantic HTML is the default and a library primitive is used only where the platform control fails a requirement. File upload is out of scope for this task (no upload feature exists in the contracts) and is listed only so the table is complete. Sources behind each row are in §2.

| Need | Use | Do not use when | CarePath instance | Basis |
|---|---|---|---|---|
| Free text, one line, known format | Text input in `Field` (visible label, hint, error); `autocomplete` and `inputmode` set | You are collecting a choice from a short fixed list | name, email, phone | GOV.UK date input and USWDS memorable date both say text type over number type for date parts; [Assumption] for other fields |
| Free text, more than one line, optional | Textarea with a character count only if a limit exists | The answer is really a choice | check-in note (1,000), limitation text (500), preference notes (500) | [Code] limits |
| One choice from 2 to about 7 options, all visible | Radio group in a fieldset with a legend; no preselected option | More than about 7 long options and screen height is tight; or search is needed | side, therapist gender, language, body area (10, two columns) | GOV.UK radios; [Observed] Headway and Cal AI use radio-style cards |
| One choice, 2 or 3 very short options that change a view or filter | Segmented control (tabs semantics if it changes a view, radio semantics if it sets a value) | The choice is a form answer that needs a legend and hint | "Show: Open / Closed" filter | Matrix finding G (select used for a two-state switch) |
| One choice from a long list the user knows | Native select (or Radix select); month names in date entry | Fewer than about 7 options (use radios) or the user needs to search (use combobox) | month in date of birth (CD-102), rows-per-page | USWDS memorable date (month as select) |
| One choice from a long list that must be searched | Combobox with filtering; the list stays reachable by keyboard | Fewer than about 15 options | clinician directory pickers, therapist assign (outside this family) | [Assumption]; APG combobox not retrieved |
| Several choices from a visible list | Checkbox group in a fieldset; add an exclusive "None of these" when none is a valid answer | The list is long enough to need a search, or the choice is a single on/off setting that applies at once | limitations, availability days and times | GOV.UK checkboxes |
| One on/off setting that takes effect at once and can be undone | Switch with a label that does not change | A deferred form answer (use checkbox); a consent choice (CD-140); anything that needs confirmation | none in the patient app after CD-140; notification settings if added | APG switch; Carbon toggle |
| One yes/no answer inside a form that is sent later | Checkbox, or a two-option radio group when "no" must be an explicit answer | The change applies at once | "I agree", confirm on review | GOV.UK checkboxes; Carbon toggle |
| A choice that needs a sentence of explanation per option | Selection cards: a radio or checkbox with a larger hit area, label plus one hint line | Options are self-explanatory (plain radios) or there are more than about 5 | none in intake today; allowed for the plan-type chooser if one is added | [Observed] Cal AI cards carry a one-line description |
| Filter or tag toggle, one tap, not a form answer | Toggle chip (`aria-pressed`) | It is a required answer or part of a legend-group form field | slot buttons, list filters | Matrix finding (chips hand-built) |
| Pick several from a very long list with search | Multi-select combobox with removable tags | The list is under about 12 items and fits on screen | none today | [Assumption] |
| Exact whole or decimal number the user knows | Text input with `inputmode`, unit shown beside it, `Field` wrapper | A rating on a published scale (use labelled numbered radios); a rough estimate (use radios) | dose fields, goal target | CD-110 |
| Small step change of a number the user already sees | Stepper (minus, value, plus) with the value editable as text | The number is the main answer and could be typed | none today; do not add for pain | CD-100 |
| Pain or symptom rating | Numbered radio group, anchors in the accessible name | Slider or dial | check-in, stop sheet, intake | CD-100 |
| Range slider | Only for an approximate preference that has a tap alternative and a visible value; never for a clinical value | A clinical or measured value; anywhere there is no text-entry alternative | none | WCAG 2.5.7; APG slider; CD-100 |
| Date the user knows by heart (birth date) | Three-field date: day text, month select, year text, grouped with a legend | The user would need a calendar | date of birth | CD-102 |
| Choose an available appointment date | Date strip or list of available days, then time slots | Free typing of a date the system may not offer | booking | CD-103 |
| Arbitrary future date set by staff | Native date input with label, format hint, min and max, linked error | Unconstrained dates; patient flows | goal target date, schedule jump | CD-104 |
| Time of day | Slot buttons for offered times; text or select for arbitrary times | Free time entry for booked slots | booking | [Observed] Fresha, Future Pro slot lists |
| Editable tables, inline editing, structured clinical editors | Out of this family (families 3 and 9) | | plan builder rows | |
| File upload | Not in scope here | | none | |

## 2. Sources used in this file

All accessed 2026-11-20. `[Observed]` rows were retrieved and read. Quotes, where present, are under 15 words.

| Source | URL | What it says (paraphrased) |
|---|---|---|
| GOV.UK Design System, Date input | https://design-system.service.gov.uk/components/date-input/ | Use for dates users know or can look up without a calendar; three text fields in a fieldset with a legend; hint with a valid example; accept month names; do not auto-advance focus; `bday-day`, `bday-month`, `bday-year` autocomplete needed for WCAG 1.3.5; text with numeric inputmode rather than number or date types; specific errors ("must be a real date", "must be in the past"). The page does not discuss appointment dates. |
| NHS service manual, Date input | https://service-manual.nhs.uk/design-system/components/date-input | Same component for the NHS; gives an appointment date as the example of a date users know; same autocomplete guidance for birth dates; hint such as "For example, 18 10 2026"; notes GOV.UK is still researching whether users struggle to type months as numbers. First 100,000 of 101,620 characters read. |
| USWDS, Date picker | https://designsystem.digital.gov/components/date-picker/ | Date picker for scheduling or recording events where the calendar or weekday matters (appointment is its example); memorable date for birthdays; always allow typing; show a format hint; do not auto-submit on selection; typed entry is a known difficulty. |
| USWDS, Memorable date | https://designsystem.digital.gov/components/memorable-date/ | Month is a select with month names only (changed after usability testing); day and year are text fields; no auto-advance; text not number types; one hint per field; some screen-reader users still struggle with format. |
| GOV.UK, Radios | https://design-system.service.gov.uk/components/radios/ | Radios for one choice, checkboxes for several; do not preselect; add "none"/"I do not know" when valid; group in a fieldset with a legend; conditional reveal has a known screen-reader announcement problem, keep revealed questions simple; specific errors. |
| GOV.UK, Checkboxes | https://design-system.service.gov.uk/components/checkboxes/ | Checkboxes for several options or one on/off option; add an exclusive "none" option, last, behind an "or" divider; group hint "Select all that apply"; do not preselect. |
| GOV.UK, Error summary | https://design-system.service.gov.uk/components/error-summary/ | Always show a summary on a validation error, with focus moved to it, links to the first field of each error, wording identical to the inline message, "Error:" prefix in the page title. Gives no explicit rule on when to validate. |
| NN/g, Error-message guidelines | https://www.nngroup.com/articles/errors-forms-design-guidelines/ | Validate after the user leaves the field, not while typing; live feedback is for complex fields like passwords; message next to the field with a summary as an addition, not a replacement; avoid tooltips for errors; combine colour with an icon. Does not discuss keeping entered values. |
| Carbon, Toggle usage | https://carbondesignsystem.com/components/toggle/usage/ | Toggle only for binary settings that apply immediately and reverse without confirmation; checkbox plus a button for anything deferred or non-binary; not for more than two options. |
| WAI-ARIA APG, Slider | https://www.w3.org/WAI/ARIA/apg/patterns/slider/ | Arrow, Home, End, Page keys; `aria-valuetext` for meaningful value text including a ten-point rating; touch assistive technology may not support slider gestures, test before production. |
| WCAG 2.2, 2.5.7 Dragging Movements (Understanding) | https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html | Anything done by dragging must work with a single pointer without dragging; for a slider, tap on the track or a text input beside it. |
| WCAG 2.2, 3.3.7 Redundant Entry (Understanding) | https://www.w3.org/WAI/WCAG22/Understanding/redundant-entry.html | In a multi-step process, information already given must be auto-filled or selectable; exceptions for essential re-entry, security, and invalid data. |
| Mobbin, date of birth screens (iOS) | On https://mobbin.com/screens/8cc21f85-22b2-48b7-b78e-0c632842c989 ; Wealthfront https://mobbin.com/screens/3368a40e-a7a2-48d9-a974-341f930e7057 ; Cal AI https://mobbin.com/screens/b652d1b5-0cdf-4c75-bc35-ff74bd0da7e8 ; CapCut https://mobbin.com/screens/1ad87d0a-369a-4f9a-acf2-2b8f42a99113 ; Neo Financial https://mobbin.com/screens/301874b4-5205-49c9-ae0b-22eebb28a40e | [Observed] None is a healthcare product. On: one field with label "Date" and an `mm/dd/yyyy` placeholder, number keyboard, Skip link. Wealthfront: one field with a label, a stated reason ("to open your account"). Cal AI: three scroll wheels (month, day, year). CapCut: year and "month day" fields with scroll wheels beneath. Neo Financial: one field with a calendar icon and a read-back line, "This would make you 26 years old. Is that correct?". |
| Mobbin, appointment date and time (iOS) | Fresha https://mobbin.com/screens/d411fbb9-4912-4e43-8bc4-b5dd4422f6a8 ; Future Pro https://mobbin.com/screens/56a56b7d-7c3b-4137-8113-d729758477b6 ; Reddit https://mobbin.com/screens/72ee765f-73be-4b79-a9ab-b56cf07983b1 ; Structured https://mobbin.com/screens/a5f31dc9-8707-447a-9ae4-7ec2e9a4a802 | [Observed] Fresha: a row of date buttons with unavailable days greyed, then a list of times. Future Pro: date pills, a two-column grid of times, a "None of these times work for me" option, and a bottom button that names the chosen slot ("Book Thu, Jul 2 at 12:00..."). Reddit (scheduling an AMA): month grid with past days greyed, a time chip. Structured: a month sheet with per-day markers. Only Fresha and Future Pro are booking products; neither is clinical. |
| Mobbin, single-choice and multi-choice cards (iOS) | Headway https://mobbin.com/screens/c0de1b6d-2cb6-4f5d-b91a-2c6b8429eb6f ; Cal AI https://mobbin.com/screens/61625409-a50e-4f17-b03e-0cf0472aa471 ; On https://mobbin.com/screens/e888ef87-3e73-4ca6-9ac5-d3a2807ac0cb ; Ladder https://mobbin.com/screens/e6eb44d5-6260-4c78-bb6e-89c7b728d7bc ; ClassPass https://mobbin.com/screens/f1c499b1-0561-48f5-9238-7358d97bbf5d ; Flo https://mobbin.com/screens/ac738e9a-4e79-45c8-bc56-7d227efc4242 ; Stardust https://mobbin.com/screens/7d25b2a5-03b3-4d62-914e-efa73c159f76 | [Observed] Headway: cards with a radio indicator at the right and "Choose one", Continue below. Cal AI: cards with a title, one description line, radio at the right. On: image cards, selected shown by a dark border only, Skip link. Ladder: outlined option rows, no indicator, selection not visible in the frame. ClassPass: list rows with chevrons that advance on tap. Flo: tall cards, "Choose as many as you'd like", selected shown by a coloured border and no visible checkbox. Stardust (cycle app): a checkbox list under "Health Conditions" with a Confirm button. Cards with an indicator tell the user the count; cards with border-only selection do not. |
| Mobbin, body area | How We Feel https://mobbin.com/screens/54ecbc17-e508-4bec-bbaf-a3f7d50dc361 | [Observed] A dotted 3D body figure, a draggable dot with a tag "Tight +2", a Done button; no list in the frame. |
| Feature research D (pain) | `docs/design/feature-research/D-pain-reporting.md` | Hawker 2011, LOINC, PROMIS, Wong-Baker, BPI, PEG, Boonstra 2016, Bevel and Noom drag-only frames: see that file's §6; not re-retrieved here. |

## 3. Decisions

Weights default to 25 task effectiveness, 25 accessibility and usability, 20 error prevention and trust, 15 business and operational value, 10 interaction efficiency, 5 implementation and maintenance cost unless stated. Scores 1 to 5, heuristic. "Gate" = mandatory accessibility, privacy or safety requirement; failing one removes an option whatever its score.

---

### CD-100. Pain and symptom intensity entry

**1. Task and journey.** The patient tells the therapist how much it hurts: at a stop mid-session, at the end of a session, at daily check-in, and three times in onboarding (now, worst last week, best last week). Needs: the question, the scale ends, a way to pick one integer, a clear sign that it was chosen. Action: choose a number and send.

**2. Requirements.** The API stores an integer 0 to 10 as a patient-reported observation and a clinic rule reads it. Must take seconds, one-handed, possibly in pain or with a tremor. Never label the number with an interpretation. Scale wording and thresholds need clinical sign-off [Prior: feature D].

**3. Production examples.** [Observed, feature D table and today's frames] Crumbl 0 to 10 row (eleven small squares); Bevel effort dial and Noom mood slider (drag-based); Visible symptom matrix (word buttons 0 to 3); How We Feel, grid and dot (drag). [Prior from feature D] Hinge logs pain by area; no rehab pain-entry screen was found on Mobbin. Gap: no healthcare production example of a pain control was observable; the evidence is the instrument literature (Hawker: numeric rating scale is valid, point-of-care, intensity only; LOINC wording) plus the failure of the drag-only examples against WCAG 2.5.7.

**4. Design-system guidance.** WCAG 2.5.7 requires a non-drag way for a slider; the Understanding page names tap-on-track or a text input as options. APG slider says to test touch assistive technology before production and allows `aria-valuetext` for a ten-point rating. GOV.UK radios: group with a legend, no preselect. NHS and CMS: no pain-scale component retrieved [Not retrieved].

**5. Alternatives (structurally different).** A: numbered radio group 0 to 10 (current build, refined). B: word-labelled radios (None, Mild, Moderate, Severe). C: slider or dial 0 to 10. D: numeric text input. E: stepper (minus, number, plus).

**6. Gates.**

| Gate | A | B | C | D | E |
|---|---|---|---|---|---|
| Accessibility (2.5.7, 2.5.8, keyboard) | Pass | Pass | **Fail unless a tap or text alternative is added** (and project rule forbids a slider for precise clinical input, brief §7) | Pass | Pass (48 px buttons) |
| Privacy | Pass | Pass | Pass | Pass | Pass |
| Safety (valid for the 0 to 10 observation and rule; no interpretation) | Pass after removing severity words | **Fail**: four bands cannot feed a 0 to 10 integer or the existing rule, and the words are CarePath's own scale | Conditional: false precision from a thumb position | Pass | Pass |

B and C are excluded at the gate and not scored (same finding as feature D for D3 and the slider).

**7. Weighted evaluation (heuristic).** Defaults.

| Criterion | A numbered radios | D text input | E stepper |
|---|---|---|---|
| Task effectiveness (25) | 4 | 3 | 2 |
| Accessibility and usability (25) | 5 | 4 | 3 |
| Error prevention and trust (20) | 4 | 3 | 3 |
| Business and operational (15) | 4 | 3 | 3 |
| Interaction efficiency (10) | 5 | 4 | 2 |
| Implementation cost (5) | 5 | 5 | 4 |
| **Total (of 5)** | **4.40** | **3.45** | **2.70** |

Arithmetic for A: (100 + 125 + 80 + 60 + 50 + 25) / 100 = 4.40. D: (75 + 100 + 60 + 45 + 40 + 25) / 100 = 3.45. E: (50 + 75 + 60 + 45 + 20 + 20) / 100 = 2.70.

**8. Selected: A, numbered radio group, refined.** Rejected: B (fails safety gate), C (fails accessibility gate as built; adding a text field turns it into D), D (typing invites out-of-range and decimal entry, slower for a patient in pain), E (many taps to reach a high number; no exact jump). Differs from the current build in four ways: severity words removed from the live line; both end anchors reachable by screen reader; selected state carries a mark as well as a fill; stop-sheet value preselected on the check-in with a visible note. Three-way prototype comparison is specified in `design-alternatives/prototypes/pain-input.md`.

**9. Spec: PainScale (NumericRatingScale).**
- Anatomy: legend (the question, visible), hint line (visible, linked), eleven radio items, two end anchors, live line, optional "You told us n when you stopped" note.
- Usage: any patient-reported 0 to 10 intensity that maps to the stored observation. When not to use: any other instrument (wording belongs to its owner), symptoms with no 0 to 10 mapping, a clinician assessment (must be visually and verbally distinct as "clinician assessed").
- Variants: none beyond label text. Do not add a "compact" variant that drops the 48 px target.
- States (§22): default (nothing selected, no preselect); hover; focus-visible (ring on the focused item; arrow keys move and select); selected (fill plus check mark plus live text); disabled (while sending; keep the chosen number visible); error ("Choose a pain number from 0 to 10 before you send this", focus to the first item); partial data (preselected from a stop, with the note); read-only (clinician display as text, "Pain 7 of 10 (patient-reported)", not this control); network lost (value and note stay); long content (the legend wraps; anchors wrap under the rows).
- Accessible name: each item "n of 10"; the end items "0 of 10, no pain" and "10 of 10, worst pain imaginable" [wording pending clinical review]. The anchors are visible text and also in the names. Group has `aria-describedby` for the hint.
- Live line: "You chose 7 of 10." Nothing else. No band word, no colour change, no praise.
- Keyboard: Tab enters the group once; arrows move and select (Radix radio group); Home and End are not specified by the radio pattern, so do not promise them.
- Screen reader: on selection, polite announcement "You chose 7 of 10".
- Responsive (§23): below the container width where eleven items would drop under 48 px, two rows (0 to 5, 6 to 10) and anchors under the rows; at 200 percent zoom the two-row layout holds; at 768 and above one row of eleven when each item is at least 48 px. Reflow at 320 CSS px: three rows are acceptable if each item stays at least 48 px wide [Assumption; needs a render check].
- Data: `painScore` integer; `difficulty`, `notes` are separate fields outside this component.
- Loading and error: sending state on the button, not on the scale; failed send keeps the value.
- Permissions: patient role only; clinicians see the value as text.
- Tests: arrow-key selection; announcement text; no severity words in rendered output (copy test against the banned list plus the words mild, moderate, severe); item hit area at least 48 px at 320, 375 and 390 wide; selected state visible in forced-colours and greyscale; the end anchors are in the accessibility tree.

---

### CD-101. Pain scale wording, anchors and interpretation

Conventional element with a measurement-integrity rule, so no alternatives are invented. **Selected:** two end anchors "0 No pain" and "10 Worst pain imaginable" (LOINC definition wording [Observed, feature D]; clinical review required), no band labels, live line states only the number. **Why:** the three cut-point schemes in Boonstra 2016 (3 and 6, 4 and 6, 5 and 7; same paper reports 5 and 7 as most often optimal in its sample) disagree, so any band word the screen prints is a claim CarePath cannot support. **Rejected:** keeping "mild, moderate, severe" under the number; Wong-Baker faces (licence, no modification, colour not permitted: feature D). **Gate:** safety, pass. **Validation:** comprehension check of the anchors with at least five adults including two over 60 (not run).

---

### CD-102. Date of birth entry

**1. Task and journey.** A new patient enters their own date of birth in onboarding step 3, so the clinic can match them to their record. They know the date by heart. Needs: format, reason, a way to correct. One-time, high stakes for record matching.

**2. Requirements.** `birthDate` is a local date. A wrong date can mismatch the record. Browser autofill and password-manager support help. Healthcare: DOB is an identifier; show it only to the patient and care team (existing copy says so).

**3. Examples.** [Observed] Four consumer products (On, Wealthfront, CapCut, Neo Financial) use one text field or a field pair; Cal AI and CapCut use scroll wheels; Neo Financial reads the age back. None is a healthcare product and none shows an error state in the frames I saw. [Observed, official] GOV.UK and NHS use three text fields; USWDS uses day text, month select, year text.

**4. Guidance.** GOV.UK: dates users know by heart use three text fields in a fieldset with a legend, a hint with a real example date, birth-date autocomplete tokens (needed for WCAG 1.3.5), no auto-advance, text with numeric inputmode, specific errors. NHS: same, with an appointment date as its own example of a "known" date. USWDS: month as a select with month names only after usability testing, no auto-advance, one hint per field. WCAG 1.3.5 and 3.3.1 apply.

**5. Alternatives.** A: three-field date (day text, month select, year text) in a fieldset. B: native `<input type="date">` (current). C: one masked text field `mm/dd/yyyy`. D: scroll-wheel picker.

**6. Gates.** Accessibility: A pass; B conditional (browser-dependent, no visible format guidance) [Assumption]; C conditional (mask behaviour with screen readers untested); D conditional-fail on web (a custom wheel needs full keyboard and screen-reader support that no source retrieved supplies). Privacy: all pass. Safety: all pass; wrong value is a data-quality risk, mitigated by review page.

**7. Evaluation (defaults).** A 4,5,5,4,3,3 = **4.30**. B 3,3,3,3,4,5 = **3.20**. C 3,3,3,3,4,4 = **3.15**. D 2,2,3,3,3,2 = **2.45**. Arithmetic A: (100 + 125 + 100 + 60 + 30 + 15) / 100 = 4.30.

**8. Selected: A.** Matches NHS, GOV.UK and USWDS. Rejected B (no format control, relies on the browser), C (mask edge cases), D (inaccessible pattern on web). The one place CarePath departs from GOV.UK and NHS is the month select: it follows USWDS, whose page reports usability testing for it, while NHS notes the numeric-month question is still open. Mark U: test text month versus select with older adults.

**9. Spec: DateOfBirthField.**
- Anatomy: fieldset with a legend "Date of birth", a hint "For example, 18 10 1962" (use an unambiguous example, and use this on-page example only if clinical copy review agrees), day text input (width for 2 digits), month select with month names (no numbers), year text input (4 digits), a reason line ("The clinic uses it to match you to your record"), error message.
- Usage: a known past date of the user's own. When not to use: a future date, or a date the user must look up.
- States: default; focus-visible; error whole-group (a red border and message on all three when the whole date is wrong) or on the single part at fault; disabled not used; read-only on the review page as text "18 October 1962"; partial data (some parts filled: "Date of birth must include a month"); missing; long content n/a; stale n/a.
- Behaviour: no auto-advance. Normalise on blur of the group: trim, accept two-digit day. Validate on blur of the last part and on step submit: complete, real date, not in the future, and plausible year range (for example 1900 to today) [clinical or product rule needed]. Error priority: incomplete, then impossible, then out of range. Preserve entered parts on error.
- Autocomplete: `bday-day`, `bday-month`, `bday-year`. Inputs `type="text"`, `inputmode="numeric"` for day and year.
- Keyboard: Tab through three controls; the select opens with the platform behaviour.
- Screen reader: legend read once with the first input; hint linked by `aria-describedby`; error announced via the error summary and linked from it to the first field with a problem.
- Responsive: three parts stay on one row at 320 CSS px (day about 4 characters, month select about 10 characters, year about 5) [Assumption: render check needed]; at large text the row may wrap, not scroll.
- Data: submits `birthDate` as a local date `YYYY-MM-DD`; if it is later shown elsewhere it is formatted by the shared formatter.
- Loading and error: saves with the step. Permissions: patient only on entry; staff read it on the record.
- Tests: autofill from a browser profile fills all three; each error message; no focus jump; 320 px reflow; the summary links to the right part; the read-back on review matches the entry.

---

### CD-103. Future appointment date selection (patient booking)

**1. Task and journey.** The patient wants the soonest suitable time with their therapist. They do not know which dates are available. Action: pick an available day, then an available time, then confirm. Family 4 owns the full booking flow; this record decides only the date control.

**2. Requirements.** Only offered slots can be booked; conflicts happen (a slot taken). Time zone is the clinic's, shown with a name. A booking is not shown as made until the server confirms (brief §14).

**3. Examples.** [Observed] Fresha: date buttons with unavailable days greyed, then a time list. Future Pro: date pills, two-column time grid, "None of these times work for me", and a bottom button that names the slot. Reddit and Structured: month grids with past or other days dimmed. None is a clinical booking flow.

**4. Guidance.** USWDS date picker: a calendar suits scheduling where the weekday matters; also always allow typing; restrict unavailable dates rather than disabling the control; do not auto-submit on selection. GOV.UK and NHS date input: for dates users know; GOV.UK does not address appointment dates. WCAG 2.5.8: targets at least 24 px; the house floor is 48 px for patients.

**5. Alternatives.** A: strip or list of available days plus a slot list. B: monthly calendar popover with a time list. C: free typed date plus time select.

**6. Gates.** Accessibility: A pass (buttons or radios); B conditional (a calendar grid needs the full grid keyboard model); C pass but a typed date may not exist as a slot. Safety and privacy: pass.

**7. Evaluation (defaults).** A 4,4,5,5,5,4 = **4.45**. B 3,3,4,4,3,2 = **3.30**. C 2,3,2,2,2,5 = **2.40**. A: (100 + 100 + 100 + 75 + 50 + 20) / 100 = 4.45.

**8. Selected: A, list of available days, then slots.** This keeps the existing `/appointments/book` model. Rejected B (adds a heavy grid for a list that already is short; the matrix says the product is list-only by design), C (invites unavailable dates). Fix the existing gap: a day chip needs a selected state and the slot chip needs a pressed or selected state (matrix finding: slot chips go straight to step 2). The bottom button names the slot (observed in Future Pro; [Assumption] it reduces wrong bookings). Add "None of these times work for me" leading to a message to the care team (observed in Future Pro; needs the messaging contract, a family 4 call).

**9. Spec (date control only).** Days as a radio group of buttons (single choice), each with the weekday, day and month; unavailable days omitted or shown as text with a reason ("No times left"); slots as a second radio group; a visible selected summary; "Show later days" as a normal button. Keyboard: arrow keys within a group, Tab between groups. Screen reader: group legends "Choose a day" and "Choose a time", selected state announced, a live line when the time list changes after a day is chosen ("3 times on Thursday 2 July"). Responsive: day strip wraps to a grid rather than scrolling horizontally at 320 px. Loading: skeleton list; error: "We could not load times. Try again." with the previous choice kept. Conflict: "That time was just taken. Choose another time" with the list refreshed and focus on the heading of the times. Tests: no slot is bookable that the API did not return; selected state not by colour alone; targets at least 48 px; time zone name shown.

---

### CD-104. Future date set by staff (goal target date, schedule jump)

**1. Task.** A clinician sets a goal target date or jumps the schedule to a day. Desktop, keyboard and mouse, repeated use.

**2. Requirements.** Date must be in the future for a target; a schedule jump may be past or future.

**3. Examples.** USWDS date picker (appointment and scheduling), GOV.UK and NHS date input [Observed, official]. No clinician-tool screen was retrieved. [Assumption] Linear and Stripe date fields, not retrieved.

**4. Guidance.** USWDS: date picker for scheduling or recording events; always allow typing; format hint; use date restrictions rather than disabling; known difficulty typing. GOV.UK errors: "must be in the future".

**5. Alternatives.** A: text field with a format hint plus a calendar popover button. B: three-field memorable date. C: native `type="date"` with label, hint, min and max, linked error (current, tightened).

**6. Gates.** Accessibility: A conditional (custom calendar needs the full dialog and grid behaviour); B pass; C conditional (user-agent control exempt from target size under WCAG 2.5.8 if unmodified; behaviour varies by browser). Privacy and safety pass.

**7. Evaluation (defaults).** A 4,3,4,4,4,1 = **3.60**. B 3,5,4,3,3,4 = **3.75**. C 4,3,3,4,5,5 = **3.70**. A: (100 + 75 + 80 + 60 + 40 + 5) / 100 = 3.60. The three are within heuristic noise.

**8. Selected: C, native date input, constrained, for staff only.** Reason: the scores do not separate the options, so the cheapest control that the platform supports and keyboard users already know wins; a custom calendar carries the highest accessibility risk. Fallback if the browser test matrix fails: B. Rejected A for build and accessibility cost, B for slower repeated use. Required changes: visible format hint; `min` for a target date; error text "Target date must be in the future"; wire through `Field` (the goal row bypasses it today).

**9. Spec.** Native input inside `Field` (label, hint, error). Keyboard per browser. Test matrix: Chrome, Safari, Firefox, keyboard and screen reader, record results; never auto-submit on change. Not for patient flows.

---

### CD-105. Intake single-choice questions: radios or selection cards

**1. Task.** Patients answer short intake questions: side, therapist gender, therapist language, body area. Each has a known set of options. Needs: all options visible, one answer, a way to say no preference.

**2. Requirements.** Required versus optional said in words; a "no preference" or "not applicable" value exists in the contract for side, gender and language.

**3. Examples.** [Observed] Headway and Cal AI use radio-styled cards with an indicator and "Choose one"; On uses image cards with border-only selection; ClassPass uses chevron rows that advance on tap; Ladder uses outlined rows with no visible indicator. All are consumer onboarding, not clinical.

**4. Guidance.** GOV.UK radios: legend, no preselect, add "or" option when needed, inline only for two short options; do not use conditional reveal for complex questions. WCAG 1.4.1: selection not by colour alone.

**5. Alternatives.** A: plain radio group. B: selection cards (radio with a larger card and a description line). C: select menu.

**6. Gates.** Accessibility: A pass; B pass only if built as real radios with the card as the label and an indicator; border-only selection fails the not-by-colour-alone check; C pass but hides options. Safety, privacy pass.

**7. Evaluation (defaults).** A 4,5,4,4,4,5 = **4.30**. B 3,4,4,3,4,3 = **3.55**. C 2,3,3,3,2,5 = **2.75**.

**8. Selected: A, radio group in a fieldset.** Options are short and self-explanatory, so cards add height without information. Selection cards are allowed only where each option needs its own sentence (none today). Rejected B as default, C because it hides a short list. Advance-on-tap (ClassPass) is rejected: it prevents review and correction. **Spec:** existing `RadioGroup`/`FieldGroup`; legend visible; "Required" or "Optional" word; no preselect; error "Select a side" linked to the first option. Selection card variant, if ever used: real `<input type="radio">` semantics, indicator visible, card border plus indicator, hit area the whole card, description linked by `aria-describedby`.

---

### CD-106. Body area selection

**1. Task.** The patient says which body area the plan is for, and which side. Contract: ten fixed areas, four side values. One per patient at intake.

**2. Requirements.** No anatomical claims; art direction forbids instructional imagery. The area drives plan matching, not a finding.

**3. Examples.** [Observed] How We Feel: pointer-first body figure with a draggable dot and no list in the frame. [Observed] Stardust: a checkbox list of conditions. [Prior, feature D] Hinge logs by body area from a list.

**4. Guidance.** WCAG 2.5.7 (drag needs an alternative), 2.5.8 (small body regions are small targets). GOV.UK radios for a short list.

**5. Alternatives.** A: radio list, two columns, with a decorative illustration after the choice (current). B: tappable body figure with a parallel list. C: searchable combobox.

**6. Gates.** Accessibility: A pass; B conditional (needs a list that does the same job; regions small); C pass. Safety: B conditional (figure must not imply a finding). Privacy pass.

**7. Evaluation (defaults).** A 4,5,4,4,4,5 = **4.30**. B 3,2,3,3,3,1 = **2.65**. C 2,4,3,3,3,3 = **3.00**.

**8. Selected: A.** Ten options fit on screen; search is not needed. Rejected B (list already does the job, pointer precision, asset cost, risk of anatomical implication), C (no search need). Side is a separate radio group, so the patient is never asked to tap left or right on a figure. Spec: as CD-105; the illustration has empty alt text because it is decorative and follows, never replaces, the label.

---

### CD-107. Treatment preferences and limitations: checkboxes or multi-select

**1. Task.** Patients tick activities that are harder (10 options, optional) and availability days (7) and times (3). Staff read the result.

**2. Requirements.** Empty must be distinguishable from skipped where it matters [contract: `limitations` array may be empty with no skip flag].

**3. Examples.** [Observed] Stardust uses a checkbox list with a confirm button. Flo uses multi-select cards ("Choose as many as you'd like"), border-only selection. [Observed, official] GOV.UK: checkboxes with an exclusive "none" option.

**4. Guidance.** GOV.UK checkboxes: group hint "Select all that apply", exclusive "none" last behind "or", no preselect.

**5. Alternatives.** A: checkbox group with an exclusive "None of these" for limitations. B: multi-select dropdown with tags. C: toggle chips.

**6. Gates.** Accessibility: A pass; B conditional (hidden options, tag removal needs keyboard handling); C pass if `aria-pressed` and group legend, but a chip group is not a form field unless built as a labelled group. Privacy, safety pass.

**7. Evaluation (defaults).** A 4,5,5,4,4,5 = **4.50**. B 2,3,3,3,3,3 = **2.75**. C 3,3,3,3,4,3 = **3.10**.

**8. Selected: A.** Rejected B (hides ten visible short options), C (keep chips for filters and slot picks). Add "None of these" as an exclusive item at the end for limitations. The contract cannot tell "none" from "skipped"; stating the intent is enough for the UI, and a stored distinction is an optional contract request (CR-1-01, below). Spec: `FieldGroup` with legend and hint "Select all that apply"; items at least 48 px; exclusive behaviour is a client rule (checking "None of these" clears the rest; checking another clears it); the announcement on exclusive change is polite ("Other choices cleared").

---

### CD-108. Validation timing and error presentation

**1. Task.** Patients and clinicians fix input mistakes without losing work or hunting for the problem.

**2. Requirements.** Errors must not be the only record of important clinical issues (brief §14); preserve entered values; WCAG 3.3.1 and 3.3.3.

**3. Examples.** [Observed, official] GOV.UK: summary on every validation error, focus to it, links to first field. NN/g: validate after leaving a field, not while typing; field-level message beside the field. CarePath today: onboarding has a summary and field errors; other forms have local alert markup (matrix finding).

**4. Guidance.** As above; GOV.UK gives no explicit timing rule; NN/g gives one.

**5. Alternatives.** A: validate on submit only, with summary. B: validate on blur everywhere. C: validate on every keystroke. D: hybrid: required and cross-field checks on submit with a summary; format-only checks on blur after the first visit to the field; once a field has shown an error, clear it as soon as it is valid.

**6. Gates.** Accessibility: all pass if errors are linked and announced; C fails for screen-reader users in practice if each keystroke is announced [Assumption]. Safety: pass.

**7. Evaluation (defaults).** A 4,5,5,4,4,4 = **4.45**. B 3,3,3,3,4,4 = **3.15**. C 2,2,2,3,3,4 = **2.35**. D 5,5,5,4,4,3 = **4.65**. D: (125 + 125 + 100 + 60 + 40 + 15) / 100 = 4.65. D and A differ by 0.20, inside heuristic noise; D is selected because it finds a bad format before a long form is finished.

**8. Selected: D.** Rejected B (premature "required" errors on tab-through), C (premature and noisy). Pain scale: no blur validation (a radio group has no format error); required check on submit only.

**9. Spec: FieldError, ErrorSummary (merge of the eight local error blocks).** Summary at the top of the form container, heading "There is a problem", links to the first field (first radio, first date part), same wording as the inline message, focus moved to the summary on submit, "Error:" prefix in the page or view title. Inline message below the field, with an icon and text, not colour alone; `aria-invalid` and `aria-describedby` on the control. Failed send: "Not saved. What you entered is still here." persists until acted on, not a toast. Specific messages ("Date of birth must include a month"). Tests: summary focus; each link lands on its field; values preserved after server error; no announcement on keystroke.

---

### CD-109. Autosave and draft handling for patient forms

**1. Task.** A patient is interrupted in the nine-step intake or in a check-in; they return and expect their answers.

**2. Requirements.** Intake saves per step (AC-A1). Typed account fields (never the password) may be kept in tab storage (feature A). A check-in is not saved until sent.

**3. Examples.** [Observed] Visible and Flo commit with a Next or Apply button, not per field. [Prior, feature A and D] Hims one-question screens.

**4. Guidance.** WCAG 3.3.7 (no re-asking); 2.2.1 not triggered because there is no time limit on intake. [Assumption] no healthcare design-system page on autosave retrieved.

**5. Alternatives.** A: save at each step commit, with a local draft for the current step and a status line. B: save every field as it changes. C: one explicit Save at the end.

**6. Gates.** Privacy: draft in tab (session) storage only, cleared on sign-out; passwords never stored. Safety pass. Accessibility: the status line must be polite, not stealing focus.

**7. Evaluation (defaults).** A 4,5,5,5,4,4 = **4.60**. B 3,3,3,4,5,2 = **3.30**. C 3,4,4,3,2,5 = **3.45**.

**8. Selected: A.** Rejected B (many requests, half-validated data stored, noisy announcements), C (a lost session loses everything). **Spec:** on Next, save the step; show "Saved" as a polite status line only on success of a step; on failure show a persistent inline message "This step was not saved. What you entered is still here" with Try again; the check-in keeps number and note in the tab until sent; leaving with unsent input shows "Your check-in has not been sent" with Leave and Stay (feature D state table). Clinician plan-builder autosave belongs to family 10.

---

### CD-110. Dose and goal numbers (clinician)

**1. Task.** A clinician sets sets, reps, hold seconds, rest seconds, and a goal target value and unit.

**2. Requirements.** Integer or decimal in a known range; unit matters; wrong values reach the patient's plan.

**3. Examples.** [Observed, official] GOV.UK and USWDS use text with numeric inputmode instead of number types for date parts. [Assumption] No source retrieved on dose entry controls; no clinical product screen observed.

**4. Guidance.** Brief §7: use sliders for precise clinical input only with research; use text input for exact values. WCAG 3.3.2 labels; 3.3.1 errors.

**5. Alternatives.** A: text input with `inputmode`, unit beside it, `Field` wrapper, range error. B: `type="number"` with spin buttons. C: stepper buttons. D: slider (gate fail: precise clinical value, drag).

**6. Gates.** Slider fails the safety rule (false precision) and drag unless text is added, so it is out. Others pass.

**7. Evaluation (defaults).** A 4,5,4,4,5,5 = **4.40**. B 3,3,3,3,4,5 = **3.20**. C 3,4,3,3,3,3 = **3.25**.

**8. Selected: A.** Rejected B (scroll-wheel and arrow changes silently change values; spin buttons are small targets [Assumption]), C (slow for a value the clinician knows). Unit: a closed list in a select, not free text [Expert judgement; no source]; today free text creates variants of the same unit. **Spec:** `Field` with label, requirement word, hint with the allowed range ("1 to 20"), unit as a visible suffix inside the same row, error "Sets must be a whole number from 1 to 20". Merge `NumberField` and the goal fields into `Field`.

---

### CD-111. Form-control selection rules

A documentation decision: adopt the §1 table as the house rule so new forms do not invent controls. **Selected:** the table. **Rejected:** per-feature choice. **Validation:** design review checklist; the Storybook usage page for each control links its row.

## 4. Contract requests (not made here)

- **CR-1-01 (optional):** distinguish "none" from "skipped" for limitations (for example `limitations: null` for skipped).
- **CR-1-02 (optional, carried from feature D):** add body area and timing to the check-in only if feature D2 is revived.
- Clinical review items: anchor wording for the end labels; plausible date-of-birth range; unit list for goals.

## 5. References not accessible

Fetch failed or not available: GOV.UK "Ask users for dates" pattern page (so appointment-versus-birth guidance rests on the date-input, NHS and USWDS pages); NN/g slider article; NHS and CMS pain-scale components (none found); Apple HIG toggles and Material 3 switch pages (JavaScript-only, no usable text); HHS HIPAA authorizations page and eCFR 164.508 (see the consent file). No healthcare production pain-entry, date-of-birth or body-area screen was observable on Mobbin; the Mobbin frames cited are consumer products and are labelled so. Drag-only or colour-only references that must not be copied are listed in `11-accessibility-critical.md` §4.
