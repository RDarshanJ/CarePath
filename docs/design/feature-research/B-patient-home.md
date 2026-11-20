# Feature B: Patient home dashboard ("Today")

Status: provisional until advisor sign-off. Protocol: `docs/design/RESEARCH-PROTOCOL.md`. Brief: `docs/DESIGN-BRIEF.md` section 7 B. Access date for every external source: 2026-11-20. No colours are chosen here.

## 1. User problem

A person in rehab opens the app wanting to know one thing: what should I do now, and is anything else waiting on me? Today answers that, but it presents the session, a plan-change note, a check-in, the next visit, messages, weekly progress, the care plan and reminders as seven stacked sections of near-equal weight. The patient has to read down the page to find what matters, and the one action that matters (do today's exercises) competes with a second button (Check in) and a long list of links.

## 2. User and context

- Who: an adult patient with a published plan, usually a musculoskeletal or post-injury condition. Some will be older, in pain, or tired. Some are new to apps. [Assumption, from PRD segments; no research participants were used.]
- Where and device: mostly a phone, one-handed, often before or after exercising, sometimes at home on a couch or standing in a hallway. Occasionally a laptop. Screens at 375 to 390 wide are the primary case.
- State: may have pain or limited motion, may be anxious about a recent plan change, may have low patience for reading.
- Frequency: daily on scheduled days (up to `timesPerDay` times), glanced at on rest days.
- Other roles that touch it: clinicians change the plan (which triggers the plan-change note); the clinic sets reply time and phone shown in "Contact care team".

## 3. Business objective

Help patients do the prescribed work consistently and stay connected to the care team, without manipulative engagement tricks (brief section 9).

Metric names only (none measured yet): session start rate on scheduled days; time from app open to session start; weekly completed versus assigned sessions; check-in completion after a session; appointment attendance for visits shown on Today; unread-message time to open; plan-change acknowledgement rate.

## 4. Constraints

Functional (checked against `packages/shared/src/contracts/today.ts`, `progress.ts`, `scheduling.ts`, `messaging.ts`, `care-plan.ts` and `docs/architecture/api-phase3.md`):

- `TodayView` supplies: date and zone (computed server-side, never from the browser clock), patient given name and status, plan summary (title, version, `exerciseCount`, `exercisesToday`), `session.state` (`due`, `in_progress`, `paused`, `done`, `not_scheduled`) with `openSessionId`, `checkIn.due`, `planChange` (until acknowledged), `week` (week-to-date assigned, completed, stopped, activities done and skipped), `messages` (`unreadCount`, `unreadConversations`), and `nextAppointment`.
- Gap: no estimated session length. The plan has per-exercise dose (sets, reps, hold seconds, duration seconds, rest seconds), but rep-based work has no time per rep, so any minutes figure would be a guess. Showing "about 12 min" needs a contract addition (a clinician-set or server-computed `estimatedMinutes`, with the rule disclosed). Until then Today should say "4 exercises" and nothing about time. [Assumption: the addition is feasible; not verified with the API owner.]
- Gap: `week.assignedSessions` is week to date, so a ring or "x of y this week" total can read as falling behind early in the week. Existing copy ("so far this week") is correct and must stay.
- No streak, score, points or "readiness" fields exist, and none should be invented.

Technical: server components fetch Today, Plan and Clinic in parallel; Contact care team lives in the shared header (`patient-frame.tsx`). Messages unread count follows a client poll for the nav badge.

Safety and privacy: demonstration banner ("Synthetic data. Not for clinical use") stays. Today shows names and clinical context, so it must not leak into notifications or page titles. A stopped-for-discomfort session must not be framed as failure. Adherence counts must not be presented as recovery (brief section 7 E; AC-C7).

Accessibility (WCAG 2.2 AA): one h1, ordered headings, one primary control per state; targets at least 24 by 24 CSS px (SC 2.5.8, the repo already uses a larger `min-h-target`); help in a consistent place across pages (SC 3.2.6, already met by the header button); no meaning by colour alone (SC 1.4.1); status changes (new message, session saved) announced politely; 200 percent zoom and 320 px reflow without two-axis scrolling. Checked against the W3C Understanding pages for [3.2.6](https://www.w3.org/WAI/WCAG22/Understanding/consistent-help.html), [2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) and [1.4.1](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html).

## 5. Current CarePath implementation

Read: `apps/web/app/(patient)/(app)/today/page.tsx` (420 lines) and screenshots `docs/screenshots/3.4b/c01-today-due-390.png`, `c10-today-done-*`, `docs/screenshots/4.3a/e01-today-*`.

What exists: greeting and date; a hero card (eyebrow, plan title, exercise count and numbered exercise names, one full-width primary button) with variants for awaiting assignment, no plan, due, in progress or paused, done, and rest day; a plan-change note below the hero; then sections Daily check-in, Next appointment, Messages, This week (progress bar), Your care plan, Reminders.

Weaknesses observed in the 390 screenshot (page is about 2,300 px tall):

1. Equal-weight sections. Seven headings at the same level and spacing; nothing says "this one matters most after the hero".
2. Two actions compete. When a session is due the page also offers a secondary "Check in" button, so the first scan has two buttons.
3. The plan-change card (long: note, three changed items, Got it) sits directly under the hero and pushes everything else off the first screen. The acknowledgement matters, but at that length it dominates.
4. Duplication. "Your care plan" repeats the Plan tab; "Reminders" repeats the check-in, next session and appointment already shown above.
5. No time cue. "4 exercises" with a numbered list, no sense of effort.
6. Next appointment and messages are plain text plus a link, so an appointment tomorrow looks the same as one in three weeks.
7. Progress is a thin bar with "2 of 3 planned so far this week", which is accurate but does not show which days are done.
8. On the 390 capture only two bottom tabs were visible (Today, Progress); the later 4.3a captures show four. The tab set is a nav matter, tracked outside this file.

Strengths to keep: one hero with one primary action; honest copy ("so far this week"); empty states that say why and offer one action; rest-day wording that does not push exercise; shared Contact care team button.

## 6. Production references observed

Mobbin access: reachable (iOS and web). I viewed the low-resolution preview frames returned (an evenly spaced sample of long flows), so "observed" below means frames I saw, not whole flows. Links are Mobbin pages, not copies of the images.

| Product | Platform | Screen or flow | URL | Observed |
|---|---|---|---|---|
| Alan (back pain programme) | iOS | "Starting an exercise (back pain)" and "Program detail (back pain)" | https://mobbin.com/flows/fa306be6-28eb-4da1-bca5-7c4af6235f30 and https://mobbin.com/flows/a2c9f648-eac5-43a9-b41d-9ec099ea8c78 | [Observed] A single session card ("Session 2", exercise names, "Day 2/14" with a dotted day tracker, one "Start task" button). The next session is a disabled card with a countdown ("Available in 07:44:40"). Each exercise row states type, minutes and intensity ("Stretching, 2 min, Moderate"). A "You did it" screen offers a reward button. |
| Pliability | iOS | "Welcome series" | https://mobbin.com/flows/419e86f5-96b9-4ee9-b81e-4f1e32a0c300 | [Observed] A week list with "Completed 0 of 5", each day with a duration (15 min, 17 min, 20 min), a play control on the current day, and a path-progress footer (percent complete, week, routines left). |
| Noom | iOS | Today tab ("Today's plan") and Messages | https://mobbin.com/flows/de3e8976-5388-4906-8635-0832fa620b4f | [Observed] A week strip with the selected day, then a "Today's plan" list of equal-weight task cards (lesson, log meals, weigh in, challenge), and an unread badge on a chat icon. Many items, no single dominant action. |
| Strava | iOS | Home and "Your weekly snapshot" | https://mobbin.com/flows/d88386b4-4334-4f55-8782-b5c478c6b8c8 | [Observed] A weekly snapshot row (activities, time, distance with deltas) at the top, then one large "Record an Activity" button, with an empty-state sentence ("Ready to get moving"), then promotional challenge cards. |
| Oura | iOS | Home, "Daily readiness data" | https://mobbin.com/flows/1a062e29-239c-4971-94cd-292b42dfcc7c | [Observed] Hero score cards (a number in an arc with a one-word label and a one-sentence explanation), tabs Yesterday and Today, bottom nav. The hero is a computed score, not a task. |
| Apple Health | iOS | Summary | https://mobbin.com/flows/6fd21fc4-6319-49b6-8b00-8c9edc0058b6 | [Observed] User-pinned metric cards with an Edit action, dismissible setup cards ("Get More From Health"), a Sharing tab. No required action. |
| CVS Health | iOS | "Your health" | https://mobbin.com/flows/0e18922d-3828-4693-8da1-4a6a3bca9a1c | [Observed] A short list of record shortcuts (vaccine history, previous visits, lab results, prescriptions), then service cards including "Cancel or reschedule easily". Service-led, not task-led. |
| Zocdoc | iOS | Home and Appointments tab (frames inside the booking flows) | https://mobbin.com/flows/fcd6461e-af19-4ca9-9864-8b21c286888c | [Observed] "Up next" card with date, time, clinician, reason and a map; "Book an appointment" below it. Home carries a "Well Guide" preventive-care ring ("0/4 visits complete") and recommendations. |
| Hinge Health | iOS | Not on Mobbin. The search for "Hinge Health" returned the dating app Hinge, which I ignored. | https://help.hingehealth.com/en/support/solutions/articles/155000002532-where-do-i-access-my-exercises- | [Observed, official help text] The first session takes about ten minutes. A new daily playlist then appears each day; playlists take about 10 to 15 minutes and at least three a week are recommended. The page does not describe the home screen. No Hinge Health interface was inspected. |
| Sword Health | iOS | Not searched on Mobbin | https://apps.apple.com/us/app/sword-health/id1468523447 | [Observed, App Store listing text] Sessions are described as "as little as 10-15 minutes a day", with real-time guidance. Screens not inspected. |
| Flo, Headspace, Fitbit, WHOOP, Nike Training Club | iOS | Daily home, week strip, timeline, hero ring | see `docs/research/mobbin-patterns.md` section 6 | [Prior research, not re-observed today] Flo: week strip plus one hero statement and quick actions. Headspace: vertical "Start your day" timeline. Fitbit: hero ring with no-data state. |
| Not accessed | | MedBridge, WebPT, PhysiApp, SPRY, Omada, Maven, MyChart home | | Not found on Mobbin in today's searches (generic "physical therapy app" query returned Alan and Pliability only). Not inspected through other sources. |

## 7. Established patterns

1. One hero, one action. Alan, Strava ("Record an Activity") and the existing CarePath hero all put a single large control first. It works because the next move needs no decision.
2. Duration is stated with the session. Alan, Pliability, Hinge Health and Sword all say how long it takes, in minutes. Patients decide when to start based on that. CarePath cannot yet (section 4).
3. A cheap sense of the week. Alan's dotted day tracker, Pliability's "0 of 5", Strava's weekly snapshot give progress at a glance without a chart.
4. A next-step card that goes quiet when done. Alan shows the next session as locked with a wait. CarePath's "Done for today" plus next scheduled day is the same idea.
5. Time-bound items are promoted, others are not. Zocdoc's "Up next" is a card with date and time; it is one item, not a list.
6. Known failure modes: equal-weight task lists (Noom) dilute the primary action; promotional or reward cards (Strava challenges, Alan's reward button, Apple Health setup cards) distract; computed hero scores (Oura) answer "how am I" rather than "what do I do", and for rehab would read as a health judgement.

## 8. Alternatives

Evidence labels: R = research evidence (observed in a production source above), J = expert judgement, U = untested assumption.

### B1. Daily task-based home, one primary action (refined current model)

- Problem addressed: what do I do today, with minimal reading.
- Interaction model: hero card holds the day's state and the single primary button. Below it, one compact "also today" list in fixed priority: plan-change note (collapsed to a one-line summary with "See what changed"), check-in (only when due and not competing with the session), next appointment (promoted with day and time when within 2 days), unread messages (one line only when greater than zero). A quiet week strip (days done, planned, rest) and a link to Progress close the page. The care plan section is removed (Plan tab owns it).
- Benefits: smallest scan cost; matches REQ-TOD-01; works with current contracts; every state already exists.
- Limitations: no time estimate until the API adds one; less "alive" than a score dashboard.
- Accessibility: linear reading order equals priority order; the week strip needs text for each day (not colour); collapsed plan note must be keyboard operable and keep focus.
- Business: supports session start rate and check-in completion; no engagement tricks.
- Technical complexity: low. Reorder, collapse and delete sections; week strip needs `week` plus per-day data, which Today does not give (only counts). Either render counts as segments ("2 of 3") or fetch `/progress?weeks=1` sessions for day dots (one more call). 
- Error and recovery: if the Today fetch fails, show a retry with the Contact care team button still present; if only messages or appointment fail, show the hero and a per-item "Could not load, try again".
- Evidence: R (Alan, Strava, Hinge Health help, existing REQ-TOD-01); J (ordering of secondary items).

### B2. Timeline-based daily home

- Problem addressed: sequence of today's events, especially on days with a visit.
- Interaction model: vertical timeline of today and tomorrow: session window, appointment at 2:00 PM, check-in after session. Items are time-ordered and the next one is marked.
- Benefits: clear when an appointment and a session share a day; mirrors Headspace's "Start your day" (prior research, R).
- Limitations: CarePath sessions have no scheduled time of day (only a day and `timesPerDay`), so most timelines would have one or two items and invented times; mixes optional and fixed-time items in one list.
- Accessibility: ordered list, fine; time zone naming required for visits.
- Business: neutral.
- Technical complexity: low-medium; needs a rule for placing an untimed session.
- Error and recovery: as B1.
- Evidence: R (Headspace, prior research), J (that untimed sessions break the model).

### B3. Goal-oriented progress dashboard

- Problem addressed: motivation; how am I doing.
- Interaction model: hero is a ring or score (adherence or goal progress), with tasks below.
- Benefits: familiar from Fitbit, Oura, Strava goals.
- Limitations: the task is no longer first; week-to-date denominators make early-week rings look poor; goal progress is not computable (care-plan goals have a target and a due date but no current value; "CarePath does not score them" is already stated in Progress); a hero number reads as a clinical verdict.
- Accessibility: rings need a text equivalent; fine if built, not the issue.
- Business: may raise open rate; risk of engagement-driven pressure (brief section 9).
- Technical complexity: medium; no goal-progress data exists.
- Error and recovery: unclear state when data is missing.
- Evidence: R (Oura hero score, Fitbit ring in prior research); J (risk to trust).

### B4. Personalised care-plan overview

- Problem addressed: understanding the whole plan on arrival.
- Interaction model: plan card first (title, version, exercise list for the week, author), then today's status.
- Benefits: keeps the clinician-authored plan visible; easy to build from `CarePlanView`.
- Limitations: the patient already knows their plan on most days; duplicates the Plan tab; pushes the action down.
- Accessibility: fine.
- Business: neutral.
- Technical complexity: low.
- Error and recovery: as B1.
- Evidence: J only.

## 9. Mandatory gates

| Alternative | Accessibility | Privacy | Safety | Result |
|---|---|---|---|---|
| B1 | Pass (linear order, text for week strip, collapsed note keyboard operable) | Pass (no new data shown) | Pass (counts only, no verdicts; stopped sessions neutral) | Eligible |
| B2 | Pass | Pass | Pass | Eligible |
| B3 | Pass if built carefully | Pass | Fail as specified: a hero score or ring of adherence invites reading it as recovery or as a grade, and goal progress cannot be computed from the API | Ineligible (passes only if reduced to B1's quiet week strip, which is B1) |
| B4 | Pass | Pass | Pass | Eligible |

## 10. Weighted evaluation

Weights: default (task 25, safety/privacy/trust 20, usability/accessibility 20, business 15, operations 10, technical 5, design system 5). No adjustment; the feature is clinically low-risk and the default already favours task and safety.

| Criterion | B1 | B2 | B3 (ineligible) | B4 |
|---|---|---|---|---|
| Task effectiveness (25) | 5: first scan reaches the action | 3: untimed sessions make the timeline thin | 3: task is second | 3: plan is rarely the question |
| Safety, privacy, trust (20) | 4: counts only; time estimate withheld until sourced | 4: no new risk | 2: score implies judgement | 4: no new risk |
| Usability, accessibility (20) | 5: shortest page, linear | 4: simple but longer | 3: ring needs equivalents | 3: heavier first screen |
| Business value (15) | 4: supports start and check-in rates | 3 | 3: may lift opens, adds pressure | 3 |
| Operations (10) | 4: fewer "where is my plan" contacts is plausible [U] | 3 | 3 | 3 |
| Technical (5) | 5: reorder only | 4 | 3: no goal data | 5 |
| Design system (5) | 5: existing hero and sections | 3: new timeline | 3: new ring | 5 |
| Weighted total (out of 5) | 4.55 | 3.45 | 2.80 | 3.40 |

Arithmetic: B1 = (25x5 + 20x4 + 20x5 + 15x4 + 10x4 + 5x5 + 5x5) / 100 = 4.55. B2 = 3.45. B3 = 2.80. B4 = 3.40. Scores are expert judgement; none is a measurement.

## 11. Recommendation

Select B1, with one borrowed idea from B2: when an appointment is today or tomorrow, promote it to a time-stamped card directly under the hero (the only case where time order matters).

Five-second hierarchy (not equal):

| Rank | Patient question | Treatment | Source |
|---|---|---|---|
| 1 | What do I need to do today? | Hero: state title and one full-width primary button. Exactly one primary button on the page. | `session.state` |
| 2 | How long will it take? | "4 exercises" now. Add minutes only after the API provides `estimatedMinutes` with a disclosed rule. Never estimate in the client. | gap |
| 3 | What is my next appointment? | One card with day, time, zone name and clinician; promoted under the hero if within 2 days, otherwise a single line below. | `nextAppointment` |
| 4 | How can I contact my care team? | Persistent header button (unchanged), plus one line for unread messages when greater than zero. | `messages`, `ClinicCard` |
| 5 | How am I progressing? | Quiet week strip and link. No score, no caption. | `week` |

Why it beats B2: Most days have no timed item, so a timeline mostly shows one card and invented times. Why it beats B4: the patient knows their plan; the Plan tab holds it. Rejected: B3 (fails safety gate as specified).

Trade-off: no minutes on the hero until the API changes; the page feels plainer than a score dashboard. Accepting both.

Also decided: move check-in under the hero as a secondary text-weight action while a session is due; show it as the primary only when the session is done and check-in is due (current behaviour for `done`).

Open questions for the advisor: (1) approve an `estimatedMinutes` field on `plan` in `TodayView`? (2) is the plan-change note a card that must be dismissed, or a collapsed row? Currently it must be acknowledged (REQ-TOD-02); recommend keeping acknowledgement but collapsing detail.

## 12. Requirement alignment row

| Field | Value |
|---|---|
| User segment | Active patient with a published plan |
| Job to be done | Know what to do today and start it with one tap |
| Pain point | Seven equal sections; two buttons; no sense of effort; plan-change card dominates first screen |
| Business objective | Consistent session completion and care-team connection without pressure tactics |
| Functional requirement | REQ-TOD-01 (one primary action, then plain list), REQ-TOD-02, REQ-TOD-03 |
| Success metric | Session start rate on scheduled days; time from open to session start; plan-change acknowledgement rate (names only) |
| Design hypothesis | If the hero is the only primary control and secondary items follow fixed priority, patients reach the session faster and report fewer "where do I start" questions. [Untested] |
| Selected pattern | B1 daily task-based home, with promoted same-day appointment |
| Technical dependency | `TodayView` as is; optional `estimatedMinutes`; optional per-day sessions for week strip |
| Validation method | Five-second test with synthetic task scenarios (questions below), keyboard and screen-reader walkthrough, 320 px and 200 percent zoom check; Playwright asserts one primary button per state (existing) |

Five-second test questions (moderated or unmoderated, to run later; no results exist yet): after five seconds on the screen, "What would you do next?", "Do you have anything booked?", "Is anything waiting from your care team?", "How was your week?". Pass signal is naming the session as the next step without scrolling.

## 13. States to design

| State | Microcopy (plain, present tense) | Recovery or action |
|---|---|---|
| Default, due | Title: plan name. "4 exercises, set by your care team." Button: "Start today's session" | Primary button |
| In progress / paused | "Your place is saved. Pick up where you stopped." Button: "Continue session" or "Resume session" | Primary button |
| Done, check-in due | "Done for today." Button: "Add your check-in" | Primary button |
| Done, no check-in | "Done for today. Your plan next schedules exercises on Monday." | None required |
| Rest day | "No session scheduled today." Secondary: "Start a session anyway" | Optional |
| Stopped for discomfort | Neutral: "You stopped today's session. Your care team can see why." No failure wording | Link to Contact care team |
| Awaiting assignment / no plan | "Your details are with the clinic. Nothing is needed from you right now." | Review sharing and consent |
| Loading | Skeleton of hero only, labelled "Loading today" | None |
| Partial data | Hero shows; failed card shows "Could not load your visits. Try again." | Retry per card |
| Server error | "Today did not load. Your plan is safe. Try again, or contact your care team." | Retry plus header contact |
| Network loss | "You are offline. Showing what was last loaded at 9:12 AM." (only if cached; otherwise error above) | Retry on reconnect |
| Stale information | A timestamp "Updated 9:12 AM" near the hero if older than a few minutes | Pull or button to refresh |
| Plan changed (unacknowledged) | "Your plan changed" collapsed to one row with "See what changed" and "Got it" | Acknowledge; note stays in plan history |
| Permission denied / session expired | "You have been signed out. Sign in to continue." | Sign in |
| Unread messages | "2 unread messages from your care team." | "Read messages" |
| Appointment today | "Today, 2:00 PM to 2:45 PM, Follow-up with Terry. Times are in Mountain Standard Time." | See appointments |
| Focus, hover, active, disabled | Standard focus ring on all controls; no disabled hero button (hide instead of disable) | n/a |

Not applicable: validation error (no form), unsaved changes, interrupted workflow beyond paused session (covered).

## 14. Responsive behaviour

- 375 and 390: single column. Hero, then same-day appointment if any, then check-in, unread line, week strip. Bottom tab bar. Primary button full width. Plan-change note collapsed. Target page height under about two screens (current about 2,300 px).
- 768: single column up to a comfortable measure (about 640 px), tab bar becomes top nav. Hero button auto width.
- 1024: two columns: hero and check-in on the left; appointment, messages and week strip in a side column. Reading order stays hero first.
- 1440: same two columns, centred, maximum content width; no extra widgets added to fill space.
- 1920: same layout as 1440, centred with more margin; do not scale type or add panels.
- What changes model: nothing; the page is the same task-first model at all widths. Contact care team stays in the same header position (SC 3.2.6).
