# Feature D: Pain and symptom reporting

Status: provisional until the advisor signs off. Access date for every external source: 2026-11-20. Source brief: `docs/DESIGN-BRIEF.md` §5 to §9 and §7 D. Protocol: `docs/design/RESEARCH-PROTOCOL.md`. Clinical-review note: nothing here is clinical advice; scale wording and thresholds need clinical sign-off before real use.

Evidence labels: **R** = research evidence (retrieved source), **E** = expert judgement, **U** = untested assumption. Reference tags: **[Observed]** = retrieved and looked at in this session; **[Prior]** = from `docs/research/*.md` (2026-11-19), not re-retrieved; **[Assumption]** = inference, not seen.

## 1. User problem

A patient wants to tell their therapist how much they hurt, quickly and in their own terms, and to know that someone will see it and what to do if they are worried. They do not want to be judged, scored with a label they did not choose, asked the same thing twice, or left unsure whether the report went anywhere. The care team needs a number they can compare over time and a reliable signal when a report crosses the clinic's own threshold.

## 2. User and context

- **Who:** an adult patient with a plan, including older adults; the same person who does the sessions in feature C. Sometimes they are in real pain right now (just after a stop), sometimes it is a calm daily note.
- **Where and on what:** phone at 390 wide in a room or on a floor, right after exercise or at the start of the day; sometimes a laptop. One hand, possibly shaky or in pain. [E]
- **State:** may be worried or frightened; may be tired; may not want to type. Reading level varies. [E]
- **Frequency:** after each session, plus a daily check-in when due; at the stop moment on rare days. Must be quick: a few seconds for the number. [E; Prior research suggests "a 10-second log", `docs/research/mobbin-patterns.md` §2 pattern 8]

## 3. Business objective

Patients report pain reliably, and the clinic sees the right reports at the right time, without false alarms from unclear wording or false comfort from hidden ones. The clinic reviews fewer ambiguous entries because the number means one thing each time.

Metrics (names only): check-in completion rate after sessions; time to complete a check-in; validation-error frequency; share of stopped sessions with a pain report within the same sitting; share of check-ins with a note or difficulty answer (to see if optional fields are used, not to push them); time from threshold-crossing report to clinician review; share of reports reviewed within the clinic's window; contact-clinic notice views (and any follow-up message sent).

## 4. Constraints

**Functional (checked in `packages/shared/src/contracts/check-ins.ts`, `sessions.ts`, `intake.ts`, `packages/shared/src/copy.ts` and `docs/architecture/api-phase3.md` §6):**
- `POST /patients/:id/check-ins` takes `sessionId` (or null), `painScore` (integer 0 to 10, required), optional `difficulty` (`easier`, `as_expected`, `harder`), optional `notes` (up to 1,000 characters). **There is no body area, side, timing, symptom list or "prefer not to say" field.**
- The response has `seenBy: "care_team"` (the patient copy "Your therapist will see this") and a `painNotice` that is null below the clinic's threshold and otherwise carries the patient's value, the threshold, the clinic phone (or none) and `EMERGENCY_NOTICE`. The pain rule runs in the same transaction and writes at most one open task (AC-D1, D2). Default threshold is 7, described as an arbitrary demo value that "predicts nothing" and is admin-editable and audited.
- Each pain report is stored as an Observation coded LOINC 72514-3 with the patient as performer (REQ-CHK-04).
- The session stop request requires a `discomfortLevel` 0 to 10 (not nullable); activity updates can carry an optional discomfort level and note. After a stop, `checkInRequested` is true.
- Intake also asks three pain numbers (now, worst last week, best last week) and a body area plus side.
- Fixed copy in `@carepath/shared`: `EMERGENCY_NOTICE` ("Not monitored for emergencies. If this is an emergency, call 911."), `painNoticeMessage`, "Your therapist will see this", "Patient-reported". Banned diagnostic terms for copy tests: "diagnosis", "diagnosed", "you have", "you may have", "injury", "tear", "sprain", "condition is", "treatment for".

**Technical:** `check-in-form.tsx` (169 lines) using `PainScale` in `packages/ui` (Radix radio group, 11 items, `@container`: 6 columns below the `@xl` container width, 11 above). Used in onboarding, the session stop sheet, the end-of-session check-in and `/check-in`.

**Safety and privacy:** the patient's own words and number are shown back as "your own rating"; no screen interprets, diagnoses or reassures; the contact and emergency lines are fixed text; pain data is clinical data visible to the care team only. Never imply the product is monitored for emergencies.

**Accessibility (WCAG 2.2 AA):** 2.5.7 (any drag control needs a tap alternative); 2.5.8 and house 48 px targets; 3.3.7 (do not ask again what the process already holds); radio group with arrow keys and "n of 10" spoken (exists); status never by colour alone; 3.2.6 consistent help; 200 percent zoom.

**Measurement integrity (the "never invent a validated scale" rule):** the single 0 to 10 item is a verbal numeric rating (LOINC defines 72514-3 as a 0 to 10 verbal numeric rating where 0 is no pain and 10 is the worst pain imaginable). Anything labelled as a named instrument (Wong-Baker, PROMIS, PEG, BPI) must be used under its owner's terms; CarePath's own "difficulty" question is not a validated measure and must not be presented as one.

## 5. Current CarePath implementation

Read: `check-in-form.tsx`, `session-player.tsx` (`StopSheet`, stopped and complete views), `onboarding-flow.tsx` (pain step), `packages/ui/src/components/pain-scale.tsx`, `copy.ts`, `(app)/check-in/page.tsx`. Screens read at 390: `docs/screenshots/3.2b/a06-pain-error-390.png`, `c08-complete-checkin-390.png`, `c14-stop-sheet-390.png`, `c16-checkin-high-390.png`.

What works: a 0 to 10 radio group (arrow keys, "7 of 10" announced), two rows of 48 px buttons at 390 (0 to 5, then 6 to 10), end labels "0 No pain" and "10 Worst pain", a live line under the scale, an optional three-option difficulty question, an optional note with "It is not monitored for emergencies", "Your therapist will see this" before and after sending, the contact notice and emergency line at or above the threshold, errors linked and announced, no slider.

Weaknesses (evidence):
1. **The live line labels the patient's own number with a severity word.** `PainScale` maps 1 to 3 "Mild", 4 to 6 "Moderate", 7 to 9 "Severe" and shows "You chose 7 of 10: severe." Those cut-points match one published scheme (3 and 6) among several; another study of 2,854 people starting rehab found 5 and 7 best, and earlier studies used 4 and 6 and 5 and 7 (§6, Boonstra 2016). The schemes were built around interference with daily life in particular populations, not for telling a patient what their number "is". At 5, the screen says "moderate"; under the 5 and 7 scheme the same number is mild. [Observed: code and screenshot; R]
2. **The end label is "Worst pain",** not the LOINC definition wording "worst pain imaginable". Anchor wording changes what people choose; no source I read tests CarePath's wording. [U]
3. **Pain is asked more than once around a stop.** The stop sheet asks "How much does it hurt right now?", then the stopped screen asks "Report your pain... choose the number that fits how you feel now". The contact notice appears twice on the same screen after the check-in (c16). [Observed: screenshot]
4. **A stop needs a number before it stops** (see feature C, weakness 5). [Observed]
5. **The emergency line appears only after a high number is sent.** Before sending, the check-in form says only that the note box is not monitored for emergencies. A patient in severe pain who opens the form sees no 911 line until they have scored. (The onboarding pain step does show it before.) [Observed: code]
6. **No place or time.** The report cannot say where it hurts or whether it was during or after exercise; the only route is the free note. Prior research suggested chips for location and timing (`docs/research/mobbin-patterns.md` §2 pattern 8), and Hinge's manual describes a log by body area. [R, Prior]
7. **No way to say "I would rather not rate it now."** The number is required. For a one-off high-stress moment that is probably right, but it is a choice the contract makes for the patient. [E]
8. **The difficulty question is CarePath's own,** like Hinge's "too easy / too hard" feedback; it is fine as a plain question but is not a validated measure and the UI should not suggest it is. [E]

## 6. Production references observed

Mobbin (iOS): `search_flows` and `search_screens`. Frames are samples of longer flows.

| Product | Platform | Screen or flow | URL | Accessed | Observed |
|---|---|---|---|---|---|
| Visible | iOS | Logging a check-in (Evening) | https://mobbin.com/flows/91c81bbc-a8c9-4ba0-a960-2e133e283a18 | 2026-11-20 | [Observed] Today lists Morning, Evening and Monthly check-ins as tasks. The evening check-in is a matrix: each symptom (fatigue, fever, headache, shortness of breath, cough, sore throat) has four buttons labelled None, Mild, Moderate, Severe with the numbers 0 to 3; a "Use previous answers" switch at the top; segmented progress; Next at the bottom. A later screen has collapsible groups Symptoms, Exertion, Other factors, Note, and a toast "Evening check-in complete". Visible's own items; not a CarePath instrument. |
| Stardust | iOS | Adding a symptoms | https://mobbin.com/flows/3cc0ca24-b82f-4811-9b68-f0fbcdca2486 | 2026-11-20 | [Observed] Symptoms as icon chips grouped by category with a custom-add button; chosen symptoms appear as tags with a level word ("Moderate"). Cycle-tracking app, not clinical. |
| How We Feel | iOS | Body-part feeling screen | https://mobbin.com/screens/afcbcbce-4887-4b23-a1dd-0a785a200e5f | 2026-11-20 | [Observed] A dotted body figure with a draggable dot and a square grid (pleasant/unpleasant by intensity); tag chips below; Next. Pointer-first; no list alternative visible in the frame. Emotion and sensation, not pain scale. |
| Bevel | iOS | "How was the workout?" effort dial | https://mobbin.com/screens/4c68146f-1e51-4d9e-aace-ba190d7d9452 | 2026-11-20 | [Observed] A circular dial from 1 to 10 with a large number, a word label ("Somewhat Hard") and one sentence describing it. Drag-based in the frame; effort, not pain. |
| Noom | iOS | Mood slider | https://mobbin.com/screens/1f7989bf-1a43-41f3-b5aa-b98c231b2f91 | 2026-11-20 | [Observed] A horizontal slider with end labels and a word that changes with the thumb ("Slightly Unpleasant"); Finish button. Drag-based; mood, not pain. |
| Crumbl Cookies | iOS | 0 to 10 survey row | https://mobbin.com/screens/504a99b5-5085-4d6d-bfd5-d12f50e2fb71 | 2026-11-20 | [Observed] Eleven small square buttons from 0 to 10 in one row with end labels. Non-health; shows how small eleven in a row get at phone width. |
| Flo | iOS | Logging symptoms | https://mobbin.com/flows/22df520b-6764-4b62-833c-186ab412ac03 (URL from prior research; the frames I saw today match the described bottom sheet, flow attribution not verified) | 2026-11-20 | [Observed] A bottom sheet with search and grouped chips, a sticky "Apply" button, a wheel picker for a measurement with unit switch, and a notes sheet with Clear and Done. No severity scale in the frames seen. |
| Hinge Health | Web | User manual | https://www.hingehealth.com/user-manual/ | 2026-11-20 | [Observed] (first 100,000 of about 135,800 characters) The daily playlist includes a health log where the member rates pain over the last 24 hours for each body area they are working on; end-of-session feedback is "Too easy" or "Too hard"; the manual says to stop if an exercise causes or worsens pain and that temporary soreness can occur. |
| Medbridge GO | iOS | App Store listing and `docs/research/competitor-analysis.md` §2.1 | https://apps.apple.com/us/app/id1089747982 | 2026-11-20 | [Observed] (marketing text via a fetch tool) Patients can answer a survey on whether an exercise felt too easy or too difficult, and a pain scale lets them rate pain and save the entry. [Prior] The store listing does not describe pain feedback; the competitor note does. |
| Physitrack PhysiApp | Web | Patient experience | https://physitrack.com/physiapp-patient-experience | 2026-11-20 | [Observed] Patients log progress and discomfort levels in real time and leave feedback for the therapist. |
| Hawker et al. 2011, Measures of Adult Pain | Paper | Arthritis Care and Research 63 Suppl 11: S240 to S252 (full text reproduced) | https://www.chiro.org/research/ABSTRACTS/Measures_of_Adult_Pain.shtml | 2026-11-20 | [Observed] Describes the Numeric Rating Scale as a valid, reliable single-item intensity measure, usually 0 to 10, given verbally or in writing, strongly correlated with the visual analogue scale, preferred at the point of care for simple scoring; its limit is that it measures intensity only. Concludes that no single measure suits every purpose. |
| PROMIS Pain Intensity, Short Form 3a v1.0 | Instrument | NIDA CDE PDF | https://cde.nida.nih.gov/system/files/PROMIS%20Adult%20ShortForm%20v1.0%20Pain%20Intensity%203a.pdf | 2026-11-20 | [Observed] Three items: most intense pain in the past week, typical pain in the past week, pain right now. Five labelled responses (no pain, mild, moderate, severe, very severe), scored 1 to 5. Copyright notice to the PROMIS Health Organization and Cooperative Group; the sample carried a watermark; no separate terms read. |
| Wong-Baker FACES Foundation | Web | Commercial use page and FAQ | https://wongbakerfaces.org/licensing-dashboard/commercial-use/ ; https://wongbakerfaces.org/faq/ | 2026-11-20 | [Observed] Commercial products need to read the guidelines and submit a form; the page does not say whether it is free. Conditions: for ages three and older; physical pain only (not emotions, mood or comfort); not for unresponsive patients or for inferring pain from a face; no modifications without permission; colour is not permitted. The FAQ says licensing may require permission, a licence or a fee, and does not address electronic use or give a validated age range. |
| Brief Pain Inventory (MD Anderson) | Web | Tool page | https://www.mdanderson.org/research/departments-labs-institutes/departments-divisions/symptom-research/symptom-assessment-tools/brief-pain-inventory.html | 2026-11-20 | [Observed] Measures severity (worst, least, average over 24 hours, and now) and interference (general activity, mood, walking, work, relationships, sleep, enjoyment of life); obtained through an online order form covering clinical practice and commercial research; price and terms not stated on the page. |
| PEG three-item scale (Krebs et al. 2009) | Paper | PMC article | https://pmc.ncbi.nlm.nih.gov/articles/PMC2686775 | 2026-11-20 | [Observed] Average pain intensity, interference with enjoyment of life, interference with general activity, each 0 to 10, averaged; developed in primary care patients with chronic musculoskeletal pain and in veterans; correlated well with the longer Brief Pain Inventory. Licence terms not retrieved. |
| Cut-off points study (Boonstra et al. 2016) | Paper | Frontiers in Psychology, PMC | https://pmc.ncbi.nlm.nih.gov/articles/PMC5043012 | 2026-11-20 | [Observed] 2,854 adults with chronic musculoskeletal pain starting rehabilitation in the Netherlands; found 0 to 5 mild, 6 to 7 moderate, 8 to 10 severe interference on the NRS (the "5,7" scheme) as most often optimal, with variability by subgroup; earlier studies cited: 4 and 6 (cancer pain, Serlin 1995), 5 and 7 (osteoarthritis, Zelman 2003), 3 and 6 (musculoskeletal pain on a visual analogue scale, Boonstra 2014; cited via this paper only, not read directly). |
| LOINC | Web | Pain severity 0 to 10 verbal numeric rating | https://loinc.org/72514-3/ | 2026-11-20 | [Observed] The fetched page content gives the name "Pain severity, 0 to 10 verbal numeric rating, Score, Reported" and the definition "0 is no pain and 10 is the worst pain imaginable". The page did not print the code number itself, so that the code is 72514-3 rests on the URL and on `docs/product/prd.md`, not on the page text. |
| W3C WCAG 2.2 | Web | SC 2.5.7 Understanding page | https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html | 2026-11-20 | [Observed] AA: dragging must have a single-pointer alternative; a slider needs a non-drag way (tap on the track or a text input). |
| Oura (Counsel setup), Flo | iOS | Informational notice and 911 line; symptom logging | `docs/research/mobbin-patterns.md` §2 patterns 4 and 8 | 2026-11-19 | [Prior] Counsel states messages are informational and to call 911 for emergencies; Flo logging uses chips with an Apply commit; neither showed a severity scale or a path to a clinician. |

**Not accessible or not found:**
- No rehab or physiotherapy product appears on Mobbin in my searches for pain or symptom logging; the Hinge search returned zero flows and a pain-scale search returned non-rehab products (Crumbl, How We Feel, Bevel, Ahead, Future Pro, Noom). I saw no Hinge, Sword, MedBridge or PhysiApp pain-entry screen. Those three are described from text only.
- Sword: the home page does not describe pain reporting.
- The Wong-Baker FAQ does not state a validated age range and does not cover digital use; I did not find the guideline document itself.
- PROMIS: only the sample form was read; permission terms for reuse were not retrieved. PEG: licence not retrieved. BPI: terms behind an order form.
- The LOINC page did not print the code number (see table).
- The original Boonstra 2014 and Serlin 1995 papers were not read; they are cited only as the 2016 paper reports them.
- MedBridge patient-engagement and Physitrack `/patient-app` pages: fetch failed. NHS and CMS design systems have no pain-scale component that I retrieved.
- MyChart, One Medical, Omada, Maven, SPRY, WebPT, Headway, Zocdoc, Abridge, Ambience, Tebra, Medplum: not relevant to this feature or not researched here.

## 7. Established patterns

1. **A single 0 to 10 numeric rating is the standard quick pain item.** Hawker et al. recommend it for point-of-care use; LOINC codes it; PEG and BPI use 0 to 10 items; PROMIS uses a 1 to 5 labelled scale. Why it works: one number, easy to compare, can be given by phone. [R, Observed]
2. **Intensity is only one dimension.** Hawker notes the NRS measures intensity only; BPI and PEG add interference with daily life. A single number plus an optional note is the minimum; richer measures are licensed instruments. [R]
3. **Pain is tied to a body area and a time window in rehab apps.** Hinge logs per body area over 24 hours; BPI uses 24 hours; PROMIS uses 7 days. [R]
4. **Word labels belong to the scale they came with.** PROMIS words sit on its own five points; Bevel's dial gives a word and sentence for each effort level; Noom's slider changes a word. A label is part of a scale's design, not a free add-on. [R, Observed]
5. **Quick logging uses large tap targets or chips with one commit** (Flo "Apply", Visible's Next). [R, Observed]
6. **A report ends with a visible handoff** to a person. CarePath already does this ("Your therapist will see this"). No competitor frame I saw shows it. [R, gap]
7. **Counter-patterns:** drag-only dials and sliders (Bevel, Noom, How We Feel) fail 2.5.7 without a tap alternative; eleven buttons in one row at phone width (Crumbl) become small targets. [R, Observed]

## 8. Alternatives

### D1. One-screen numeric rating, refined

- **Interaction model:** the patient taps one number from 0 to 10 in a radio group, optionally picks how the exercises felt, optionally adds a note, and sends. Refinements: end labels "0 No pain" and "10 Worst pain imaginable"; the live line says only "You chose 7 of 10." with no severity word; the standing line "Not monitored for emergencies. If this is an emergency, call 911." appears before sending; after a stop, the number the patient just gave is preselected and labelled so it need not be re-entered; one contact notice only; the confirmation says "Your therapist will see this."
- **Benefits:** fastest to complete; matches REQ-CHK-01 and the stored LOINC observation; low reading load; the number means one thing each time. [R: Hawker; LOINC]
- **Limitations:** intensity only (Hawker); no location or timing; the clinic's threshold is an arbitrary admin number.
- **Accessibility:** radio group with arrow keys, "n of 10" announced, 48 px targets in two rows at 390, check mark on the selected item (not colour alone), no drag. Passes 2.5.7 and 2.5.8.
- **Business:** clean data for the review queue; low abandonment (U).
- **Technical complexity:** low. Only copy and layout in `PainScale` and the form; the preselect uses the stop value already in the session response.
- **Error and recovery:** missing number gets a linked error and focus; a failed send keeps the number and note ("Your check-in was not sent, and what you entered is still here"); duplicate send is prevented by the pending state.
- **Evidence:** Hawker 2011 [R]; LOINC definition [R]; existing build and tests [R]; effect of anchor wording on responses untested [U].

### D2. Guided stepped log (one question per screen)

- **Interaction model:** a short sequence: "How much pain do you have right now?" (number), "Where is it?" (body area chips from the plan or intake), "When do you notice it?" (during exercise, after, at rest, all day), "Anything else?" (note), then a review line. Pattern follows Hims and Future Pro one-question screens and Hinge's per-area log.
- **Benefits:** richer, more specific context for the therapist; feels like a conversation. [R: Hinge; Prior research]
- **Limitations:** more taps for a daily log; the contract holds only a number, a difficulty answer and a note, so location and timing would sit in free text or need new fields; more to maintain.
- **Accessibility:** passes if each step has a back link and linked errors; more focus-management work.
- **Business:** better data for the clinic if the new fields land; more drop-off risk for a quick log (U).
- **Technical complexity:** medium to high: contract change (CR-D1), queue payload, clinician views.
- **Error and recovery:** progress kept per screen in the tab; a partial log can be sent with only the number.
- **Evidence:** Hinge manual per-area log [R]; Hims and Future Pro one-question frames [R, Observed]; no source shows richer logging improves outcomes [U].

### D3. Symptom matrix check-in

- **Interaction model:** a list of symptoms or functions, each with four labelled buttons (None, Mild, Moderate, Severe), submitted together (Visible).
- **Benefits:** covers several things at once; quick once learned. [R, Observed]
- **Limitations:** CarePath has no validated symptom list; the 0 to 3 scale cannot be stored as the 0 to 10 LOINC pain observation or drive the existing rule; word buttons carry the same band problem as the current live line; a long list is heavy for a patient in pain.
- **Accessibility:** a grid of small buttons is hard on a phone; needs grouped legends and 48 px rows.
- **Business:** more data, unclear use.
- **Technical complexity:** high: new observation types, new rules.
- **Error and recovery:** a half-filled grid is ambiguous (blank versus None).
- **Evidence:** Visible frames [R, Observed]; no validity evidence for any symptom set CarePath would define [U].

### D4. Body-map first, then intensity

- **Interaction model:** the patient taps a body figure to choose where it hurts, then sets an intensity for that area (How We Feel's body screen as the reference).
- **Benefits:** direct location; engaging. [R, Observed]
- **Limitations:** pointer-first and imprecise; the figure implies anatomical claims that the art direction forbids; no location field exists; the frame I saw uses a draggable dot and grid, not a 0 to 10 pain scale.
- **Accessibility:** needs a parallel list of areas and no drag; small tap areas on the figure.
- **Business:** useful for multi-area patients, little for a single-area plan (U).
- **Technical complexity:** high: new field, figure assets, clinician display.
- **Error and recovery:** wrong area tapped; needs undo and a list fallback.
- **Evidence:** How We Feel frame [R, Observed]; no rehab evidence retrieved [U].

### D5. Named validated instrument (PEG, PROMIS Pain Intensity 3a or BPI)

- **Interaction model:** a short, published multi-item questionnaire (for example PEG's three 0 to 10 items, or PROMIS's three items with its five labelled responses) replaces or follows the single number, used under the owner's terms.
- **Benefits:** published measurement properties (PEG correlated well with the longer BPI in primary care patients; Hawker's review supports choosing by purpose and evidence); adds interference, which a single number lacks. [R]
- **Limitations:** licences and wording rights were not confirmed for PROMIS or PEG and BPI is obtained by order form; needs clinical choice of instrument; longer; the contract holds one integer; scoring and thresholds differ from the existing rule.
- **Accessibility:** passes with standard radio groups.
- **Business:** useful for outcomes reporting later.
- **Technical complexity:** high: new data model, scoring, rule changes, licence management.
- **Error and recovery:** item wording must not be altered; incomplete forms need scoring rules.
- **Evidence:** PEG paper, PROMIS form, BPI page, Hawker review [R, Observed]; licensing status unknown [U].

### Excluded at the gate, not scored

| Option | Why it cannot be used now | Source |
|---|---|---|
| Wong-Baker FACES | Needs a licence for a commercial product and may involve a fee; colour is not allowed; no modification without permission; physical pain only; ages three and up; not for inferring pain from a face. CarePath has no licence and the faces cannot be restyled to match a visual identity. | Wong-Baker commercial use page and FAQ [R, Observed] |
| Slider or dial for 0 to 10 | Drag-only in the Bevel and Noom frames fails WCAG 2.5.7 unless a tap alternative exists; REQ-CHK-01 rules out a slider. Fixed with tap steps it becomes D1. | WCAG 2.5.7; Mobbin frames [R, Observed] |

## 9. Mandatory gates

| Gate | D1 One-screen number | D2 Stepped log | D3 Symptom matrix | D4 Body map | D5 Named instrument |
|---|---|---|---|---|---|
| Accessibility (2.5.7, 2.5.8, keyboard, status not colour only) | Pass | Pass | Conditional (needs 48 px rows and groups) | Conditional: pass only with a parallel list and no drag | Pass |
| Privacy | Pass | Pass | Pass | Pass | Pass |
| Safety (no diagnosis or label; contact and emergency lines reachable; measure valid for the rule it feeds) | Pass (after removing the severity words and adding the standing emergency line) | Pass | **Fail:** invented symptom scale that cannot feed the LOINC observation or the existing rule | Conditional: anatomical imagery must not imply a finding | Conditional: licence and clinical choice of instrument unresolved |

Ineligible now: **D3.** D4 and D5 are conditional; D5 is not selected until licensing and a clinician choice are settled, but it is scored for comparison. D1 and D2 are eligible.

## 10. Weighted evaluation

Weights adjusted from the defaults: task effectiveness 25, safety/privacy/trust **25** (up from 20), usability and accessibility 20, business value **10** (down from 15), operational efficiency 10, technical feasibility 5, design-system consistency 5. Reason: pain reports drive a safety action (the review task and the contact notice), so measurement integrity and trust weigh more; business value barely separates the options. Score 1 to 5. D3 is not scored (ineligible).

| Criterion (weight) | D1 One-screen number | D2 Stepped log | D4 Body map | D5 Named instrument |
|---|---|---|---|---|
| Task effectiveness (25) | 4: one number in seconds; lacks place and time | 3: richer, but a long path for a daily log and most added data has no field | 3: gives location, slower, imprecise | 3: stronger measure, heavier to complete |
| Safety, privacy, trust (25) | 4: single validated-style item, LOINC match, plain anchors, handoff text; intensity only | 4: same number; more context | 3: imagery and tap precision risks | 3: strong evidence but licence and instrument choice unresolved |
| Usability and accessibility (20) | 4: 48 px radio group, two rows, no drag | 3: more screens to manage | 2: pointer-first, needs list fallback | 3: longer questionnaire |
| Business value (10) | 4: clean queue data | 3: better context if fields exist (U) | 3: useful for multi-area plans (U) | 4: supports outcomes reporting later (U) |
| Operational efficiency (10) | 4: matches the review rule and one open task per source | 3: staff read more, no structure | 3: needs a new display | 3: new scoring for staff |
| Technical feasibility (5) | 5: copy and layout only | 3: contract change | 2: new field and assets | 2: new model, scoring, licence |
| Design-system consistency (5) | 5: existing `PainScale` | 4: existing components | 2: new figure component | 4: existing radio groups |
| **Weighted total (out of 5)** | **4.10** | **3.30** | **2.70** | **3.10** |

Arithmetic: D1 = (4×25 + 4×25 + 4×20 + 4×10 + 4×10 + 5×5 + 5×5) / 100 = (100 + 100 + 80 + 40 + 40 + 25 + 25) / 100 = 4.10. D2 = (75 + 100 + 60 + 30 + 30 + 15 + 20) / 100 = 3.30. D4 = (75 + 75 + 40 + 30 + 30 + 10 + 10) / 100 = 2.70. D5 = (75 + 75 + 60 + 40 + 30 + 10 + 20) / 100 = 3.10. Scores are expert judgement from the sources in §6; none comes from testing with patients.

Sensitivity: with the default weights the totals are D1 4.10, D2 3.25, D4 2.70 and D5 3.15; the order does not change.

## 11. Recommendation

**Select D1, the one-screen numeric rating, refined.** Runner-up: **D2, the stepped log,** to be revisited only after a contract change adds body area and timing (CR-D1); until then its extra screens would mostly collect free text.

Why D1 beats D2: the daily and post-session report must take seconds and mean one thing; D1 uses the existing contract, the stored LOINC observation and the existing rule, while D2 adds screens whose answers have nowhere structured to go. Why not D3: an invented symptom scale cannot feed the existing observation or rule and has no validity evidence. D4 is pointer-first and has no field. D5 needs licences and a clinical choice first.

**What changes (provisional):**
1. Remove "mild, moderate, severe" from the live line. Show "You chose 7 of 10." Keep the 0 and 10 end labels, with the 10 label "Worst pain imaginable" to match the LOINC definition (wording needs clinical review [U]).
2. Show "Not monitored for emergencies. If this is an emergency, call 911." on the check-in screen before sending, once, small.
3. After a stop, preselect the number given at the stop and say so ("You told us 8 when you stopped. Change it if it is different now."), so the patient is not made to re-enter it (3.3.7). Show one contact notice, not two.
4. Keep "Your therapist will see this" before and after sending; never add reassurance or interpretation, and no word such as "improved".
5. Keep the difficulty question optional and label it plainly as a question for the therapist.
6. Keep the number required (contract) but make the check-in reachable from Today at any time so the patient can add one on their own.
7. Do not show the clinic's threshold to the patient; the notice states only the patient's own number.

**Contract requests (for the orchestrator; not made here):**
- **CR-D1 (optional, enables D2 later):** add body area (and side) and a timing option (during, after, at rest, all day) to `CheckInCreate`, plus the queue payload and clinician display.
- **CR-C1 (shared with feature C, safety):** make `discomfortLevel` nullable on the stop request so stopping never waits on a rating.
- **Clinical review item (not a contract change):** the clinic must confirm the anchor wording, the "worst pain imaginable" label, and whether the default threshold of 7 should ship at all without a clinician-chosen value.

**Rejected and the trade-off:** D2, D4 and D5 are not built now, which costs location, timing and interference data until they are specified and licensed. D3 is rejected, which costs a multi-symptom view. Wong-Baker faces and sliders are excluded at the gate, which costs a more visual option.

## 12. Requirement alignment row

| Field | Value |
|---|---|
| User segment | Patient with a plan, after exercise, at daily check-in, or at a stop; including older adults |
| Job to be done | Tell the therapist how much it hurts, quickly, and know what happens and what to do if worried |
| User pain point | Being labelled by the screen; answering twice; unclear handoff; no emergency line before sending |
| Business objective | Reliable pain reports that route to the right clinician review without false alarms |
| Functional requirement | REQ-CHK-01 to 04; AC-C4, C6, C7, D1 to D3, D7; CR-C1 for the stop path |
| Success metric | Check-in completion rate; time to complete; validation-error frequency; share of stopped sessions with a report in the same sitting; time from threshold report to review |
| Design hypothesis | If the scale shows only the patient's number with plain end labels, and the contact and emergency lines are visible once and early, patients report faster with fewer repeats and the clinic sees one consistent meaning [U, untested] |
| Selected pattern | One-screen 0 to 10 radio group with optional difficulty and note; handoff text; single contact notice |
| Technical dependency | `POST /patients/:id/check-ins`; `PainScale`; stop response; CR-C1; optional CR-D1 |
| Validation method | Task test at 390 with five or more adults including at least two over 60, measuring time and repeats; a comprehension check of the end labels; keyboard and screen reader pass (arrow keys, "n of 10"); copy test against the banned-terms list (AC-D7); clinical review of anchor wording |

## 13. States to design

| State | Microcopy | Recovery |
|---|---|---|
| Default | "How much pain do you have right now?" Scale 0 to 10. "0 No pain" and "10 Worst pain imaginable". Line: "Choose a number from 0 to 10." | Choose a number |
| Hover, focus, active | Visible focus ring on the group; arrow keys move the choice | Not applicable |
| Selected | Filled with a check mark; line: "You chose 7 of 10." | Choose another number |
| Disabled | Send is never disabled for validation; shows "Sending" while pending | Wait |
| Loading | Button: "Sending" | Stay on the screen |
| Empty (none due) | "No check-in is due right now. You can add one any time." plus the button | Add a check-in |
| Partial data (after a stop) | "You told us 8 when you stopped. Change it if it is different now." number preselected | Keep or change |
| Validation error | "Choose a pain number from 0 to 10 before you send this." focus on the first button | Choose a number |
| Success below threshold | "Check-in sent. Your therapist will see this. You reported pain of 3 out of 10. This is your own rating, kept with your record." | Back to Today |
| Success at or above threshold | The sentence above, then "You reported pain of 8 out of 10. If you are worried, contact your clinic at (phone)." and "Not monitored for emergencies. If this is an emergency, call 911." once | Call, Message care team, Back to Today |
| Zero | "You reported pain of 0 out of 10." (no praise or comparison) | Back to Today |
| Server error | "Your check-in was not sent, and what you entered is still here. Check your connection and try again." | Try again |
| Network loss | Same message; the number and note stay on screen | Retry on reconnect [Assumption: no offline queue exists] |
| Session closed | "This check-in belongs to a session from an earlier day, so it was not saved. Go back to Today and add a new check-in." | Back to Today |
| Rate limited | "Too many tries. Wait a minute, then try again." | Wait |
| Permission denied | Non-patient roles are redirected to their own home | Redirect |
| Cancellation | Back or close before sending: "Nothing was sent." | Return to Today |
| Interrupted workflow | Number and note kept in the tab for the session; a reload keeps them [U: to build] | Continue |
| Stale information | If a check-in was already sent today for this session, show "You already sent a check-in for this session. Add another?" [Assumption: API allows more than one] | Add another or go back |
| Unsaved changes | Leaving with a chosen number but no send shows "Your check-in has not been sent." with Leave and Stay | Choose |
| Duplicate tap | Second tap on Send is ignored while pending | None needed |

## 14. Responsive behaviour

- **375 and 390:** the scale is two rows of 48 px buttons (0 to 5, then 6 to 10); end labels below the rows; the standing emergency line above the Send button; Send full width. A single row of eleven would be about 30 px wide at this width, below the house floor of 48 px.
- **768:** one row of eleven buttons becomes possible at a 40 rem measure (about 56 px each); same form, centred.
- **1024:** same model; the form stays a single column; no side panel.
- **1440 and 1920:** the form stays at reading width; nothing stretches; the confirmation and notice remain in the same column. History of check-ins belongs to feature E, not here.
- **What changes model:** nothing. The after-stop version appears on the stopped screen on every size.
- Check at 200 percent zoom: the two-row layout holds and the notice stays above the button.
