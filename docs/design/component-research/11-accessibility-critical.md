# Family 11: Accessibility-critical interactions

Status: provisional until the advisor signs off. Access date for every external source: 2026-11-20. Protocol: `component-research/PROTOCOL.md`. Source brief: `docs/COMPONENT-BRIEF.md` §17, §21, §22, §23. Decision records: CD-120 to CD-127 in `docs/design/component-decisions/`.

Scores are heuristic judgements by the author. No user testing and no assistive-technology testing was run for this file; every behaviour below that depends on a screen reader, a browser or a device is **[Assumption]** until it is tested. Static Mobbin frames cannot show focus order or announcements, so Mobbin is used here only for layout (for example sticky bars), not for behaviour.

Evidence labels: **[Observed]** retrieved and read today; **[Code]** read in the repository today; **[Prior]** earlier CarePath file; **[Assumption]** inference; **[Not retrieved]** attempted and failed, or not attempted.

## 0. What the code does today [Code]

| Topic | Fact |
|---|---|
| Focus on view change | `session-player.tsx` `ViewHeading` focuses its heading on every render after the first (`tabIndex=-1`, `focus:outline-none`). `onboarding-flow.tsx` and `booking-flow.tsx` use `Heading tabIndex={-1}` with their own refs. Onboarding also focuses an error summary and the first invalid field (`summaryRef`, `target?.focus()`). Three implementations of one pattern. |
| Skip links | Two copies (`shells.tsx`, `patient-frame.tsx`). Missing on `/login` and `/onboarding` (matrix finding G6). `main#main` target exists on all shells. |
| Target size | Tokens: patient theme `--cp-target-min` and `--cp-target-floor` both 48 px; clinician theme min 32 px and floor 24 px (`tokens.css` 89, 157). Checkbox and radio rows use the whole row as the hit area with `min-h-target`. Clinician-theme controls that sit at the 24 px floor: toast dismiss and `EvidenceRef` numbers (matrix). Bottom tab bar is `min-h-16` (64 px). |
| Non-drag | No drag handlers anywhere in `apps` or `packages/ui` (searched `draggable`, `onDrag`, `dnd`). Reordering is by Move up and Move down icon buttons in `item-editor.tsx`. Pain entry is a radio group, not a slider. |
| Reflow and zoom | `PainScale` uses a container query (6 columns below `@xl`, 11 above). Patient pages use `max-w-3xl`. Tables are in scroll regions or lists depending on screen (matrix G4/G5). Not verified at 320 CSS px or 400 percent zoom today. |
| Reduced motion | `components.css` 60 to 68: under `prefers-reduced-motion: reduce`, all animation and transition are turned off and `scroll-behavior` set to auto. Tokens zero the duration variables (`contrast.test.ts` asserts it). The only continuous animation is the 800 ms `cp-spinner`, which therefore stops under reduced motion. |
| Sticky elements | Clinician layout sets `html{scroll-padding-top:7rem}`. Patient app layout sets `html{scroll-padding-bottom:6rem}`. Sticky items: patient bottom tab bar (`sticky bottom-0 z-10`, `md:hidden`), plan builder header (`sticky top-0 z-10`) and side panel (`sticky top-16`), record header (`sticky top-0 z-10`), queue detail (`xl:sticky xl:top-4`). The onboarding route sits outside the `(app)` group, so it does not get the patient scroll-padding; it has no sticky bar I found [Code, not exhaustively checked]. |
| Timers and live text | Session `role="timer" aria-live="off"` for a hold timer and a rest timer; separate `sr-only role="status" aria-live="polite"` paragraph in the session player. Toast has a live region and a 7 s auto-dismiss; error toasts have appeared behind open dialogs (matrix, family 10). |
| Row clicks and truncation | `Tr onClick` on directory and queue rows (mouse-only target; keyboard goes through the link in cell one). Truncated table cells use `title` only. |
| Drawer on narrow screens | `DrawerContent` (Radix dialog) used as a bottom sheet on the patient side and a right drawer on the clinician side. |

## 1. Sources used in this file

All accessed 2026-11-20.

| Source | URL | What it says (paraphrased) |
|---|---|---|
| WCAG 2.2, SC 2.4.11 Focus Not Obscured (Minimum), Understanding | https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html | AA. A focused item must not be entirely hidden by author-created content; partial cover is allowed. Sticky headers and footers are a named failure (F110) when they fully hide the focused item. Sufficient fix: CSS `scroll-padding` (C43), a modal, or closing the banner on focus loss. |
| WCAG 2.2, SC 2.5.8 Target Size (Minimum), Understanding | https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html | AA. Pointer targets at least 24 by 24 CSS px, or enough spacing (a 24 px circle on each target must not overlap another). Exceptions: equivalent control, inline text, user-agent control, essential. Encourages larger targets for important controls. |
| WCAG 2.2, SC 1.4.10 Reflow, Understanding | https://www.w3.org/WAI/WCAG22/Understanding/reflow.html | AA. Vertical-scroll content must work at 320 CSS px wide (equivalent to 400 percent zoom of 1280) without two-way scrolling. Exceptions for content that needs two dimensions (data tables, maps, diagrams, toolbars); related headings, search and paging must still reflow. |
| WCAG 2.2, SC 2.3.3 Animation from Interactions, Understanding | https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html | AAA. Non-essential motion triggered by interaction must be possible to turn off; `prefers-reduced-motion` is a sufficient technique. |
| WCAG 2.2, SC 2.5.7 Dragging Movements, Understanding | https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html | AA. Drag must have a single-pointer alternative; sortable-list example: select an item, then up and down controls; keyboard support does not satisfy this criterion by itself. |
| WCAG 2.2, SC 2.2.1 Timing Adjustable, Understanding | https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html | A. A time limit set by content must be turn-off-able, adjustable, or extendable with a warning of at least 20 seconds, unless real-time or essential. |
| WCAG 2.2, SC 4.1.3 Status Messages, Understanding | https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html | AA. Success, progress, busy and error messages that appear without a focus change need a role or live region so assistive technology announces them; dialogs and accordions are covered elsewhere. `role="status"` for results, `role="alert"` for errors. |
| WCAG 2.2, SC 2.4.1 Bypass Blocks, Understanding | https://www.w3.org/WAI/WCAG22/Understanding/bypass-blocks.html | A. A way to bypass repeated blocks; skip link to main content (G1) or landmarks (ARIA11) are sufficient. |
| WCAG 2.2, SC 3.3.7 Redundant Entry | https://www.w3.org/WAI/WCAG22/Understanding/redundant-entry.html | See `01-clinical-inputs.md` §2. |
| WAI-ARIA APG, Modal dialog | https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/ | Focus moves into the dialog on open (static title element for large content, least destructive action for irreversible final steps); Tab wraps inside; Escape closes; focus returns to the opener unless the workflow suggests a better target; a visible close or Cancel in the tab order. |
| GOV.UK, Error summary | https://design-system.service.gov.uk/components/error-summary/ | See `01-clinical-inputs.md` §2. |
| GOV.UK, Radios (conditional reveal) | https://design-system.service.gov.uk/components/radios/ | Conditional reveal has a known problem: users are not always told that a question appeared or disappeared (WCAG 4.1.2); keep revealed questions simple. |
| Mobbin sticky action bars (iOS) | Future Pro https://mobbin.com/screens/56a56b7d-7c3b-4137-8113-d729758477b6 ; Headway https://mobbin.com/screens/c0de1b6d-2cb6-4f5d-b91a-2c6b8429eb6f ; Flo https://mobbin.com/screens/ac738e9a-4e79-45c8-bc56-7d227efc4242 | [Observed] Each has a bar fixed at the bottom with the next action (Future Pro: Back plus a button naming the slot; Headway: Continue; Flo: Next) over scrollable content. The frames show where the bar sits, not how focus or scroll behave. |

Not retrieved: WCAG 2.4.3 Focus Order, 2.4.7 and 2.4.13 focus appearance, 1.4.12 Text Spacing, 2.1.1 Keyboard, Apple HIG accessibility pages, Material 3 accessibility pages, NHS and CMS accessibility pages, and any healthcare product's accessibility statement. Decisions touching those rest on the retrieved pages above plus [Assumption].

## 2. Decisions

Weights default (25 / 25 / 20 / 15 / 10 / 5) unless stated. Most of this family is "conventional with a mandatory requirement"; per the protocol no alternatives are invented for those (CD-121, CD-123, CD-124, CD-126, CD-127). Alternatives are scored only for CD-120, CD-122 and CD-125.

---

### CD-120. Focus management on view and state change

**1. Task and journey.** In multi-step flows (onboarding, booking, session player, stop sheet, check-in) the view changes without a page load. A keyboard or screen-reader user must land at the start of the new content and hear what it is. After an error submit they must land on the problem. After a dialog closes they must land somewhere sensible.

**2. Requirements.** Same behaviour on every flow; one implementation. Healthcare: the session player is time-sensitive (stop, pause); focus must never be lost to the top of a long page after Pause.

**3. Examples.** [Code] three local implementations. [Observed] GOV.UK error summary takes focus; APG dialog says focus a static title for large content and the least destructive action for irreversible steps. No production product's focus behaviour could be observed from Mobbin frames.

**4. Guidance.** APG modal dialog (above); GOV.UK error summary; WCAG 4.1.3 says status messages that do not move focus need a live region, and that a context change such as a dialog is already announced.

**5. Alternatives.** A: programmatic focus to the new view's heading on view change, to the error summary on a failed submit, to the opener on dialog close; heading is a static `tabIndex=-1` element. B: no managed focus; rely on the browser. C: announce the change with a live region only and leave focus where it was.

**6. Gates.** Accessibility: A pass; B **fail** (keyboard users left on a removed control, 2.4.3 [Not retrieved] and the APG rules); C conditional (focus can sit on an element that no longer exists). Safety: A pass.

**7. Evaluation.** A 5,5,4,4,4,4 = **4.50** ((125 + 125 + 80 + 60 + 40 + 20) / 100). C 3,3,3,3,4,5 = **3.20**. B is excluded at the gate.

**8. Selected: A.** Rejected B at the gate, C because it leaves focus on a stale element. Departure from today: promote `ViewHeading` into `ui` as `Heading` with a `focusOnMount` option and remove the two local copies. Do not move focus on the first render of a page (the session player already does this right).

**9. Spec: `Heading focusOnMount`, `ErrorSummary`, dialog return focus.**
- Anatomy: a heading element with `tabIndex={-1}`; focus ring suppressed on programmatic focus only if the heading is not interactive; the visible ring is kept for keyboard users arriving by Tab to other controls.
- Behaviour: on a step change, focus the new heading. On a failed submit, focus the error summary (CD-108). On dialog open, focus per the APG rule: static title for long content, least destructive action for irreversible steps (cancel visit, publish, stop). On close, return focus to the opener; if the opener is gone (a row removed), focus the next row or the list heading.
- Announcements: the heading text is read on focus; the step counter ("Step 4 of 11") is inside or immediately after the heading.
- Responsive: same on every size; a bottom sheet and a right drawer are the same dialog.
- States: loading (focus stays on the heading, busy text in a status region), error (summary), success (heading of the next view or a status line, per CD-126).
- Tests: Tab order after each step change; focus after submit with errors; focus after Escape from each dialog; no focus loss when a list row is removed.

---

### CD-121. Target size

Conventional; house rule over the WCAG minimum. **Selected:** patient theme 48 px for every pointer target (WCAG 2.5.8 asks 24 px; the house floor is already higher); clinician theme 32 px minimum, 24 px only with the spacing exception and never for a destructive control. Whole-row hit areas for checkbox, radio, switch and list rows (already built). **Specific fixes:** toast dismiss and `EvidenceRef` numbers sit at 24 px in the clinician theme: allowed by 2.5.8 only if no other target is within the 24 px circle; give them at least 32 px when they sit next to another control. Pain scale items stay 48 px, which is why the scale takes two rows at phone width (CD-100). **Gate:** accessibility pass. **Rejected:** a single 24 px floor everywhere (meets the criterion, but weak for shaky hands, and the patient audience includes older adults and people in pain). **Tests:** automated bounding-box check at 320, 375, 390 and 768 on every interactive control with an allow-list for inline links and user-agent controls.

---

### CD-122. Reordering and other drag interactions: non-drag alternative

**1. Task.** A clinician puts exercises in order in a plan. Today: Move up and Move down buttons.

**2. Requirements.** No drag handler exists; keep it that way unless the alternative is built in. Reordering changes a clinical plan, so the result must be announced and undoable.

**3. Examples.** [Observed] WCAG 2.5.7 lists sortable lists (select then up/down controls) and task boards (a menu to move items) as acceptable alternatives. [Prior, feature K] plan-builder research. No product frame retrieved for reordering.

**4. Guidance.** WCAG 2.5.7: a keyboard path does not by itself satisfy the criterion; there must be a single-pointer path without dragging.

**5. Alternatives.** A: Move up and Move down buttons per row (current). B: drag handle with a button fallback. C: "Move to position" menu or number field per row.

**6. Gates.** A pass; B pass only with the fallback; C pass.

**7. Evaluation.** A 4,5,4,4,3,5 = **4.20**. B 3,3,3,4,5,2 = **3.30**. C 4,5,4,4,2,3 = **4.00**. A: (100 + 125 + 80 + 60 + 30 + 25) / 100 = 4.20.

**8. Selected: A, with a "Move to position" menu added later only if plans routinely exceed about ten items [Assumption].** Rejected B for cost and a second implementation to keep in sync. **Spec:** buttons are real buttons with names "Move [exercise] up" and "Move [exercise] down"; first row's up and last row's down are `aria-disabled` with a visible reason hidden is not needed because the position is implied; after a move, focus stays on the same button if it is still enabled, otherwise on the other direction's button, and a polite status says "Moved to position 3 of 8". Row buttons are at least 32 px in the clinician theme. **Rule for the whole product:** any future drag interaction (a body figure, a calendar block) ships with a single-pointer non-drag path or is not built.

---

### CD-123. Zoom, reflow and large text

Conventional; WCAG 1.4.10 gives the rule. **Selected:** every patient screen works at 320 CSS px wide with no two-way scroll; the clinician screens do too except data tables and the plan-builder canvas, which may scroll in two directions inside their own region only (the exception covers the excepted section, not the headings and paging around it). Text uses relative units; layout wraps rather than clips at large text sizes. **Specific:** `PainScale` keeps at least 48 px per item (three rows at 320 wide if needed, [Assumption] needs a render check); the three-part date of birth wraps rather than scrolls; sticky bars shrink to one row at large text or become non-sticky (CD-125). **Rejected:** fixed-width mobile mock layouts. **Tests:** render each patient route at 320 and at 400 percent zoom of 1280; text-size 200 percent; no horizontal scroll outside an allowed region; no overlap of the sticky bar with the primary button.

---

### CD-124. Reduced motion

Conventional; the build already honours it. **Selected:** keep the global `prefers-reduced-motion: reduce` rule and zero motion tokens; add a rule that nothing important is conveyed by motion alone. **Specific finding:** the spinner stops under reduced motion, so every loading state must also say it in words ("Sending", "Loading times"), which the check-in button already does; audit the others. Timer and progress changes are text, not animation. No parallax, auto-advancing carousels, or animated charts are used in the product. **Gate:** accessibility pass (2.3.3 is AAA; the technique is sufficient). **Rejected:** a separate in-app motion toggle (the OS setting is the control; a second one adds a place to get it wrong). **Tests:** run each flow with the media feature on; loading, success and error states still read correctly.

---

### CD-125. Sticky elements and focus not obscured

**1. Task.** A keyboard user tabs through a long form or list while a sticky bar (patient bottom tab bar, plan-builder header, record header) sits over part of the page.

**2. Requirements.** No focused control may be entirely hidden (WCAG 2.4.11). Sticky bars must not take more than a small share of a 320 CSS px by 568 viewport [Assumption: no number in the source].

**3. Examples.** [Observed] WCAG 2.4.11 names the sticky footer as failure F110 and gives `scroll-padding` as the fix. [Observed] Future Pro, Headway and Flo use bottom action bars; behaviour not observable. [Code] CarePath already sets `scroll-padding-top:7rem` (clinician) and `scroll-padding-bottom:6rem` (patient app).

**4. Guidance.** WCAG 2.4.11 and technique C43.

**5. Alternatives.** A: keep sticky bars and set `scroll-padding` to at least the bar's height, per layout, driven from one token. B: no sticky bars; actions at the end of the content. C: bars that hide on scroll down and show on scroll up.

**6. Gates.** A pass if the padding is at least the real bar height at every size and zoom; B pass; C conditional (a bar that hides and shows is itself a change of layout that can cover focus when it reappears [Assumption]).

**7. Evaluation.** A 4,5,4,4,4,5 = **4.30**. B 3,4,4,3,2,5 = **3.45**. C 3,3,3,4,4,3 = **3.25**. A: (100 + 125 + 80 + 60 + 40 + 25) / 100 = 4.30.

**8. Selected: A.** Rejected B (the primary action goes out of reach on long forms, and the matrix keeps the builder publish and tab bar as sticky), C. **Spec:** a `--cp-sticky-top` and `--cp-sticky-bottom` token set per layout; `scroll-padding-*` reads from it, replacing the two inline style tags; onboarding gets the same bottom padding if a sticky Next bar is added there; at large text or zoom above 200 percent, sticky headers become static; the patient tab bar is hidden at `md` and up. **Tests:** Tab through each long page at 320 wide, at 400 percent zoom, and with the on-screen keyboard open; the focused control is never fully behind a bar; open dialogs hide sticky bars from the accessibility tree (inert).

---

### CD-126. Timers, live regions and status messages

Conventional; WCAG 2.2.1 and 4.1.3 give the rules. **Selected:** (1) The session hold and rest timers are informational, not limits that cut the patient off, so 2.2.1 does not require an extend control; keep `role="timer"` with `aria-live="off"` and announce only milestones (start, halfway if useful, ten seconds left, done) through the existing polite status region; never announce per second. (2) One polite `role="status"` region per screen for saved, sent and loaded messages; `role="alert"` only for errors that do not move focus (inline errors) and never for success. (3) No auto-dismiss of any message the patient needs to act on or that reports a failed clinical save (toast auto-dismiss is family 10's decision; this file's rule is that important errors persist). **Specific:** the rest timer's end must not trigger an automatic move to the next exercise without a visible Continue the patient controls [Assumption: check against `session-player.tsx` behaviour]. **Rejected:** per-second live announcements; assertive success announcements. **Tests:** screen-reader pass of a full session; timer milestone text; no focus movement on status updates.

---

### CD-127. Skip links, landmarks, clickable rows and truncated text

Conventional; WCAG 2.4.1 for skip links. **Selected:** one `SkipLink` in `components/`, on every shell including `/login` and `/onboarding`; each page has one `main` with the focus target, a labelled `nav`, and one `h1`. Clickable table rows: the whole-row `onClick` stays as a convenience for pointer users only if the first cell holds a real link or button that does the same thing (the current state); the row must not be the only target, and its hover style must not suggest a keyboard-focusable row. Truncated text: never `title` alone; the full text is available by an accessible route (expand control, detail pane, or `aria-label` on a focusable element) because `title` is not reliably available to touch or keyboard users [Assumption: no source retrieved]. **Rejected:** `role="button"` on `tr` (breaks table semantics). **Tests:** first Tab on every route lands on Skip to main content; Enter on a row's first-cell link opens the same record the row click does.

## 3. Cross-family dependencies

CD-108 (error summary), CD-100 (target size and two-row scale), CD-102 (date reflow), CD-140 (consent buttons use the same dialog and focus rules). Dialog and drawer rules belong to family 8 (high-impact actions) and 10 (error recovery); this file states only the focus rules they must meet.

## 4. Inaccessible references and unretrieved sources (for the caller)

Failed or limited: GOV.UK "Ask users for dates" pattern page (fetch failed); NN/g slider article (fetch failed); HHS HIPAA authorizations page (fetch failed); eCFR 45 CFR 164.508 (robots disallowed); Apple HIG toggles and Material 3 switch guidelines (JavaScript-only pages, only a one-line description came back, so neither is cited for guidance); WCAG 2.4.3, 2.4.13, 1.4.12, 2.1.1 pages (not attempted).

Inaccessible as design references (they fail or risk failing WCAG): Bevel effort dial, Noom mood slider and How We Feel body figure with a draggable dot are drag-based in the frames seen, so each fails 2.5.7 unless a tap or text alternative exists that the frames do not show; Cal AI and CapCut scroll-wheel date pickers (custom wheels; no keyboard or screen-reader behaviour observable); Flo and On selection cards that show selection by border colour alone (fail not-by-colour-alone if no indicator exists); Crumbl's eleven-square row (targets too small at phone width). None should be copied.
