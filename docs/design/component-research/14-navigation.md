# 14. Navigation and shell

Status: provisional until advisor sign-off. Protocol: `docs/design/component-research/PROTOCOL.md`; brief: `docs/COMPONENT-BRIEF.md` section 6. Access date for every external source: 2026-11-20. Colours are not chosen here: only semantic token roles (`primary`, `ink`, `ink-muted`, `surface`, `border`, `focus-ring`) are named. Decision records: CD-500 to CD-508 in `docs/design/component-decisions/`. Builds on `feature-research/H-clinician-workspace.md` (split-view overview), `J-patient-record.md` (persistent summary, section workspace), `B-patient-home.md` (patient home) and `G-messaging.md`.

Evidence labels: **[Observed]** retrieved and read or looked at this session; **[Prior]** taken from a feature-research file or the usage matrix; **[Judgement]**; **[Assumption]** untested. Scores are heuristic. No user testing has been run.

## 0. Source register

Mobbin results were preview frames only, from `search_screens` (standard mode). Links are Mobbin screen pages.

| Ref | Product, platform, screen | URL | Observation |
|---|---|---|---|
| M1 | WHOOP, iOS, Health tab | https://mobbin.com/screens/e29cd085-6551-455c-a2c6-fc47157bebcd | [Observed] Bottom bar with four labelled items (Home, Health, Community, More); the last is an overflow. The screen carries a visible statement that the features are not medical devices. |
| M2 | Google Health (Fitbit), iOS, Health tab | https://mobbin.com/screens/b0d185b7-326d-4e0b-b2de-551b78ad76af | [Observed] Four labelled tabs (Today, Fitness, Sleep, Health), icon above word, selected tab marked by weight and icon fill. |
| M3 | Ro, iOS, content feed | https://mobbin.com/screens/2d8fc3d8-f848-493c-8850-aaf743067355 | [Observed] Five labelled tabs (Home, Goals, Support, Shop, Profile) in a floating bar over scrolling content. |
| M4 | Ladder, iOS, add-menu open | https://mobbin.com/screens/17448409-4b64-4816-8a9a-198a6ef26425 | [Observed] Four-tab bar (Workout, Chat, Teams, Nutrition) with a small dot on Chat (no number) and a separate action menu opened from a circle button. Tabs and actions are separate controls. |
| M5 | Stripe, web, Customers list | https://mobbin.com/screens/c29c4c01-c175-4e9c-9511-0dcf4cddcf2d | [Observed] Left sidebar with labelled top-level items and expandable groups, a search field in the top bar, saved-view chips above the table. |
| M6 | Remote, web, dashboard | https://mobbin.com/screens/5378bb91-46ae-4aeb-ad4f-843e418be8d0 | [Observed] Left sidebar with a "Global search" field showing a keyboard shortcut hint; a "You're all caught up" empty state in a to-do panel. |
| M7 | Revolut, web, Cards | https://mobbin.com/screens/a0d5a427-c7f7-4503-892e-08b77681cba8 | [Observed] Narrow icon-plus-label rail with four items at the left edge; content gets almost the whole width. |
| M8 | Plane, web, customer record | https://mobbin.com/screens/2baeae80-10a5-43cc-b18a-4db4fee5b1ff | [Observed] Breadcrumb "Customers > Mobbin" above a record page with a properties panel on the right and a small tab row for sub-lists. |
| M9 | Productboard, web, record | https://mobbin.com/screens/ee60eb54-9fdb-459a-85ca-21e5ef6e983a | [Observed] Record title in a header that stays visible, two tabs (Details, Feedback), collapsible field sections below. |
| M10 | Unify, web, person panel | https://mobbin.com/screens/07c69563-5d44-417c-be54-584329f7b7e8 | [Observed] Record panel with identity at the top (name, company, contact) and a tab row (Overview, Engagement, Activity, Linked records, Notes) under it; the identity stays while tabs change. |
| M11 | Fresha, web, sale panel | https://mobbin.com/screens/03898f05-9df2-4b49-afd9-6d9cb2ea6b94 | [Observed] Side panel over a list with vertical section labels (Summary, Notes, Activity) and an X to close. |
| G | NHS App-style health apps and EHRs | not on Mobbin | Not accessed: Epic, MyChart, SimplePractice, Jane App, Cliniko, Hinge Health, Sword Health, Physitrack screens were not found or searched on Mobbin in this session; nothing is claimed about them. |
| D1 | NHS Design System, back link | https://service-manual.nhs.uk/design-system/components/back-link | [Observed, page text] Back link for transactional services and multi-page forms; not for content pages; not alongside breadcrumbs; top left, before main content; should return the user to the page as they left it; wording must say what it does. |
| D2 | GOV.UK Design System, back link | https://design-system.service.gov.uk/components/back-link/ | [Observed] Same rules; explains that browser back can break and some people do not know it exists, so a visible link is safer; it must return the earlier page in its last state. |
| D3 | GOV.UK, service navigation | https://design-system.service.gov.uk/components/service-navigation/ | [Observed] Current link carries `aria-current`; on small screens a menu button collapses the list; the page gives no maximum number of links. |
| D4 | GOV.UK, tabs | https://design-system.service.gov.uk/components/tabs/ | [Observed] Use when content falls into labelled sections and the first matters most; do not use for page navigation, for content users must read in order or compare across tabs. Tab change updates the URL so browser back returns to the previous tab. On small screens it shows all sections in order with a contents list. Suits frequent users such as caseworkers. |
| D5 | Apple HIG, tab bars | https://developer.apple.com/design/human-interface-guidelines/tab-bars (read via the `.md` version) | [Observed] Tab bars navigate, they do not act; keep them visible; avoid overflow tabs; do not disable or hide tabs, explain an empty section instead; labels are single words where possible; reserve badges for critical information; consider a sidebar for complex structures. |
| D6 | NN/g, hamburger menus | https://www.nngroup.com/articles/hamburger-menus/ | [Observed] In a 179-participant study hidden navigation cut discoverability by almost half and slowed tasks; the penalty was larger on desktop; on mobile, show links directly when there are four or fewer. |
| D7 | W3C APG, tabs | https://www.w3.org/WAI/ARIA/apg/patterns/tabs/ | [Observed] Tab moves into the list on the active tab; arrow keys move between tabs; Home and End optional; automatic activation when panels are ready without delay, manual when loading is slow. |
| D10 | Apple HIG, sheets | https://developer.apple.com/design/human-interface-guidelines/sheets (read via the `.md` version) | [Observed] Sheet for a scoped task tied to the current context; Cancel dismisses without saving, Done completes, Back moves between steps or to a parent and is not for dismissal; one sheet at a time; swipe-to-dismiss with unsaved changes should ask first; alternatives for long flows. Used in `16-overlays.md`. |
| D8 | WCAG 2.2, Understanding 3.2.6 Consistent Help | https://www.w3.org/WAI/WCAG22/Understanding/consistent-help.html | [Observed] Where help or contact appears on several pages, it must sit at the same point in the content order. |
| D9 | WCAG 2.2 SC 2.4.1, 2.4.11, 2.5.8, 3.2.3 | https://www.w3.org/TR/WCAG22/ | [Prior, not re-fetched this session] Bypass blocks, focus not obscured, target size minimum 24 px, consistent navigation. Cited as already used in `G-messaging.md`. |
| Not retrieved | Material 3 navigation bar, rail and drawer pages; Apple HIG sidebars; Carbon UI shell; Atlassian navigation; CMS Design System; Fluent; Spectrum; GOV.UK "Help users to navigate a service" | `m3.material.io` pages returned only a JavaScript notice; the GOV.UK pattern page failed to load; the rest were not attempted | No claim in this document rests on them. |

Shared synthesis of what was observed: patient health apps use three to five labelled tabs along the bottom (M1 to M4, D5); work products with many destinations use a left sidebar and keep identity at the top of a record while sub-sections change (M5, M8, M9, M10); breadcrumbs appear in record views with deep hierarchies (M8) but NHS and GOV.UK advise against combining them with back links (D1, D2); a global search with a shortcut appears in products with dozens of destinations (M5, M6).

## 1. Current state (from code and the usage matrix)

- Patient: four destinations (Today, Progress, Appointments, Messages) as hand-built bottom nav below md and a row in the header from md; unread count is a filled badge; `ui BottomTabBar` and `CountBadge` exist but are unused in routes [Prior: matrix A1, A3]. Session pages use a focus variant with a back link "Today" and no tabs. Onboarding has its own header and no skip link.
- Clinician: `SideNav` of five items (Overview, Patients, Schedule, Messages, Review queue); on narrow screens the whole rail stacks above the page content; only Messages has a count; Avatar, name, role and sign out sit in the rail footer.
- Admin: the same shell with a single item (Patients).
- Record: sticky header (all-patients link, name, MRN, birth date, status, time zone, care team, builder button) and six URL-driven tabs. Tab selection calls `router.replace`, so the browser back button leaves the record instead of returning to the previous tab (read in `record.tsx`).
- Builder: hand-built crumb row "All patients / {name}" above a title; its own Build, Patient preview, Versions tabs.
- Two copies of `SkipLink`. No skip link on `/login` or `/onboarding`.

## 2. Destinations by role

Frequency, depth and device are the drivers (brief section 6).

| Role | Destinations | Switching frequency | Depth | Main device | Resulting pattern |
|---|---|---|---|---|---|
| Patient | Today, Progress, Appointments, Messages (checkpoint C2 section 5). Plan and Sharing and consent are reached from Today and the footer. | Several times a day, often one-handed | Two levels (destination, then detail or flow) | Phone | Always-visible labelled bar (CD-500) |
| Clinician | Overview, Patients, Review queue, Schedule, Messages | Many times a day, between very different tasks | Three levels (list, record, builder) | Desktop, sometimes tablet | Persistent labelled sidebar (CD-501) |
| Admin | Patients (one today) | Rare | Two levels | Desktop | No navigation element until there are two destinations (CD-502) |

Flag for the advisor: Plan is a core object for patients but has no tab. C2 fixed four destinations and Today links to the plan, so this document keeps it. Revisit if a scenario test shows patients cannot find the plan.

---

## 3. Decision: patient primary navigation (CD-500)

1. **Task and journey.** A patient with a plan moves between "what do I do today", "how am I doing", "my visits" and "my messages", usually with one thumb, sometimes while in pain or worried. Needs: where am I, where else can I go, is there something new in Messages. Action: one tap to any destination.
2. **Business and healthcare.** Daily return and message use without pressure tactics; the brief forbids hiding frequently used patient tasks in a hamburger. The "Contact care team" button must sit in the same place on every screen (WCAG 3.2.6, D8). Session mode hides navigation on purpose to keep one task on screen.
3. **Production examples.** M1 to M4 (four to five labelled tabs; M1's overflow "More" is the weakness D5 warns about), M3 (floating bar). All [Observed] on iOS previews only; no desktop patient-portal references were found.
4. **Guidance.** D5: navigation not actions, keep visible, avoid overflow, do not hide tabs, single-word labels, badges only for critical information. D6: show four or fewer links directly on mobile; hidden navigation hurts discoverability. D3: mark the current item with `aria-current`.
5. **Alternatives.** A bottom tab bar on phones and the same four items as a row under the header from md (current behaviour, built from `ui BottomTabBar` and one shared `HeaderTabs` list); B hamburger or drawer; C left sidebar at every width; D bottom bar at every width including desktop.
6. **Gates.** Accessibility: A pass, B pass in markup but fails the brief's rule on hidden frequent tasks (ineligible), C pass, D pass. Privacy: all pass (nav shows counts only, never message text). Safety: A pass (Contact care team stays in the header), B conditional, C and D pass. B is **ineligible**.
7. **Evaluation.**

| Alternative | Task (25) | Access (25) | Error prev (20) | Business (15) | Efficiency (10) | Cost (5) | Weighted /5 |
|---|---|---|---|---|---|---|---|
| A Bottom tab bar on phones, header tab row from md (selected) | 5 | 5 | 4 | 4 | 5 | 4 | 4.60 |
| B Hamburger or drawer menu | 3 | 2 | 3 | 2 | 2 | 4 | 2.55 |
| C Left sidebar at every width | 3 | 3 | 3 | 3 | 3 | 3 | 3.00 |
| D Bottom bar at every width | 4 | 4 | 4 | 3 | 4 | 5 | 3.90 |

Arithmetic: A = (25x5 + 25x5 + 20x4 + 15x4 + 10x5 + 5x4) / 100 = 4.60; B = (25x3 + 25x2 + 20x3 + 15x2 + 10x2 + 5x4) / 100 = 2.55; C = (25x3 + 25x3 + 20x3 + 15x3 + 10x3 + 5x3) / 100 = 3.00; D = (25x4 + 25x4 + 20x4 + 15x3 + 10x4 + 5x5) / 100 = 3.90. Weights as in the brief (heuristic scores, not measurements; 1 weak to 5 strong).

8. **Selected: A.** Four always-visible labelled destinations; bottom bar below md (touch, thumb reach), header row from md (a bottom bar on a wide desktop screen puts navigation far from the pointer and away from the header's Contact button). Rejected: B (hides daily tasks, fails brief), C (an enterprise sidebar for four items, rejected by the brief), D (keeps the bar far from the header controls at md and up; runner-up, lowest cost).
9. **Spec.**
   - Component: `PrimaryNav` made of `ui BottomTabBar` (phone) and a header tab row (md and up) fed from one destination list. The hand-built `BottomNav`, `HeaderNav` and `UnreadCount` are removed (usage matrix A3).
   - Anatomy: `nav aria-label="Patient"`, `ul` of links; each link icon (22 px), one-word label, optional `CountBadge`. Current item: `aria-current="page"`, weight change and a 2 px bar (not colour alone). Only one of the two navs is rendered visible at a time (`display: none` for the other) so there is a single landmark.
   - Sizes: bar min height 64 px (docs and class agree; fix the 56 px comment in `nav.tsx`); each item at least 48 px wide and tall in the patient theme; items share width equally via the grid (not `flex-wrap`), so a fifth item or a long label cannot wrap the bar onto two rows.
   - Labels: Today, Progress, Appointments, Messages. "Appointments" at 15 px is the longest word; at 320 px and at 200 percent text it may truncate: allow label to wrap to two lines rather than clip, test at 320.
   - Badge: Messages only, via `CountBadge` with `unit="unread"` (CD-508). Count capped display "9+" is not used; show the true number up to 99, then "99+" with the full value in the accessible name.
   - Keyboard: links are Tab stops in order; no roving tabindex (it is a list of links, not a tablist). Skip link first (CD-507).
   - Screen reader: "Patient navigation", each link name "Messages, 2 unread"; current item "Today, current page".
   - Responsive: below md bar fixed to bottom, content gets bottom padding equal to the bar height plus the safe area; with the on-screen keyboard open the bar is not shown above the keyboard (do not use `position: fixed` that rides above it; sticky inside the page flow is acceptable), so the composer is never covered (WCAG 2.4.11 Focus Not Obscured, D9 [Prior]).
   - States: default, hover, focus-visible (2 px ring), pressed, current, disabled never used (D5), loading (count absent until known, never a spinner), network unavailable (bar still works; pages show their own offline message).
   - Data: unread total from the conversation poll; initial value from the page load. Permissions: patient role only; focus variant (guided session, onboarding) hides the bar and shows a back link.
   - Testing: Playwright at 375, 390, 768, 1024; axe; tab order; 200 percent zoom; `aria-current` on nested routes (`/messages/[id]` keeps Messages current).

---

## 4. Decision: clinician primary navigation (CD-501)

1. **Task.** A therapist jumps between "what needs me" (Overview), "find a patient" (Patients), "clear flagged items" (Review queue), "run my day" (Schedule) and "reply" (Messages). Needs: where am I, what is waiting in Messages and Review queue, and nothing in the way on a dense screen.
2. **Business and healthcare.** Fewer page changes per item (H); no hiding of safety-relevant work (Review queue). Counts must equal what the destination lists (REQ-OVR-01 spirit, [Prior: H]), so a badge is shown only where the API returns a true total.
3. **Examples.** M5 (sidebar with search), M6 (sidebar), M7 (narrow rail), all [Observed], none healthcare; M9 and M8 for the record. Not accessed: healthcare EHR navigation (G row).
4. **Guidance.** D5: consider a sidebar for a more complex structure; D6: desktop should not hide navigation; D3: `aria-current`, collapse on small screens behind a menu button. Carbon, Material, Atlassian not retrieved.
5. **Alternatives.** A persistent left sidebar from md (current, with order and badge rules fixed) and a labelled bottom bar below md; B the current behaviour where the rail stacks above the content below md; C a collapsible icon rail; D a top horizontal nav.
6. **Gates.** All pass accessibility if labels stay visible. C conditional: an icon-only collapsed state fails "do not rely on icons" unless labels remain (tooltips are not allowed to be the only label, matrix D). B passes but pushes content below the fold for several hundred pixels on a phone [Judgement from code: the whole rail, footer and sign out stack before `main`].
7. **Evaluation.**

| Alternative | Task (25) | Access (25) | Error prev (20) | Business (15) | Efficiency (10) | Cost (5) | Weighted /5 |
|---|---|---|---|---|---|---|---|
| A Persistent left sidebar from md, labelled bottom bar below md (selected) | 5 | 4 | 4 | 4 | 5 | 3 | 4.30 |
| B Left rail from md, stacked block above content below md (current) | 4 | 3 | 3 | 3 | 4 | 5 | 3.45 |
| C Collapsible icon rail | 4 | 3 | 3 | 3 | 4 | 2 | 3.30 |
| D Top horizontal nav | 4 | 4 | 3 | 3 | 4 | 3 | 3.60 |

Arithmetic: A = (25x5 + 25x4 + 20x4 + 15x4 + 10x5 + 5x3) / 100 = 4.30; B = (25x4 + 25x3 + 20x3 + 15x3 + 10x4 + 5x5) / 100 = 3.45; C = (25x4 + 25x3 + 20x3 + 15x3 + 10x4 + 5x2) / 100 = 3.30; D = (25x4 + 25x4 + 20x3 + 15x3 + 10x4 + 5x3) / 100 = 3.60. Weights as in the brief (heuristic scores, not measurements; 1 weak to 5 strong).

8. **Selected: A.** Five destinations fit a labelled bottom bar at 375 px (about 75 px each) and a 240 px sidebar on desktop; both are always visible, neither hides work. Rejected: B (content starts far down on phones; lowest cost), C (collapse adds a hidden state for five items and an icon-only mode; revisit above eight destinations), D (runner-up by score: a top bar loses room for the sticky record header and for badges, and its labels overflow sooner as destinations grow).
9. **Spec.**
   - Order: Overview, Patients, Review queue, Schedule, Messages. Rationale: begin with the day, then who, then flagged work, then time, then replies. This changes the current order (Schedule and Messages before Review queue). [Judgement, untested]; validation in the record.
   - Labels: Overview, Patients, Review queue, Schedule, Messages. The route `/inbox` stays; the label stays "Messages" (patient label is the same).
   - Component: `SideNav` from md (240 px, `nav aria-label="Clinician"`); below md `BottomTabBar` with the same items. Footer block (identity, role, sign out) stays in the sidebar; below md it moves to a top bar with the brand, organisation, and a Sign out text button (no avatar-only control). One `CountBadge` (CD-508).
   - Badges: Messages shows unread; Review queue shows open tasks only after the API returns a total (data dependency: a count on `GET /review-tasks`, not the length of a loaded page). Until then no badge: a wrong number is worse than none.
   - Keyboard: sidebar links are Tab stops; no collapse. Bottom bar as CD-500. `Alt+` or single-key global shortcuts are not added (they collide with screen-reader keys); the only shortcut is `/` to focus the directory search (existing, CD-506).
   - Screen reader: "Clinician navigation"; "Review queue, 4 open"; current page announced.
   - Responsive: sidebar width fixed at 240; at 1024 and 1280 the content area shrinks, not the sidebar; below md bottom bar plus top bar. Zoomed to 400 percent the layout behaves as a phone.
   - States: current, hover, focus, count loading (no badge), stale count (badge keeps last value, no timestamp in nav; the page shows "Updated 9:12 AM"), permission restricted (items the role cannot open are not shown; coordinators see no clinical-only destinations if the API hides them).
   - Testing: Playwright for each role's item set; badge equals API total; tab order; bottom bar at 320 with 200 percent text.

---

## 5. Decision: admin shell (CD-502)

1. **Task.** Assign therapists and see patients awaiting assignment; one destination today.
2. **Constraints.** The brief: do not use an oversized sidebar for few destinations. Analytics (feature N) may add destinations later.
3. **Examples.** None specific; M7 shows a narrow rail for a small product [Observed], which still shows four items. No example with one item was looked for or found.
4. **Guidance.** D3 gives no limit; D5 says tab bars are for navigation among sections: one section needs none.
5. **Alternatives.** A no navigation element, a header with brand, organisation, identity and sign out; B the one-item sidebar (current); C a menu button.
6. **Gates.** All pass; C is a pointless extra control.
7. **Evaluation.**

| Alternative | Task (25) | Access (25) | Error prev (20) | Business (15) | Efficiency (10) | Cost (5) | Weighted /5 |
|---|---|---|---|---|---|---|---|
| A No navigation element while there is one destination (selected) | 5 | 5 | 4 | 4 | 5 | 5 | 4.65 |
| B One-item sidebar (current) | 3 | 4 | 4 | 2 | 3 | 5 | 3.40 |
| C Menu button hiding one item | 2 | 2 | 3 | 1 | 2 | 4 | 2.15 |

Arithmetic: A = (25x5 + 25x5 + 20x4 + 15x4 + 10x5 + 5x5) / 100 = 4.65; B = (25x3 + 25x4 + 20x4 + 15x2 + 10x3 + 5x5) / 100 = 3.40; C = (25x2 + 25x2 + 20x3 + 15x1 + 10x2 + 5x4) / 100 = 2.15. Weights as in the brief (heuristic scores, not measurements; 1 weak to 5 strong).

8. **Selected: A.** Show the page title and a header; add `SideNav` when a second destination ships (rule: two or more destinations). Rejected: B (240 px of chrome for one link) and C.
9. **Spec.** Header `banner` with brand, organisation name, user name and role as text, Sign out button; no `nav` landmark while one destination exists (skip link goes to `main`). The page `h1` "Patients" is the only orientation needed. When a second destination arrives, reuse `SideNav` and `BottomTabBar` with the admin item list. Testing: landmark list has no empty navigation; sign out reachable by keyboard at 320.

---

## 6. Decision: patient identity and context inside clinician records (CD-503)

1. **Task and journey.** A therapist opens a record from a visit row, a check-in link or a review task, reads, moves between sections, sometimes leaves for the care plan builder or a message thread and returns. Need: always know which patient this is; know what is not recorded and how fresh the data is (J). Wrong-patient action is the main risk.
2. **Business and healthcare.** Fewer wrong-patient and stale-data errors; fast switching between patients many times a day [Prior: J]. Identity must use at least two identifiers (name plus MRN or birth date), which the header already carries.
3. **Examples.** M10 (identity above a tab row; tabs change, identity does not), M9 (record title stays while tabs change), M8 (breadcrumb and properties panel), M11 (side panel over list). All [Observed] non-healthcare. Not accessed: Epic, Cerner, athenahealth, SimplePractice patient banners (G row). D4 (tabs suit frequent users such as caseworkers) [Observed].
4. **Guidance.** D4 tabs and the URL rule; D1 and D2 on back links (not with breadcrumbs). J's selected pattern: persistent summary with contextual workspace.
5. **Alternatives.** A sticky identity strip plus section tabs; B a persistent summary column from xl (identity, care team, current state, "Not recorded" block, one "record as of" stamp) with a sticky compact strip below xl, plus section tabs; C breadcrumbs plus vertical section list; D one long page with anchor links.
6. **Gates.** Safety: A pass; B pass; C conditional (breadcrumb text can scroll away); D fails (identity can scroll out of view unless sticky, then it is A). Accessibility: all pass with correct markup. D is **conditionally ineligible**: it needs the sticky strip, so it collapses into A.
7. **Evaluation.**

| Alternative | Task (25) | Access (25) | Error prev (20) | Business (15) | Efficiency (10) | Cost (5) | Weighted /5 |
|---|---|---|---|---|---|---|---|
| A Sticky identity strip plus section tabs (current plus strip) | 4 | 4 | 4 | 4 | 4 | 4 | 4.00 |
| B Persistent summary column from xl, sticky strip below, plus section tabs (selected) | 5 | 4 | 5 | 4 | 4 | 3 | 4.40 |
| C Breadcrumbs plus vertical section list | 3 | 4 | 3 | 3 | 3 | 3 | 3.25 |
| D One long page with anchor links | 3 | 3 | 3 | 3 | 3 | 3 | 3.00 |

Arithmetic: A = (25x4 + 25x4 + 20x4 + 15x4 + 10x4 + 5x4) / 100 = 4.00; B = (25x5 + 25x4 + 20x5 + 15x4 + 10x4 + 5x3) / 100 = 4.40; C = (25x3 + 25x4 + 20x3 + 15x3 + 10x3 + 5x3) / 100 = 3.25; D = (25x3 + 25x3 + 20x3 + 15x3 + 10x3 + 5x3) / 100 = 3.00. Weights as in the brief (heuristic scores, not measurements; 1 weak to 5 strong).

8. **Selected: B**, consistent with J's recommendation, with the navigation-specific parts spelled out here. Rejected: A is the runner-up and is the same markup without the summary column (also the narrow-screen form of B); C duplicates the app sidebar with a second vertical list; D.
9. **Spec: `PatientContextBar` plus `PatientSummary` (healthcare component).**
   - Context bar anatomy (always visible, sticky at the top of the content column, 56 px tall at most at 100 percent text, grows with text size without clipping): back link "All patients", full name (page `h1` in the record), MRN in `Mono`, birth date written out ("Born Mar 4, 1984"), status as `Tag`, care team line (names, roles in words). Actions on the right: one primary "Open care plan builder" (disabled with visible reason when not on the care team, existing behaviour). On phones the strip shows name, MRN and birth date; status, time zone and care team move to a disclosure "Patient details" (an inline expansion, CD-527).
   - The same bar appears on every route that acts on this patient: record sections, care plan builder (replacing the hand-built crumb row), and the staff message thread (name, MRN, "Open the patient record"). Wrong-patient guard also lives in titles: `document.title` is "{Name} | {Section} | CarePath" (the record sets name only today); the `h1` receives focus when the patient changes.
   - Summary column (from xl, about 25 percent): care team, current plan state line, latest check-in line, "Not recorded" block and a single "Record as of 9:12 AM" stamp, per J. Below xl these items form the first block of the Overview section rather than a drawer (a drawer would hide absence and freshness). Specified in `J`; not redefined here.
   - Section nav: `Tabs` (CD-504) labelled "Patient record sections". Sections follow J: Timeline (default, "since last visit"), Plan, Check-ins, Appointments, History. The current "Activity" tab folds into Timeline with filters (J).
   - Cross-links: from a queue task or a check-in the link opens the record on the right section with the item highlighted (existing `?checkIn=`), and the back link is "Review queue" when the visit began there (uses the session history entry, falling back to "All patients"). Never pre-fill or auto-open another patient.
   - Keyboard: back link first in the content order, after the skip link; tabs as D7; `h1` focus on first load and on patient change; no keyboard trap in the sticky bar.
   - Screen reader: landmark `banner` is not used for the strip (one `banner` per page); use a labelled `region` "Patient"; announce the patient name when the record loads ("Patient record for Jane Doe").
   - States: loading (strip skeleton keeps height; actions disabled), header error (name unknown: strip shows "Patient record" and a retry; actions hidden, never a stale name), partial data, long name (wrap, never truncate the surname), permission restricted (administrative slice shows only the identity and administrative sections), stale (the summary stamp).
   - Testing: Playwright switching between two patients with the same surname, asserting title, `h1`, MRN; 400 percent zoom keeps identity visible and not covering focus; keyboard sweep; axe.
   - Prototype spec: `docs/design/design-alternatives/prototypes/record-context-navigation.md`.

---

## 7. Decision: record and builder section tabs (CD-504)

1. **Task.** Move between sections of one patient's record, or between Build, Patient preview and Versions in the builder, without losing place.
2. **Constraints.** Sections load their own data; the record sections are deep-linkable (`?tab=`, `?checkIn=`); builder tabs share unsaved draft state in one component.
3. **Examples.** M9 (two tabs under a persistent header), M10 (tab row under identity), M5 (chips as saved views, a different job). [Observed].
4. **Guidance.** D4: tabs suit frequent users; do not use tabs for page navigation, for content to compare, or for hiding content that may be missed; tab change should add a history entry so back returns to the previous tab. D7: arrow keys, automatic activation if panels load without delay.
5. **Alternatives.** A ARIA tabs with the section in the URL, a history entry per change, panels mounted only when active (current component, history fixed); B link-based section navigation (`nav` with `aria-current`, each section a real link); C accordion sections on one page.
6. **Gates.** All pass. C risks hiding absence and burying later sections on a long page ([Prior: J rejected tiles and long pages]).
7. **Evaluation.**

| Alternative | Task (25) | Access (25) | Error prev (20) | Business (15) | Efficiency (10) | Cost (5) | Weighted /5 |
|---|---|---|---|---|---|---|---|
| A ARIA tabs, URL state, history entries (selected) | 4 | 5 | 4 | 4 | 4 | 5 | 4.30 |
| B Link-based section nav (nav landmark, aria-current) | 4 | 5 | 4 | 4 | 4 | 3 | 4.20 |
| C Accordion sections on one page | 3 | 4 | 3 | 3 | 3 | 3 | 3.25 |

Arithmetic: A = (25x4 + 25x5 + 20x4 + 15x4 + 10x4 + 5x5) / 100 = 4.30; B = (25x4 + 25x5 + 20x4 + 15x4 + 10x4 + 5x3) / 100 = 4.20; C = (25x3 + 25x4 + 20x3 + 15x3 + 10x3 + 5x3) / 100 = 3.25. Weights as in the brief (heuristic scores, not measurements; 1 weak to 5 strong).

8. **Selected: A**, with two corrections: tab change uses `router.push` (today `router.replace`, so the browser back button skips the previous tab, contrary to D4); and automatic activation stays because tab panels fetch in under a second on the demo API [Assumption]; if a section's first paint is slow, switch to manual activation (D7). Rejected: B is the runner-up and becomes right if sections become separate routes with their own layouts; C.
9. **Spec.** `Tabs` (Radix): `TabsList aria-label` names the set; trigger text is the section name only (counts live inside the panel, not on the tab, until the API returns server totals); selected: 2 px bar, semibold; disabled tabs are not used (D5): an unavailable section is shown with an explanation inside the panel. Keyboard: Left and Right, Home, End. Each panel starts with a heading repeating the tab name (D4 advice for screen readers and narrow layouts). Below 640 px the list scrolls horizontally with the selected tab scrolled into view and a visible edge cue; if a set exceeds six tabs, reconsider B. Builder tabs (Build, Patient preview, Versions) do not touch the URL while the draft is unsaved; state stays in memory. Testing: back button returns to the previous tab; deep link opens the right panel with focus on the panel heading; arrow-key test.

---

## 8. Decision: back navigation and breadcrumbs (CD-505)

1. **Task.** Return one level, to where the user came from, in the state they left it (filters, selected row, scroll).
2. **Constraints.** Maximum depth is three (list, record, builder). Patient flows (booking, session, onboarding) are linear.
3. **Examples.** M8 uses a breadcrumb in a deep record [Observed]; D1 and D2 advise a back link and not both.
4. **Guidance.** D1 and D2: top left before main content, clear wording, return the page in its last state, do not combine with breadcrumbs. D10 (Apple sheets): Back moves to a previous step or parent, it does not dismiss.
5. **Alternatives.** A one back link named for its parent; B breadcrumbs; C rely on the browser back button.
6. **Gates.** All pass; C fails the "visible way back" expectation in D2 for keyboard-only and less technical users.
7. **Evaluation.**

| Alternative | Task (25) | Access (25) | Error prev (20) | Business (15) | Efficiency (10) | Cost (5) | Weighted /5 |
|---|---|---|---|---|---|---|---|
| A Back link named for its parent, no breadcrumbs (selected) | 4 | 5 | 4 | 4 | 4 | 5 | 4.30 |
| B Breadcrumb trail | 3 | 4 | 3 | 3 | 3 | 3 | 3.25 |
| C Browser back only | 2 | 3 | 2 | 2 | 3 | 5 | 2.50 |

Arithmetic: A = (25x4 + 25x5 + 20x4 + 15x4 + 10x4 + 5x5) / 100 = 4.30; B = (25x3 + 25x4 + 20x3 + 15x3 + 10x3 + 5x3) / 100 = 3.25; C = (25x2 + 25x3 + 20x2 + 15x2 + 10x3 + 5x5) / 100 = 2.50. Weights as in the brief (heuristic scores, not measurements; 1 weak to 5 strong).

8. **Selected: A.** Remove the hand-built crumb row in the builder; use "Back to Jane Doe's record" there, "All patients" in the record and "Back to Review queue" from a task. In patient flows use "Back to Today" (session) and the step Back button (booking, onboarding). Rejected: B (depth never exceeds three; adds a second way back), C.
9. **Spec.** Component `BackLink` in `ui` (text link, left-chevron icon, 24 px target at least, 48 px in the patient theme). A `chevron-left` icon is added to `icons.tsx` (today a `chevron-right` is rotated). Behaviour: if the previous history entry is the expected parent (same origin and path prefix), call `router.back()` so list filters, sort and selected task are restored from the URL; otherwise navigate to the parent URL. Label is a noun phrase naming the destination, never just "Back" alone on screens with more than one possible parent. Placed before `h1`, after the skip link. Disabled never. Test: filter the directory, open a record, press the link, filters and page are still applied.

---

## 9. Decision: command palette, search-driven navigation and in-page navigation (CD-506, CD-507)

1. **Task.** Reach a particular patient fast; reach a section of a long page; bypass chrome.
2. **Constraints.** Five clinician destinations; the directory already has a labelled search with a `/` shortcut and URL-synced filters. A palette that lists recent patients would put patient names in a transient surface on shared screens (privacy) and invites wrong-patient jumps.
3. **Examples.** M5 and M6 show a global search field with a shortcut hint in products with many destinations [Observed]; none are health products.
4. **Guidance.** NN/g and design-system pages on palettes were not retrieved. D6: do not hide navigation; a palette is an accelerator, not the navigation. [Judgement].
5. **Alternatives.** A Patients page search with `/` and no global palette; B a global patient quick-find field in the staff shell; C a command palette.
6. **Gates.** Privacy: C conditional (recent items, names in an overlay), B conditional (autocomplete of names). Accessibility: combobox patterns (APG) are heavier to get right [Judgement].
7. **Evaluation.**

| Alternative | Task (25) | Access (25) | Error prev (20) | Business (15) | Efficiency (10) | Cost (5) | Weighted /5 |
|---|---|---|---|---|---|---|---|
| A Patients page search with slash shortcut, no global palette (selected) | 4 | 5 | 5 | 4 | 3 | 5 | 4.40 |
| B Global patient quick-find in the shell | 4 | 4 | 3 | 4 | 5 | 3 | 3.85 |
| C Command palette | 3 | 3 | 2 | 3 | 5 | 1 | 2.90 |

Arithmetic: A = (25x4 + 25x5 + 20x5 + 15x4 + 10x3 + 5x5) / 100 = 4.40; B = (25x4 + 25x4 + 20x3 + 15x4 + 10x5 + 5x3) / 100 = 3.85; C = (25x3 + 25x3 + 20x2 + 15x3 + 10x5 + 5x1) / 100 = 2.90. Weights as in the brief (heuristic scores, not measurements; 1 weak to 5 strong).

8. **Selected: A for this release.** Rejected: C (cost, privacy and no evidence of need with five destinations), B (runner-up; revisit if a test shows finding a patient from outside Patients takes more than two steps, or destinations exceed eight). Search-driven navigation is the directory search; its filter-bar rules are CD-532.
9. **Spec.** `/` focuses the directory search only on `/patients` and is ignored inside text fields and open overlays; the hint "Press / to search" becomes helper text, not placeholder (placeholders are not labels). In-page navigation (CD-507): one `SkipLink` component in `components/` used by all shells and by `/login` and `/onboarding`; target `main#main` focus; builder keeps "Skip to plan" for the library aside. No in-page table of contents on any current screen; long patient pages use headings only. Testing: first Tab stop is the skip link on every route, including public pages.

---

## 10. Decision: navigation count badges (CD-508)

1. **Task.** See that something is waiting without opening it.
2. **Constraints.** Two looks exist for the same idea: filled `primary` count in the patient nav, outlined neutral `CountBadge` in the staff rail [Prior: matrix A3]. D5 reserves badges for critical information.
3. **Examples.** M4 uses a dot without a number on a tab [Observed]; Apple HIG says a number or exclamation point [D5].
4. **Alternatives (structurally different).** A one filled count (number) via `CountBadge`; B outlined neutral count (staff) and filled (patient); C a dot with no number.
5. **Selected: A**, one `CountBadge`, filled with the `primary` role, tabular figures, `unit` in the accessible name ("2 unread"). A dot alone fails for screen readers and for counting; neutral outlined counts read as decoration. Used for Messages (both apps) and Review queue only when a true server total exists. Not used on Today, Progress, Appointments (no counts the API can stand behind). Never conveys urgency by colour; urgency is wording on the destination page. Hidden at zero (no "0"). Test: axe name check, 99+ case, large text.
(Scores omitted: conventional element, established pattern reused per protocol item 5.)

---

## 11. Not decided here

- Pagination and table patterns (complex tables family).
- Patient summary content and absence blocks (J, patient identity family).
- Review queue badge count semantics beyond the API rule above.
