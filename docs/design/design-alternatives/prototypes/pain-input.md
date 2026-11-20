# Prototype spec: patient pain input (three approaches)

Status: specification only. Nothing is built here; prototypes are rendered after the visual direction is chosen (protocol). Brief reference: `docs/COMPONENT-BRIEF.md` §20 ("Three different patient pain-input approaches"). Decision record: CD-100. Research: `docs/design/component-research/01-clinical-inputs.md` CD-100. Builds on `feature-research/D-pain-reporting.md` (D1 selected). Colours are semantic token roles only. Exploration artifacts stay out of the production user experience.

Why three, and why these: the brief asks to compare structurally different input controls with everything else held constant. D2 (stepped log), D3 (symptom matrix), D4 (body map) and D5 (named instrument) in feature D change the content collected, so they cannot be compared fairly here. The three below collect the same single 0 to 10 integer.

| Id | Approach | Gate status before testing |
|---|---|---|
| P1 | Numbered tap scale: eleven radio buttons 0 to 10 (the selected direction) | Pass |
| P2 | Slider with a visible value, tap-on-track and a typed number box beside it | Conditional: passes WCAG 2.5.7 only because of the typed box; project rule says no slider for a precise clinical value without evidence, so this prototype exists to test that rule, not to propose shipping it |
| P3 | Stepper: large minus and plus buttons around a large number, the number also typeable | Pass |

Excluded and not prototyped: drag-only dial (fails 2.5.7), word-only labelled buttons (cannot feed the 0 to 10 observation), Wong-Baker faces (licence).

## 1. Identical across all three

**Screen.** The `/check-in` form after a session, then the same control inside the stop sheet. Same page chrome, header, bottom navigation and footer.

**Copy (verbatim, all three).**
- Legend: "How much pain do you have right now?"
- End anchors: "0 No pain" and "10 Worst pain imaginable" (wording pending clinical review)
- Live line when a value is chosen: "You chose 7 of 10." (no severity word, no colour change)
- Hint when nothing is chosen: "Choose a number from 0 to 10."
- Optional question: "How did the exercises feel?" with "Easier than expected", "As expected", "Harder than expected"
- Optional note label: "Anything you want your therapist to know (optional)"
- Standing line above Send: "Not monitored for emergencies. If this is an emergency, call 911."
- Handoff line: "Your therapist will see this."
- Send button: "Send check-in"
- Error: "Choose a pain number from 0 to 10 before you send this."

**Data (synthetic).** Patient "Patient A". Fixtures: (a) nothing chosen; (b) value 0; (c) value 5; (d) value 7 with clinic threshold 7, clinic phone present; (e) value 10, clinic phone absent; (f) after a stop where the patient gave 8, so 8 is preselected with the line "You told us 8 when you stopped. Change it if it is different now."; (g) server error on send; (h) long note text of 1,000 characters.

**Contract.** One integer `painScore` 0 to 10, required; `difficulty` and `notes` optional. No new fields.

**Tokens (roles).** Surface, surface-sunken, border-control, border, primary and ink-inverse for the selected fill, ink, ink-muted, error-ink, focus-ring, disabled. Type scale roles: label, body, small, heading. Target size role: 48 px minimum (patient theme). Motion: 120 ms fast token, zero under reduced motion. Radius role: control.

**Viewports.** 320, 375, 390 (primary), 768, 1024. Also 200 percent text size and 400 percent zoom of 1280. Light theme only; forced-colours check.

**Behaviour held constant.** Required number; Send never disabled for validation, only "Sending" while pending; duplicate send ignored; failed send keeps number and note; the contact notice at or above the clinic threshold appears once, with phone when present, and the 911 line; no reassurance or interpretation anywhere.

## 2. What differs

### P1. Numbered tap scale
- Eleven radio items, `aria-label` "n of 10", items 0 and 10 also carry the anchor text in their names.
- Layout: two rows at 390 and below (0 to 5, then 6 to 10), one row of eleven when each item is at least 48 px wide (about 768 and above); anchors under the rows.
- Selected: filled item plus a check mark plus the live line (never colour alone).
- Keyboard: Tab enters the group once, arrow keys move and select.
- Expected strength: one tap, exact, no drag. Expected weakness: eleven targets need two rows at phone width.

### P2. Slider with alternatives
- A horizontal slider 0 to 10, step 1, thumb at least 48 px, a large visible value above the thumb, tick marks for 0 and 10 with the anchors beneath.
- Non-drag paths (required for the variant to be valid): tap or click on the track moves the thumb to that integer; a number text box ("Or type a number") to the right shows and sets the same value; Left, Right, Up, Down, Home, End, Page keys per the APG slider pattern.
- No default thumb position on first view: the slider renders in an "unset" state with no value and no thumb value text; the first interaction sets a value. (A thumb parked at 0 would read as an answer of 0.)
- `aria-valuetext` "7 of 10"; the typed box has its own label.
- Expected strength: familiar, continuous feel. Expected weakness: unset state is awkward, false precision, touch screen-reader gestures unreliable (APG note), two controls for one value.

### P3. Stepper
- A large number display (shows an em dash or "Choose" when unset) between a minus button and a plus button, each at least 48 px; the number is a text input with numeric input mode so the patient can type instead; end anchors beneath; the first tap on either button sets 0 (no midpoint default, so the control never suggests an answer).
- Press and hold does not auto-repeat (avoid runaway values); each press changes by one; limits disable the button with a visible reason is unnecessary because the number shows 0 or 10.
- Announce the value on each change politely, debounced.
- Expected strength: no drag, compact. Expected weakness: up to ten taps to reach a high value for a patient in pain; typing exists but is slower than a tap.

## 3. States to render for each prototype

Default (unset); focus-visible on the control; hover and pressed; selected 0, 5, 7, 10; preselected from stop (f); error after Send with nothing chosen (focus to the control, summary text above); sending; failed send (g); success below threshold; success at or above threshold with phone (d) and without (e); disabled while sending with the value kept; long note (h); text size 200 percent; 320 wide; reduced motion on; forced colours.

## 4. What to evaluate (no results exist yet)

Heuristic review first, then a task test. **No participants have been run and none of the following is a result.**

| Measure | How | Why |
|---|---|---|
| Time to a sent check-in | Stopwatch from first view to send, per prototype, at 390 | Daily and post-session use must take seconds |
| Wrong value corrected | Count of changes after the first choice | Control precision under a possibly shaky hand |
| Value matches intended value | Ask the participant to report a stated pain number from a scenario card, then compare | Exactness |
| Out-of-range or blank send attempts | Count | Error prevention |
| Keyboard-only completion | Yes or no, with notes | Operability |
| Screen-reader completion (VoiceOver iOS, TalkBack, NVDA) | Yes or no, what is heard for value, anchors and unset state | APG notes touch AT support for sliders is uneven |
| 200 percent text and 320 px reflow | Pass or fail per prototype | WCAG 1.4.10 |
| Preference | One question after all three, order rotated | Secondary |

Participants (planned, not run): at least five adults, at least two over 60, at least one with a hand tremor or using one hand, order rotated. Scenario cards fix the numbers to report (for example 0, 5, 7 and 10) so comparisons are fair.

## 5. Decision rule

Gates first: a prototype that fails keyboard, screen-reader or 320 px reflow is dropped whatever it scores. Then: P1 stays the selected direction unless another prototype is faster and equally exact for the participants who struggled most, and passes every gate. If P2 is not clearly better on exactness and screen-reader completion, the project rule against sliders for precise clinical input stands. Record the outcome as an update to CD-100; do not alter the stored `painScore` contract.

## 6. Out of scope

Body area, timing, symptom lists, named instruments, charts of past reports, the clinician view of the value, the review-queue rule, and any copy beyond the strings above.
