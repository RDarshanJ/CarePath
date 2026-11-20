# Feature C: Guided rehabilitation sessions

Status: provisional until the advisor signs off. Access date for every external source: 2026-11-20. Source brief: `docs/DESIGN-BRIEF.md` §5 to §9 and §7 C. Protocol: `docs/design/RESEARCH-PROTOCOL.md`.

Evidence labels: **R** = research evidence (retrieved source), **E** = expert judgement, **U** = untested assumption. Reference tags: **[Observed]** = retrieved and looked at in this session; **[Prior]** = from `docs/research/*.md` (2026-11-19), not re-retrieved; **[Assumption]** = inference, not seen.

## 1. User problem

A patient has exercises their therapist set and wants to do them today without thinking about the app: know what to do now, how many, when to rest, what comes next, and how to stop if something hurts. They are standing, kneeling or lying on a floor with the phone propped a metre or two away, often sweaty and with one free hand. They need to pick up where they left off if the phone rings, and to be able to say "this hurts" in one obvious move.

## 2. User and context

- **Who:** an adult patient with a published plan; includes older adults and people with limited mobility. Personas include a desk worker with low-back pain doing short sessions at home. [Prior: PRD P2]
- **Device and placement:** phone at 390 wide, propped against a wall, on a chair or the floor; sometimes a tablet or laptop. The screen is read from arm's length to about two metres. [Assumption: no source retrieved measures viewing distance]
- **Physical and cognitive state:** moving, breathing hard, possibly in pain, possibly unsure of the exercise. Hands may be busy or damp. Attention is on the body, not the screen. [E]
- **Frequency:** per the plan schedule, typically several days a week, 10 to 20 minutes. [Assumption: example from Hinge's suggested 15 minutes at least three times a week, Prior competitor analysis; CarePath's own schedule is clinician-set]

## 3. Business objective

More patients complete the sessions their therapist prescribed, and the clinic gets honest records (done, skipped with reason, stopped for discomfort), without nagging or reward mechanics.

Metrics (names only): session completion rate against assigned; session start-to-finish time; resume rate after pause or interruption; skip rate and skip reasons; "stop, this hurts" rate and time from stop to pain report; percentage of stopped sessions followed by a pain report; abandonment (24 h idle close) rate; error rate on `session` writes.

## 4. Constraints

**Functional (checked in `packages/shared/src/contracts/sessions.ts`, `check-ins.ts`, `care-plan.ts` and `docs/architecture/api-phase3.md` §6):**
- A session is created on the current published version (`POST /patients/:id/sessions`; 409 `session_open` if one is open; 409 `plan_not_published`). It keeps that version even if a newer one is published (AC-B5).
- States: `in_progress`, `paused`, `completed`, `abandoned` (24 idle hours, by a job), `stopped_discomfort`.
- Pause and complete take `{ currentPosition, elapsedSeconds }`. Resume returns the stored position (AC-C1).
- Each activity is completed with `completedSets`, `completedReps`, `durationSeconds` and optional discomfort level and note, or skipped with a required `skipReason`. **Set-by-set progress is not stored by the API:** only the finished exercise. The current UI keeps the set count in `sessionStorage` for the tab.
- Dose per activity: sets, reps, hold seconds, duration seconds, rest seconds (0 to 600).
- `POST .../stop` requires `activityId` and `discomfortLevel` (integer 0 to 10, **not nullable**); the response sets `checkInRequested: true` (AC-C4).
- Exercise media is `mediaPath` plus `mediaAlt` (a picture description, "never an instruction"). There is no video, audio or caption field.
- Exercise content is fictional and "not medically reviewed"; art direction forbids instructional imagery (arrows, step sequences, counts). `motion_tracking` consent is not grantable in this phase; REQ-SES-02 says no camera and keyboard plus single-tap operable.

**Technical:** Next.js client component `session-player.tsx` (748 lines) with `useElapsed` and `useCountdown` (one-second interval, not wall clock). The session route hides the tab bar (`PatientFrame variant="focus"`) and keeps a way back to Today plus "Contact care team".

**Safety and privacy:** no output states or implies a diagnosis; the stop path and the contact and emergency lines must stay reachable at all times; pain wording follows the check-in rules (see feature D); camera and microphone off.

**Accessibility (WCAG 2.2 AA):** 2.5.8 and house 48 px targets; 2.5.7 no drag; 2.2.2 pause, stop, hide for auto-updating content (a countdown needs a pause control unless essential); 3.2.6 consistent help placement; focus moves to the new view heading (exists); text at 200 percent zoom; status not by colour alone; reduced motion honoured.

## 5. Current CarePath implementation

Read: `apps/web/app/(patient)/_components/session-player.tsx`, `start-session.tsx`, `check-in-form.tsx`, `use-timers.ts`, `(session)/layout.tsx`. Screens read at 390: `docs/screenshots/3.2b/c03-exercise-390.png`, `c04-rest-390.png`, `c14-stop-sheet-390.png`, `c16-checkin-high-390.png` (set c01 to c17 exists at 390 and 1440).

What works: one exercise at a time; "Exercise n of N" and a progress bar; dose card "Set by your care team" with rest line; therapist note; "How to do it"; optional hold timer; rest panel with countdown, Skip rest and Pause rest; "Done with set n"; Pause, Skip (bottom sheet with reasons) and a red-outline "Stop, this hurts" that opens a sheet with the 0 to 10 scale; paused, complete, stopped and abandoned views; focus moved to headings; rest end announced politely; no camera, no drag.

Weaknesses (evidence):
1. **The main action is below the first screen.** The c03 capture at 390 wide is about 1,640 px tall; "Done with set 1" sits at about 1,010 to 1,060 px, so on an 844 px viewport the patient scrolls past instructions and the timer to reach it. With an illustration present the page is longer. [Observed: screenshot]
2. **It is a document, not a player.** Instructions, dose, timer, three buttons, the full exercise list and a content notice stack in one scroll. For a patient lying down with the phone a metre away, the useful content (current set, count, next move) is small text among other text. [Observed; E]
3. **The timer is manual.** The hold timer needs a tap to start; nothing starts, ends or changes with a sound or a vibration. A search of `apps/web` found no use of audio, speech, vibration or a screen wake lock; the screen can lock mid-set. [Observed: grep; U that it matters]
4. **Set progress is tab-local.** Resume on another device restarts the set count inside the current exercise (the API only knows finished exercises). [Observed: code + contract]
5. **"Stop, this hurts" asks for a pain number before it stops.** The sheet requires a 0 to 10 choice and shows an error if none is chosen; the contract requires the level. For someone in sudden pain, ending the session is the urgent act and the rating is secondary. [Observed: `StopSheet`, `SessionStopRequest`]
6. **After a stop, pain is asked twice.** The stop sheet asks "How much does it hurt right now?", then the stopped screen shows the contact notice and the same notice again after the check-in (c16 shows the banner above and below "Check-in sent"). [Observed: screenshot]
7. **Nothing helps a first-time patient set up** (where to put the phone, space, what to have nearby). Hinge's manual does. [R, see §6]
8. **Skip reasons are a short fixed list plus Other,** fine, but "It hurts" as a skip reason does not stop the session or prompt a pain report, so a patient may pick it and carry on. [E: derived from code, no source]

## 6. Production references observed

Mobbin (iOS): `search_flows` and `search_screens`. Frames are samples of longer flows.

| Product | Platform | Screen or flow | URL | Accessed | Observed |
|---|---|---|---|---|---|
| Alan (health app, back pain program) | iOS | Flows "Complete exercises", "Starting an exercise (back pain)", "Task detail" | https://mobbin.com/flows/afb4b655-a92d-4c91-a817-abab4f25305b ; https://mobbin.com/flows/fa306be6-28eb-4da1-bca5-7c4af6235f30 ; https://mobbin.com/flows/b3e31cca-8fee-4251-a59b-dadd5593e42e | 2026-11-20 | [Observed] A day-by-day program path with completed ticks and locked future days ("Available in" a countdown). A session overview lists each exercise with duration, type (stretching, strengthening), equipment and a two-line description with "More", then one "Start the session" button. After day 1: "Did you like this exercise? Save it" with Skip, then a reward screen ("Claim my reward"). Per-frame flow attribution not retained; frames came from these flows. |
| Google Health (Fitbit) | iOS | Workout Rest screen | https://mobbin.com/screens/9f69e842-dfdf-4719-93d1-c20d8beea3f4 | 2026-11-20 | [Observed] Label "Rest", very large countdown digits, pause and "replay time" icon buttons either side, a small illustration, a "Next: High plank, 30s" line and one full-width "Complete" button at the bottom; elapsed time pill at top. |
| WHOOP | iOS | Live session, cooldown | https://mobbin.com/screens/a13c697f-44a9-4e3c-98d8-068750b47e29 | 2026-11-20 | [Observed] A large ring with the phase name and a big countdown at the centre, a short explanatory paragraph below, one outlined "End workout" button at the bottom. |
| Bevel | iOS | Strength workout set logging | https://mobbin.com/screens/b2a9421a-f991-46d1-9737-208f310ebdf3 | 2026-11-20 | [Observed] All exercises on one screen as cards; each set is a row with load and reps boxes and a play button; rest durations appear as chips between rows; workout clock with pause and a Finish button top right; "Add set". Interactive-checklist model. |
| Nike Training Club | iOS | In-workout overlay | https://mobbin.com/screens/0ec4cee2-498c-424d-8442-c10d19ea657f | 2026-11-20 | [Observed] A large "0:38" clock top-left, a round pause button top-right, the remaining blocks dimmed below with time, name and thumbnail rows, "Complete Workout" outlined button at the bottom. |
| Insight Timer | iOS | Paused session | https://mobbin.com/screens/7e0d32d9-0307-4a43-ba85-64f99c6a669f | 2026-11-20 | [Observed] "Paused" label, large time, a play control, a white "Finish" button and a quiet "Discard session" text link. Finish and discard are both offered while paused. Not a rehab product. |
| Future Pro (fitness coaching) | iOS | Paused video workout | https://mobbin.com/screens/da78fe53-b3a0-4151-a05c-9b800f008997 | 2026-11-20 | [Observed] Video fills the screen with "Workout Paused" in the middle; top row has close, music, settings and play; time left in the corner; bottom sheet with exercise name, scrubber, list icon and play. Video-led model. |
| Hinge Health | Web | User manual | https://www.hingehealth.com/user-manual/ | 2026-11-20 | [Observed] (first 100,000 of about 135,800 characters read) Before a session: use about 2 by 2 metres, put the device on a flat surface, have equipment ready; the session overview lists duration, equipment and exercises and lets you turn camera-based form feedback on or off. During: a pause button bottom-right; the pause menu offers restart, skip, view video instructions, continue without the camera, end session, resume; a gear opens audio settings for narration and sound effects. Stop guidance: stop at once if an exercise causes or worsens pain; the doctor's instructions take precedence. Ending the session saves completed repetitions. End-of-session feedback is "Too easy" or "Too hard". |
| Hinge Health | iOS | App Store listing | https://apps.apple.com/us/app/hinge-health/id1429270372 | 2026-11-20 | [Observed] Guided sessions "anytime and anywhere"; version notes mention recurring session reminders added to the device calendar and program reminders that preselect days from weekly goals. Camera form feedback described elsewhere. |
| Medbridge GO | iOS | App Store listing | https://apps.apple.com/us/app/id1089747982 | 2026-11-20 | [Observed] Access code to sync the program, "GO" to follow exercise videos, exercises on a timer (a user review), Quick Log from the icon or notifications (version 2.7.0). |
| Physitrack PhysiApp | Web | Patient experience | https://physitrack.com/physiapp-patient-experience | 2026-11-20 | [Observed] Step-by-step video demonstrations, patients log progress and discomfort levels in real time and leave feedback for the therapist. Page does not mention language or accessibility features. |
| Nike Training Club, Headspace | iOS | Workout detail, session player | `docs/research/mobbin-patterns.md` §2 pattern 7 | 2026-11-19 | [Prior] NTC previews the whole workout before start with a sticky Start; Headspace player has a large pause, captions and a scrubber. Neither showed a pain-stop control. |
| W3C WCAG 2.2 | Web | SC 2.2.2, 2.5.7, 2.5.8, 3.2.6 Understanding pages | https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html ; `/dragging-movements.html` ; `/target-size-minimum.html` ; `/consistent-help.html` | 2026-11-20 | [Observed] 2.2.2 (A): auto-updating content over five seconds needs pause, stop or hide unless essential. 2.5.7 (AA): a single-pointer alternative to dragging. 2.5.8 (AA): 24 by 24 px minimum with spacing exception. 3.2.6 (A): repeated help in the same relative place. |

**Not accessible or not found:**
- Hinge Health and Sword Health: no usable flows on Mobbin (Hinge search returned zero flows; the Sword search returned an unrelated app). The Sword site page described the AI care specialist and "real-time feedback" in a care session but not how the session screen works. I saw no Hinge or Sword player screen.
- The Hinge user manual was read for the first 100,000 characters only.
- Pliability ("Hyrox warm-ups") appeared in Mobbin results but its screen URL was not retained, so it is not cited.
- MedBridge patient-engagement page and the Physitrack `/patient-app` page: fetch failed. No MedBridge or PhysiApp in-session screen was seen, only listing text.
- No product's accessibility behaviour (screen reader use, wake lock, audio cue timing) was inspected; Mobbin captures are static.
- WebPT, SPRY, Omada, Maven, MyChart, One Medical, Headway, Zocdoc (for this feature), Abridge, Ambience, Tebra, Medplum were not relevant to sessions and not researched here.

## 7. Established patterns

1. **Phase-led screen with one dominant number.** Google Health (Rest), WHOOP and NTC put the clock or phase name at the centre or top and everything else is small. Why: glanceable from a distance. [R, Observed]
2. **One persistent primary action at the bottom,** full width: Google Health "Complete", NTC "Complete Workout", WHOOP "End workout", Alan "Start the session". Why: thumb reach and a fixed place to look. [R, Observed]
3. **"Next" is shown during rest.** Google Health "Next: High plank, 30s"; CarePath already shows "Next: set 2 of 2". Why: the patient can get ready. [R, Observed]
4. **Pause is a small, always-present control with a menu of what to do next.** Hinge (restart, skip, view instructions, end), Future Pro (close, settings), Insight Timer (Finish or Discard). [R]
5. **Preview before start:** duration, equipment, exercise list (Alan, Hinge manual, NTC prior). [R]
6. **Audio is a setting, not a surprise.** Hinge puts narration and sound effects behind a gear. [R]
7. **A pain or "too hard" signal is gathered at the end, plus a stop instruction in the manual.** Hinge, Medbridge GO, PhysiApp. None of the pages I read shows a one-tap stop control in the in-session screen. [R; gap]
8. **Counter-pattern to avoid:** Alan's reward claim and locked-day countdown, and streak mechanics at PhysiApp and Medbridge GO. Brief §9 forbids manipulative engagement. [R, E]

## 8. Alternatives

### C1. Scrolling single-exercise page, refined (current model plus a sticky action bar)

- **Interaction model:** keep the page structure; pin the primary button and the Stop control in a bottom bar; move the exercise list and notice below; shorten copy; keep a collapsed "How to do it".
- **Benefits:** smallest change; keeps full text always available; all current tests and flows hold. [E]
- **Limitations:** still a document; the rest state is a panel in the middle of the page; type stays small for distance reading; no audio or wake lock unless added.
- **Accessibility:** unchanged and good (headings, focus, linked messages). Sticky bar must not cover focused content (2.4.11).
- **Business:** fine; small effect on completion (U).
- **Technical complexity:** low.
- **Error and recovery:** as now: "That did not save. Your place in the session is unchanged."
- **Evidence:** the existing walk in `docs/decisions/checkpoint-c2.md`; sticky primary action seen at Alan and NTC [R].

### C2. Full-screen phase-driven player

- **Interaction model:** the session is a sequence of phases on one screen: Get ready (first exercise only), Work, Rest, Next exercise, Finish. The screen keeps the same regions: top bar (back to Today, "Exercise 2 of 4", Contact care team), centre (exercise name very large, picture, and one big line such as "Set 1 of 2: 12 reps, hold 5 seconds"), bottom pinned bar (one full-width primary "Done with set 1", then Pause, Skip and "Stop, this hurts" in fixed positions). "How to do it" opens in a bottom sheet and is open by default the first time an exercise appears. Rest becomes the whole centre: huge countdown, "Next: set 2 of 2", Skip rest, Pause rest, and "Add 15 seconds" (client only). Optional sound cue at rest end behind a Sound setting (off by default) with an equal visual cue. Optional keep-screen-awake request with a plain fallback line.
- **Benefits:** one decision at a time; the same place for the same control; readable from a distance; fits patients moving. Matches the strongest references (Google Health, NTC, WHOOP). [R, Observed]
- **Limitations:** new layout and components; less text visible at once; more state to test; the screen-wake and audio behaviours are browser-dependent and I did not retrieve support data (U).
- **Accessibility:** buttons 56 px or more; phase changes announced politely (exists); focus to the heading on each phase; timers have pause (2.2.2); sound has a visual equal and a mute; no drag; works at 200 percent zoom because regions reflow; text instructions always reachable (no video-only content).
- **Business:** may raise completion by reducing confusion (U); no engagement tricks.
- **Technical complexity:** medium. Same endpoints; client state machine for phases; set count stays tab-local unless the contract changes (CR-C2 below).
- **Error and recovery:** a failed "Done with set" keeps the patient on the same set with the message and the local count intact; pause saves position and time; reload resumes at the first pending exercise.
- **Evidence:** Google Health rest, NTC overlay, WHOOP session [R, Observed]; Hinge pause menu and audio gear [R]; WCAG 2.2.2 [R]; effect on completion untested [U].

### C3. Video-led demonstration with captions and a set tracker

- **Interaction model:** a looping or full-screen video of the movement with captions and a rep or set tracker alongside (Future Pro, Medbridge GO and PhysiApp pattern).
- **Benefits:** shows technique, which text cannot do well; familiar from commercial apps. [R]
- **Limitations:** CarePath has no video field or captions, and its content is fictional and unreviewed; art direction bans instructional imagery. Showing a person doing an exercise on a clinical product is medical instruction that no one here has reviewed.
- **Accessibility:** needs captions or transcripts and a pause control; motion can distract or trigger discomfort.
- **Business:** higher production and review cost.
- **Technical complexity:** high: new media pipeline, captions, hosting.
- **Error and recovery:** video load failure must fall back to text; needs a design for it.
- **Evidence:** Medbridge GO and PhysiApp listings [R, Observed]; no source tested effect on technique or safety [U].

### C4. Interactive checklist

- **Interaction model:** all of today's exercises on one screen as cards; the patient ticks sets as they go, in any order, with an optional timer per exercise (Bevel pattern).
- **Benefits:** the patient sees everything; flexible for experienced patients; fast for gym-style routines. [R, Observed]
- **Limitations:** no guidance on what to do now; many small targets; free order conflicts with the plan order and the stored `currentPosition`; stopping is one control among many.
- **Accessibility:** many rows with small checkboxes; needs 48 px rows and grouping.
- **Business:** data on set ticks cannot be saved set by set with this API.
- **Technical complexity:** medium to high: ticks would need new storage.
- **Error and recovery:** easy to tick the wrong set; undo needed.
- **Evidence:** Bevel screen [R, Observed]; built for self-directed lifters, not clinician-prescribed rehab [E].

### C5. Camera-assisted session

- **Interaction model:** the camera tracks movement and gives real-time form feedback (Hinge "Motion Insights", described in its manual; Sword's real-time feedback).
- **Benefits:** form feedback and automatic rep counts. [R]
- **Limitations:** consent for motion tracking cannot be granted in this phase; REQ-SES-02 says no camera needed; video data raises privacy questions; competitor reviews in prior research report sensors sometimes fail to track (reviewer reports, not verified). [Prior]
- **Accessibility:** camera feedback is visual and spatial; needs a non-camera path (Hinge itself offers "continue without the camera").
- **Business:** differentiating, high cost.
- **Technical complexity:** very high.
- **Error and recovery:** tracking loss; fall back to manual counting.
- **Evidence:** Hinge user manual [R, Observed]; prior competitor analysis [Prior].

## 9. Mandatory gates

| Gate | C1 | C2 | C3 Video | C4 Checklist | C5 Camera |
|---|---|---|---|---|---|
| Accessibility (2.5.7, 2.5.8, 2.2.2, text alternative, keyboard, 200 percent) | Pass | Pass (needs the pause on every timer and a visual equal for any sound) | Fail as scoped: no captions or transcript fields exist | Pass only with 48 px rows; conditional | Fail: camera-only feedback without a non-camera path is not specified here |
| Privacy | Pass | Pass (no camera or microphone; sound is output only) | Pass | Pass | **Fail:** `motion_tracking` consent not grantable this phase |
| Safety (stop reachable at all times; no instructional content that is unreviewed; contact and emergency lines reachable) | Pass with condition (stop needs a rating, see CR-C1) | Pass with the same condition | **Fail:** unreviewed instructional video | Pass with condition; stop is less prominent (conditional) | Conditional on consent and review |

Ineligible now: **C3 and C5.** C1, C2 and C4 are eligible. All three eligible options share the CR-C1 condition because the contract requires a pain level to stop.

## 10. Weighted evaluation

Weights adjusted from the defaults (task effectiveness 25, safety/privacy/trust 20, usability and accessibility **25** (up from 20), business value **10** (down from 15), operational efficiency 10, technical feasibility 5, design-system consistency 5). Reason: the user is moving and reading at distance, so usability decides the outcome; business value barely differs between options because every option writes the same records. Score 1 to 5. C3 and C5 are not scored: ineligible.

| Criterion (weight) | C1 Scrolling page, refined | C2 Full-screen phase player | C4 Interactive checklist |
|---|---|---|---|
| Task effectiveness (25) | 3: works end to end, but the main action needs scrolling and the content is a document | 4: one decision per moment, fixed controls, rest and next clear | 3: flexible, but no "what now" and free order clashes with plan position |
| Safety, privacy, trust (20) | 4: stop visible; stop still needs a rating | 4: stop in a fixed place; same rating condition | 3: stop is one control among many; ticks can mislead the record |
| Usability and accessibility (25) | 3: small type at distance, long scroll | 4: large type, fixed bar; audio and wake lock are unproven here | 3: many small targets, dense |
| Business value (10) | 3: little change in completion (U) | 4: may reduce abandonment (U) | 3: unknown (U) |
| Operational efficiency (10) | 4: same records as today | 4: same records | 3: set-level data not storable now |
| Technical feasibility (5) | 5: small change | 3: client phase machine, new layout | 3: ticks need new storage |
| Design-system consistency (5) | 5: existing components | 3: new player components on existing tokens | 4: existing components |
| **Weighted total (out of 5)** | **3.50** | **3.90** | **3.05** |

Arithmetic: C1 = (3×25 + 4×20 + 3×25 + 3×10 + 4×10 + 5×5 + 5×5) / 100 = (75 + 80 + 75 + 30 + 40 + 25 + 25) / 100 = 3.50. C2 = (100 + 80 + 100 + 40 + 40 + 15 + 15) / 100 = 3.90. C4 = (75 + 60 + 75 + 30 + 30 + 15 + 20) / 100 = 3.05. Scores are expert judgement from the sources in §6; none comes from testing with patients.

Sensitivity: with the default weights the totals come out the same (C1 3.50, C2 3.90, C4 3.05) because the shifted weights moved between criteria where these scores are equal; the ranking does not depend on the adjustment.

## 11. Recommendation

**Select C2, the full-screen phase-driven player.** Runner-up: **C1, the scrolling page with a sticky action bar,** which is the fallback if the phase player cannot be built and verified in time.

Why C2 beats C1: the patient's job is to act while moving, and C2 gives the same control in the same place, one dominant number, and a clear rest and next state, which the three strongest references share (Google Health, NTC, WHOOP). C1 improves reach but stays a document. C2 beats C4 because rehab is clinician-ordered and guided, and the API tracks a single current position.

**Rejected:** C3 (video) is rejected now because there is no media or caption field and no reviewed instructional content; the trade-off is that technique is taught by text and a neutral picture only. C5 (camera) is rejected until a later phase with consent; the trade-off is no automatic form feedback. C4 is rejected as the main model; the trade-off is less flexibility for self-directed patients.

Carry into design (all within the current contract unless marked):
1. Pin one primary action; Pause, Skip and "Stop, this hurts" in fixed positions; Stop is never hidden behind a menu.
2. Add a "Get ready" line on the first exercise only: where to put the phone and clear space (adapted from Hinge's manual; wording is CarePath's own).
3. Preview before start (count and rough time from dose, which the plan already holds). Show only what the data holds; do not invent durations.
4. Sound cue for rest end and set done is optional, off by default, with an equal visual cue; keep-awake is requested with a plain fallback. Both [U] until tested on target phones.
5. Remove the "Today's exercises" list from the main view; reach it from a "List" control in the top bar.
6. Keep "How to do it" text always reachable; pictures stay neutral per art direction.
7. When a skip reason is "It hurts", prompt "Do you want to stop the session?" with Stop and Keep going (new behaviour; uses the existing stop path).
8. Do not add rewards, streaks or locked days.

**Contract requests (for the orchestrator; not made here):**
- **CR-C1 (safety):** make `discomfortLevel` nullable on `SessionStopRequest`, so "Stop, this hurts" ends the session immediately and the rating is asked straight after (the API already returns `checkInRequested: true`). Until then the UI cannot stop without a number and must not invent one.
- **CR-C2 (optional):** store completed sets per activity as they happen so a resume on another device keeps the set count. Today only a finished exercise is stored.

## 12. Requirement alignment row

| Field | Value |
|---|---|
| User segment | Patient with a published plan doing exercises at home; includes older adults |
| Job to be done | Do today's exercises with confidence, stop safely if something hurts, and pick up after an interruption |
| User pain point | Primary action out of reach; small text at distance; unclear rest and next; having to rate pain before stopping; losing place |
| Business objective | Higher completion of prescribed sessions; trustworthy session records |
| Functional requirement | REQ-SES-01 to 04; AC-C1, C3, C4, C5; CR-C1 for stop without a rating |
| Success metric | Session completion rate; start-to-finish time; resume rate; skip rate and reasons; stop rate and time to pain report; abandonment rate |
| Design hypothesis | If the patient has one large action in a fixed place and a clear rest and next state, more sessions finish and fewer are abandoned mid-way [U, untested] |
| Selected pattern | Full-screen phase-driven player with a pinned control bar |
| Technical dependency | `sessions` endpoints (start, pause, resume, activity update, stop, complete); `useCountdown`; CR-C1; optional CR-C2 |
| Validation method | Task test at 390 with the phone propped at about a metre (five or more adults, at least two over 60); keyboard-only Playwright pass at 390 by 844 (AC-C5); test of screen-lock and sound on one iPhone and one Android phone; screen reader pass |

## 13. States to design

| State | Microcopy | Recovery |
|---|---|---|
| Default (work) | "Exercise 2 of 4. Single knee to chest. Set 1 of 2: 12 reps, hold 5 seconds." Button: "Done with set 1" | Done, Pause, Skip, Stop |
| Hover, focus, active | Visible focus ring; pressed state on the primary bar | Not applicable |
| Selected | Chosen skip reason shows a filled radio and a check | Change before confirming |
| Disabled | Primary shows "Saving" while the request runs; other controls disabled only during the request | Wait a moment |
| Loading | "Starting your session" after Begin; "Saving" on Done | Stay on the screen |
| Empty | "There is no published plan to start from. Ask your care team." | Contact care team |
| Get ready (first exercise) | "Put your phone where you can see it, with clear space around you. Have a chair or wall close if you need support." | Start |
| Rest | "Rest. 00:30. Next: set 2 of 2." Skip rest, Pause rest, Add 15 seconds | Skip or wait |
| Rest over | "Rest is over. Start the next set when you are ready." (announced; optional tone) | Tap Done when set ends |
| Timed hold | "Hold: 00:05" with Start, Pause, Reset | Reset |
| Partial data (resume) | "Welcome back. You are on exercise 3 of 5. Your place is saved." | Resume session |
| Paused | "Session paused. Your place is saved. Nothing is lost if you close this page." | Resume, Back to Today |
| Validation error (skip) | "Choose a reason. Your therapist reads it." | Pick a reason |
| Skip because it hurts | "Do you want to stop the session? Stopping tells your therapist." Buttons: "Stop session", "Keep going" | Either |
| Stop, this hurts | Sheet or screen: "Stop this session? This ends today's session and tells your therapist." then "How much does it hurt right now?" 0 to 10 | Stop; rating can be skipped once CR-C1 lands |
| Stopped | "Session stopped. Thank you for telling us. Your therapist will see this." then the contact and emergency lines once | Report pain, Back to Today |
| Server error | "That did not save. Your place in the session is unchanged. Try again." | Try again |
| Network loss | "No connection. This set is not saved yet. Your count on this screen is kept." | Retry when back online; Pause still works locally and saves on reconnect [Assumption: needs queueing design] |
| Session closed elsewhere | "This session has already ended. Go back to Today to see where it stands." | Back to Today |
| Another session open | Redirect to Today, which shows Continue session | Continue |
| Plan updated mid-session | "Your therapist updated your plan. This session keeps the version you started. The new plan starts next time." | Continue |
| Permission denied | Redirect to the role's own home | Redirect |
| Success | "Session complete. 4 of 4 exercises done." then "How did it go?" with one pain number | Send check-in |
| Cancellation | "Keep going" and "Keep exercise" always offered on sheets | Dismiss |
| Interrupted | Phone call or lock: session stays in progress or paused; Today shows "Continue session" | Continue |
| Abandoned | "This session ended. It was left open for more than a day, so CarePath closed it. What you recorded is kept." | Back to Today |
| Unsaved changes | Set count is on this device only; "Your set count is kept on this device." | Finish exercise saves it |
| Stale information | Elapsed time and position shown from the server on resume | Resume reloads |

## 14. Responsive behaviour

- **375 and 390:** full-screen player; bottom bar holds the primary button (at least 56 px high) and a row of Pause, Skip and Stop (48 px or more, separated); the exercise name and the set line are the largest text; "How to do it" and the exercise list open in sheets.
- **768:** same model, centred at a readable width; the picture grows; type scales up so it reads at a metre.
- **1024:** two columns: left, picture and exercise name; right, set line, controls and the exercise list as a quiet panel. Phone behaviour stays the default for the control bar.
- **1440 and 1920:** the player stays a focused column with the list panel beside it; nothing small or dense is added; type may grow further for distance reading. No clinical sidebars.
- **What changes model:** nothing. Landscape on a phone keeps the same regions in two columns [Assumption: to be tested].
- Check at 200 percent zoom and 320 CSS px reflow; the bar must never cover a focused control.
