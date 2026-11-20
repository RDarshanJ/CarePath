# 03. Treatment planning components

Protocol: `docs/design/component-research/PROTOCOL.md`. Brief: `docs/COMPONENT-BRIEF.md` sections 4, 9, 11, 17, 19 to 23. Builds on `docs/design/feature-research/K-care-plan-builder.md` (selected there: split-pane library and editor with a persistent draft-versus-published header) and does not contradict it. Access date for every external source: 2026-11-20. Colours are not chosen; only semantic token roles are named. Decision records: CD-300 to CD-306. Prototype spec: `docs/design/design-alternatives/prototypes/plan-editing.md`.

Evidence labels: **[Observed]** retrieved and read or looked at this session; **[Prior]** carried from the feature research files, not re-retrieved today; **[Code]** read in the repository today; **[Judgement]** reasoning; **[Assumption]** untested. Scores are heuristic judgements on a 1 to 5 scale. No participant data exists.

Weights unless stated: task effectiveness 25, accessibility and usability 25, error prevention and trust 20, business and operational value 15, interaction efficiency 10, implementation and maintenance cost 5.

## 0. Findings from the code that shape every decision here

1. Five exercise layouts exist: patient `plan/page.tsx`, patient `session/page.tsx`, clinician `plan-view.tsx`, `library.tsx`, `item-editor.tsx` [Code, matrix A3].
2. Three plan-diff copies exist: `DiffList` (patient), `plan-view.tsx:56-72`, `publish-dialog.tsx` [Code]. The two clinician copies print raw field keys such as `holdSeconds`.
3. The API diff (`diffFromPrevious`) lists added, removed and changed **exercises** with field names only. It carries no old or new values, and from the contract it does not cover title, instructions or goals [Code: `contracts/care-plan.ts`; `DiffList` reads only `added`, `removed`, `changed[].fields`]. Any design that shows "from 8 to 10 repetitions" needs either an API change or a client-side compare of two version payloads (both payloads are available through the versions endpoint, so a client compare is possible without an API change [Judgement]).
4. `DiffList` maps one field to "your therapist's note". That wording is written for the patient and reads wrongly in a clinician screen. Audience needs a prop.
5. Versions are immutable and append-only. There is no restore, archive, template or discard-draft endpoint [Prior K section 4; CLAUDE.md]. Nothing in this file proposes a control that needs one.
6. Reorder is by move up and move down `IconButton`s (AC-B8). The library `Add` silently ignores an exercise already in the plan [Prior K section 5].
7. Adding a dependency (for example a drag-and-drop library) needs advisor approval (CLAUDE.md).

## 1. Decision: exercise library item (CD-300)

### 1.1 Task, journey, information, action
Clinician in the plan builder finds an exercise in the library and decides whether to add it (information: name, body area, category, a way to recognise the movement, the suggested dose, full instructions). Patient reads the plan to know what to do today (name, dose in words, therapist note, a picture to recognise the movement) and later runs it in the session player (larger picture, instructions). The same exercise appears in five places, so one summary component with variants is the unit of decision. There is no patient-facing browsable library; the brief's "patient exercise library" comparison is evaluated for the patient plan list.

### 1.2 Requirements and constraints
Business: fewer divergent layouts to maintain; faster recognition of the right exercise. Healthcare: an exercise must be identifiable without relying on the picture alone (name and instructions in text); content notice and "not medically reviewed" wording remain with exercise content (PRD section 16). Library returns name-sorted cursor pages with search, body area and category filters [Code].

### 1.3 Production examples
| Product | Platform | Screen | URL | Observation | Label |
|---|---|---|---|---|---|
| Ladder | iOS | Key movements list | https://mobbin.com/screens/810c58c9-f341-43e9-940f-f7cdeab886e8 | Rows with a small video thumbnail with a play mark and the movement name, divided by rules. No dose shown. | [Observed] |
| ClassPass | iOS | Treadmill class list | https://mobbin.com/screens/62735254-bd6d-4ae0-85e0-d447283a6dc2 | Rows with a larger photo, title, instructor, duration and level labels. Meta is text. | [Observed] |
| WHOOP | iOS | Workout details exercise list | https://mobbin.com/screens/462a8456-5fc1-4e58-95c1-d7b175038677 | Compact rows with thumbnail, exercise name and an info button on the right for detail. Detail is on demand. | [Observed] |
| Nike Training Club | iOS | Strength workout list | https://mobbin.com/screens/f7ff8832-fee3-4b01-bd7e-e371713845de | Count heading ("17 workouts"), thumbnail rows with title and a line of meta, a bookmark control, and a bottom Filter (5) and Sort bar. | [Observed] |
| Calm | Web | Movement | https://mobbin.com/screens/e7f23c18-2d4b-40da-8671-6169f0020762 | Image-led cards in horizontal rows with a duration label; browsing by mood, not selection into a plan. | [Observed] |
| WebPT HEP | Web | Home exercise program builder | https://help.hep.webpt.com/article/232-home-exercise-program-overview | Search on one side and a plan panel on the other; add by click or drag; dose set after adding. Text only. | [Prior] |
| Hinge Health, Sword Health, SPRY, MedBridge | Web, iOS | Exercise library screens | n/a | No library screens were retrievable on Mobbin or public pages today (SPRY help page has no library detail). | Not accessible |

### 1.4 Design-system guidance
Carbon data-table guidance puts extra detail in an expandable area and moves cramped content to a side panel or page (https://carbondesignsystem.com/components/data-table/usage/) [Observed]. Apple HIG tables page could not be retrieved. NN/g, Baymard and Material 3 pages for this topic were not retrieved. Brief section 9 says not to use oversized cards for repeated records that need efficient scanning [brief].

### 1.5 Alternatives
A. Image-led card grid. B. Compact row with small thumbnail, detail on demand (the shared `ExerciseSummary`). C. Grouped list under body-area headings. D. Text-only row (no image).

### 1.6 Gates
| Alt | Accessibility | Privacy | Safety | Result |
|---|---|---|---|---|
| A | Pass if images carry alt text or are marked decorative beside a text name | Pass | Pass | Eligible |
| B | Pass | Pass | Pass | Eligible |
| C | Pass | Pass | Pass, but cursor paging is name-sorted, so grouping a page client-side puts the same area under several headings across pages | Eligible only when the sort equals the grouping, which the API does not offer; treated as failing for the library |
| D | Pass | Pass | Pass, but loses visual recognition of the movement | Eligible |

### 1.7 Weighted evaluation (heuristic)
| Criterion (weight) | A Cards | B Compact row | C Grouped | D Text row |
|---|---|---|---|---|
| Task effectiveness (25) | 3 | 4 | 3 | 3 |
| Accessibility and usability (25) | 3 | 4 | 4 | 4 |
| Error prevention and trust (20) | 3 | 4 | 3 | 2 |
| Business and operational (15) | 3 | 4 | 3 | 3 |
| Interaction efficiency (10) | 2 | 4 | 3 | 4 |
| Implementation and maintenance (5) | 3 | 4 | 2 | 5 |
| **Total (of 5)** | **2.90** | **4.00** | **3.20** | **3.25** |

### 1.8 Selected and rejected
Selected: **B, one `ExerciseSummary` compact row** with a small picture, name, body-area and category as text, dose in words, and an expand or info control for instructions. Variants: `library` (with Add), `plan` (read-only, patient and clinician), `editor` (see CD-301), `session-overview` (numbered). Rejected: A (slow to scan a library list, uses height, no evidence a PT scans faster with cards); C (conflicts with name-sorted cursor paging; body area is already a filter); D (kept as the fallback when no picture exists). The patient plan page uses the same row with the larger picture on the session player only.

### 1.9 Specification: `ExerciseSummary`
- **Anatomy:** optional thumbnail (decorative; alt empty because the name is adjacent), name (heading level set by the parent list), meta line (body area, category as text), dose line, optional therapist note, optional trailing action slot.
- **Use / not use:** use anywhere an exercise is listed. Do not use for the session player's active exercise, which is a full view.
- **Variants:** library, plan, editor, session-overview. No other variants without a decision.
- **States:** default; focus-visible on the action; long name (wraps to two lines, never truncated with `title`); missing picture (name only, same row height class); in-plan (library: action reads "In the plan" and is `aria-disabled` with the reason in text); loading (row skeleton); error (inline in list, not per row); read-only.
- **Behaviour:** expanding instructions is a disclosure button with `aria-expanded`; detail text is the same instructions the patient sees. Library Add on an exercise already in the plan keeps its disabled state, so the silent early return disappears.
- **Keyboard:** Tab reaches the expand and action buttons; Enter and Space activate. No arrow-key model.
- **Screen reader:** the row is a list item; the action label includes the exercise name ("Add Bridge to the plan"); adding announces "Bridge added to the plan" in a polite region.
- **Responsive:** one column at all widths; the dose line wraps; below 768 the action stays on the row's bottom edge, 44 px target in the patient theme, at least 24 px in the clinician theme (SC 2.5.8 [Observed in WCAG understanding page]).
- **Data:** `Exercise` (id, name, bodyArea, category, description, instructions, media, defaults).
- **Permissions:** Add and edit controls only for care-team clinicians; read-only variant otherwise.
- **Testing:** axe on each variant; long-name fixture; no-media fixture; focus returns to the Add button after the live message; visual regression across the five replaced layouts.

## 2. Decision: dose editor row (CD-301)

### 2.1 Task and journey
Clinician sets or adjusts sets, repetitions, hold, duration, rest, weekly days and times per day for each exercise. First plan: many exercises, each starting from suggested defaults. Weekly edits: change one number on one exercise.

### 2.2 Requirements and constraints
Contract: at least one of repetitions, duration or hold is required; instructions up to 1000 characters [Prior K]. Exact values matter clinically, so entry must allow typing a precise number. Brief section 7 forbids sliders for precise clinical input without validation. `NumberField` currently bypasses `Field`, so it lacks the requirement word, hint and error wiring [Code, matrix A3].

### 2.3 Production examples
| Product | Platform | Screen | URL | Observation | Label |
|---|---|---|---|---|---|
| WebPT HEP | Web | Program builder | https://help.hep.webpt.com/article/232-home-exercise-program-overview | Sets, reps and frequency are set through a preview step after exercises are added. Text only. | [Prior] |
| Linear | Web | Inline issue create | https://mobbin.com/screens/953e88d0-de6c-4eaf-9921-cd0c55bb8412 | Optional properties as compact controls beside a short form. | [Prior] |
| Zillow | Web | Tour availability | https://mobbin.com/screens/ea123c30-5911-46d9-ba35-ed36ef56d09f | A start time and end time per day with an add control on the row: a compact repeated field group with visible labels at the ends. | [Observed] |
| Square | Web | Item library table | https://mobbin.com/screens/ab5688a3-5fa4-4539-8f17-d131559b277a | Table rows with thumbnails, a row checkbox, an expand arrow, a per-row overflow control and a column picker. Not a dose editor; shown as a thumbnail-in-row example only. | [Observed] |

Not accessible: Hinge Health, Sword, SPRY doses editors (no public screens).

### 2.4 Guidance
Carbon: expansion fits large data into little space and slow content into the expanded area; if cramped, use a side panel (https://carbondesignsystem.com/components/data-table/usage/) [Observed]. WCAG 3.3.2 labels and instructions apply per field [judgement; not re-fetched].

### 2.5 Alternatives
A. All five fields always visible per card (current). B. A one-line dose summary per exercise ("3 sets of 10, hold 5 s, rest 30 s, Mon Wed Fri, 2 times a day") with an "Edit dose" disclosure that opens labelled number fields and the day checkboxes. C. A popover editor over the row. D. Stepper-only controls with plus and minus.

### 2.6 Gates
A pass. B pass (fields are real labelled inputs inside a disclosure). C conditional: popover inside a form with five fields and a checkbox group is focus-heavy and unused in the product today. D **fails**: stepper-only entry prevents typing exact values quickly (30 s hold needs many taps); exact value entry is required. D could only pass as a stepper beside a typed field, which is then A.

### 2.7 Evaluation
| Criterion | A | B | C | D |
|---|---|---|---|---|
| Task (25) | 3 | 4 | 3 | 2 |
| Accessibility (25) | 4 | 4 | 2 | 3 |
| Error prevention (20) | 3 | 4 | 3 | 2 |
| Business (15) | 3 | 3 | 3 | 3 |
| Efficiency (10) | 2 | 4 | 3 | 3 |
| Cost (5) | 5 | 3 | 2 | 3 |
| **Total** | **3.25** | **3.80** | **2.70** | **2.55** |

### 2.8 Selected
**B, dose summary line plus disclosure with labelled typed number fields**, all fields built from `ui Field` (the `requirement` prop, hint and error text), `inputmode="numeric"`, no spinners, no slider. The summary line is what the clinician reads while scanning the plan and is the same string the patient-facing row uses (shared dose formatter, replacing the duplicate `doseText` in two format files). The exercise being edited opens by default only when it was just added or has a validation error. Rejected: A (reading five fields per card to change one number); C; D.

### 2.9 Spec: `DoseEditorRow`
- **Anatomy:** `ExerciseSummary` (editor variant) header, dose summary line, "Edit dose" disclosure button, panel with five `Field` number inputs (sets, repetitions, hold in seconds, duration in seconds, rest in seconds), weekday checkbox group, times per day, instructions textarea with character count, move and remove controls (CD-302).
- **Use / not use:** builder only. The patient never edits doses.
- **States:** collapsed (summary), expanded, validation error (inline `FieldError` plus group message "Give repetitions, a duration or a hold time", focus to first error), saving (status line, not per row), disabled for read-only roles, unsaved (status line), long instructions.
- **Behaviour:** edits apply to local draft state immediately and autosave (CD-306). Units are in each label ("Hold, in seconds"). Removing asks no confirmation but keeps the item in a short "Removed Bridge. Undo" status line until the next edit (local undo only; no server undo).
- **Keyboard:** Tab through fields in label order; the disclosure keeps focus on its button when toggled; Escape does nothing special (not a popover).
- **Screen reader:** disclosure `aria-expanded` and `aria-controls`; errors via `aria-describedby`; group error announced on submit attempt.
- **Responsive:** fields wrap two per row at 768 and one per row below 600; summary line wraps.
- **Data:** draft item shape (dose, schedule, instructions). **Permissions:** care team only. **Testing:** field-level axe; typed boundary values; error focus order; summary string equals patient string for the same data.

## 3. Decision: reorder without drag (CD-302)

### 3.1 Task
Clinician changes the order exercises appear in the patient's session. Typically a short list; a single exercise moves a few places. [Assumption: plans have roughly 3 to 12 exercises; no usage data.]

### 3.2 Constraints
WCAG 2.5.7 requires a single-pointer alternative to any drag [Observed]. Reorder must keep focus on the moved control and announce the new position (brief section 17). AC-B8 specifies move buttons. A drag library is a new dependency (advisor approval).

### 3.3 Examples
WebPT HEP describes add by hover or drag [Prior]. MedBridge builder is described as drag and drop in prior project research [Prior]. WCAG's own reorder example uses select then up and down controls [Observed: https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html]. No Mobbin screen of a rehab reorder control was retrieved.

### 3.4 Alternatives
A. Always-visible move up and move down icon buttons (current). B. Select an item, then move controls appear (the WCAG example). C. Drag handle with a keyboard alternative. D. Numeric "Position" field per item.

### 3.5 Gates
A pass. B pass. C conditional: passes only if A or B is also present; adds a dependency. D pass. Drag-only (not proposed) would fail 2.5.7.

### 3.6 Evaluation
| Criterion | A | B | C | D |
|---|---|---|---|---|
| Task (25) | 4 | 3 | 4 | 3 |
| Accessibility (25) | 5 | 4 | 3 | 4 |
| Error prevention (20) | 4 | 4 | 3 | 3 |
| Business (15) | 3 | 3 | 3 | 3 |
| Efficiency (10) | 3 | 3 | 5 | 3 |
| Cost (5) | 5 | 3 | 1 | 4 |
| **Total** | **4.05** | **3.45** | **3.35** | **3.30** |

### 3.7 Selected
**A, visible move up and move down buttons**, refined: a visible "Position 2 of 5" text in the item header; button names "Move Bridge up, now position 2 of 5"; after a move, focus stays on the same direction button of the moved item (or the other button when the item reaches an end), and a polite live region says "Bridge moved to position 1 of 5"; at the ends the button uses `aria-disabled` with the reason available as the hint "First in the plan" (closing the matrix F gap that move buttons are disabled with no reason); buttons are 24 px minimum in the clinician theme per SC 2.5.8 and spaced by at least the target size. Drag is not built now; if added later it is additive only. Rejected: B (an extra tap per move); C (dependency and added complexity for short lists); D (reads as a form field for a spatial task).

### 3.8 Spec
Anatomy: item header with position text, up and down `IconButton`s with text names. Keyboard: Tab to buttons, Enter or Space moves. Screen reader as above. Responsive: same at every width; on touch the buttons are 44 px in the patient theme only (the builder is clinician-only, so 24 px minimum, 32 px used). Testing: focus retention after each move including at ends; live message text; reorder persists after autosave; keyboard-only reorder of a 5 item plan.

## 4. Decision: version history (CD-303)

### 4.1 Task
Clinician (and patient, read-only) sees what changed between versions, who published each, when, and what the patient currently sees. Clinician may need to look at an old version to start the next draft from it by hand (no restore exists).

### 4.2 Constraints
Immutable versions; versions list and detail endpoints exist; `diffFromPrevious` per version; patient change note per version from version 2 [Prior K]. No restore.

### 4.3 Production examples
| Product | Platform | Screen | URL | Observation | Label |
|---|---|---|---|---|---|
| Canva | Web | Version history panel | https://mobbin.com/screens/5c2fbcfc-a27f-4502-ae1c-879104aa2c42 | Right panel listing versions by time and author with "Current version" first, a "Highlight changes" toggle and Make a copy and Restore actions in the header. | [Observed] |
| Plane | Web | Page version history | https://mobbin.com/screens/afc55a5a-4236-4f12-859d-9d38a55bd06d | Right panel with Current version and dated entries; a "Highlight changes" checkbox; "Compare versions" and "Restore this version" buttons; Live and Unpublish status near the title. | [Observed] |
| Base44 | Web | Version history | https://mobbin.com/screens/6a1aaaf1-2630-4cf0-84f7-04967ddfaa3c | Left list with "Current" and "Live" labels, per-row menu, and separate Restore and Publish actions. | [Observed] |
| Snowflake | Web | Version history modal | https://mobbin.com/screens/4bed8718-0476-4315-9cf6-f7d2d905d040 | Modal with versions by time and author on the right, content on the left, a "Compare with current version" checkbox and Restore. | [Observed] |
| Notion, Fibery, Productboard, WRITER | Web | Version overlays | see K section 6 | Show changes toggles and a restore with an explicit overwrite warning. | [Prior] |

### 4.4 Guidance
No design-system page retrieved today covers version history. Carbon side-panel advice for cramped detail applies (see 2.4).

### 4.5 Alternatives
A. Drawer list with a "View version n" action (current). B. The same drawer with each entry showing its change note and "What changed" (shared `PlanDiff`) expanded in place, plus "View this version". C. Two-version side-by-side compare. D. A table of versions.

### 4.6 Gates
All pass for accessibility and privacy. C conditional: side-by-side needs a stacked fallback on narrow widths. Safety: no restore (none exists), so no overwrite risk; the drawer says it is read only.

### 4.7 Evaluation
| Criterion | A | B | C | D |
|---|---|---|---|---|
| Task (25) | 3 | 4 | 4 | 3 |
| Accessibility (25) | 4 | 4 | 3 | 4 |
| Error prevention (20) | 3 | 5 | 4 | 3 |
| Business (15) | 3 | 4 | 3 | 3 |
| Efficiency (10) | 3 | 4 | 2 | 3 |
| Cost (5) | 5 | 4 | 2 | 4 |
| **Total** | **3.35** | **4.20** | **3.30** | **3.30** |

### 4.8 Selected
**B, a version list in the existing right drawer where every entry shows version number, state word, date, author, the patient change note, and an inline "What changed" disclosure rendering the shared `PlanDiff` (CD-304)**; "View this version" opens the read-only `PlanView`. Entries use one state vocabulary (CD-305): "Current" (the version the patient sees), "Earlier" (superseded). The record's Plan tab and the builder's Versions tab use the same list component, replacing `VersionList` plus the patient history text. Rejected: A (no answer to "what changed" without opening each version); C (cost, and the API diff already answers it per version); D (a table adds nothing for two or three columns).

### 4.9 Spec: `VersionList`
Anatomy: heading with count, ordered list of entries (newest first), each with state Tag, date and author, note text, disclosure, view button. States: loading skeleton; one version only ("Version 1. No earlier versions"); no published version ("No version has been published"); error with retry; long note wraps. Behaviour: disclosure loads nothing extra (diff is in the version detail already fetched; if not, fetch with skeleton). Keyboard: Tab through disclosure and view buttons. Screen reader: each entry an `li` labelled "Version 3, current, published Nov 3 by Dana Smith". Responsive: drawer is full width below 768. Data: versions list endpoint plus version detail. Permissions: patient variant shows no author tooling and the patient wording. Testing: axe, state vocabulary snapshot, expand all with long diffs.

## 5. Decision: plan diff component (CD-304)

### 5.1 Task and constraints
Show what a version added, removed or changed, at publish time (clinician), in version history (clinician) and on Today and Plan (patient). Findings 0.2 to 0.4 apply.

### 5.2 Examples
Highlight toggles on Canva and Plane (4.3) are inline-in-document diffs for text; Snowflake uses a compare checkbox. WRITER and Fibery are [Prior]. For structured lists with few fields, none of the retrieved examples shows a sentence-based diff; that is [Judgement].

### 5.3 Alternatives
A. Shared sentence list: Added, Removed, Changed with field names in plain words, with an audience prop. B. Before and after table per changed field. C. Inline highlights inside `PlanView`. D. Keep three copies.

### 5.4 Gates
A pass (words not colour). B pass but needs old and new values the API diff does not return. C conditional: highlights are colour-led unless paired with words and icons; more work for a plan view that also renders for the patient. D fails the brief's consistency intent and prints raw keys (leaks implementation vocabulary to clinicians, a trust problem).

### 5.5 Evaluation
| Criterion | A | B | C | D |
|---|---|---|---|---|
| Task (25) | 4 | 4 | 4 | 2 |
| Accessibility (25) | 4 | 3 | 2 | 3 |
| Error prevention (20) | 4 | 4 | 4 | 2 |
| Business (15) | 3 | 3 | 3 | 2 |
| Efficiency (10) | 4 | 2 | 3 | 3 |
| Cost (5) | 4 | 2 | 1 | 5 |
| **Total** | **3.85** | **3.30** | **3.10** | **2.50** |

### 5.6 Selected
**A, one `PlanDiff` in `packages/ui` or a shared app component, with `audience="patient" | "clinician"`**. Field words come from one map; the clinician map says "instructions" where the patient map says "your therapist's note". Delete the two clinician copies. Follow-up requested of the API owner, not built here: include goals, title and plan instructions in the diff, because today a change to a goal is invisible in the publish dialog [Code: diff covers exercises]. Until then the dialog should state "This summary covers exercises only", so an empty diff is not read as "nothing changed". Rejected: B for now (values missing; may follow once a client compare is built), C, D.

### 5.7 Spec
Anatomy: optional heading, three labelled groups, each a list of exercise names with changed-field words. Empty: "No exercises were added, removed or changed." plus the scope sentence for the clinician audience. States: version 1 (no diff: "First version"), long list (no truncation), loading, error (parent handles). Screen reader: group labels are text; no colour dependency. Testing: unit test that every field key in the contract has a word for both audiences; snapshot for the three call sites.

## 6. Decision: draft, published and updated states (CD-305)

### 6.1 Task
Therapist must know at a glance what the patient sees now, whether unpublished work exists, and how it differs. Patient must see which version is current. Admin and coordinator see plan stage in the directory.

### 6.2 Findings
The slot alternates between `StatusChip` (success "Current version"), `Tag` ("Earlier version") and plain text ("(current)") [Code, matrix C2]. Plan version state is administrative, so the design system rule (`Tag` for administrative, `StatusChip` for clinical) points to `Tag`. K selected the persistent header: "Patient sees version 3. Draft: 1 added, 1 changed. Saved 9:02 AM."

### 6.3 Examples
Canva "Current version" label (4.3), Base44 "Current" and "Live" labels, Plane "Live" and "Unpublish" near title [Observed]. In all three the state is a short text label beside a list entry or title, not a colour alone.

### 6.4 Alternatives
A. A state sentence line (header) plus a `Tag` with the state word, one component everywhere. B. `StatusChip` only. C. A banner only when a draft exists. D. Header sentence only (current).

### 6.5 Gates
All pass if text is used. D fails K's safety condition (draft versus published persistently visible).

### 6.6 Evaluation
| Criterion | A | B | C | D |
|---|---|---|---|---|
| Task (25) | 5 | 3 | 3 | 2 |
| Accessibility (25) | 4 | 3 | 3 | 4 |
| Error prevention (20) | 5 | 3 | 4 | 2 |
| Business (15) | 4 | 3 | 3 | 3 |
| Efficiency (10) | 4 | 4 | 3 | 3 |
| Cost (5) | 4 | 5 | 4 | 5 |
| **Total** | **4.45** | **3.20** | **3.25** | **2.90** |

### 6.7 Selected
**A, `PlanStateLine`**: a sentence plus a `Tag` using exactly four words: **Draft** (clinician only, nothing published), **Published, version N**, **Draft differs from version N** (the "updated" state, with counts from `PlanDiff` data, for example "1 added, 1 changed"), **Earlier version** (superseded, read only). No "Archived" until the product defines it. The patient sees only "Current plan, version N" and "Earlier version". The directory care-plan column uses the same four words (replacing "Version n, draft changes" and "Draft only"). `Tag` is outlined text; no `StatusChip` for plan state. Rejected: B (alternating forms, no sentence); C (disappears when the problem is solved, hides the baseline); D.

### 6.8 Spec
States: no plan ("No plan yet"), draft only, published only ("No unpublished changes"), draft differs, earlier version, loading skeleton, error "Plan state could not be loaded" with retry, stale ("This draft was saved somewhere else"). Behaviour: sticky in the builder header; on the record Plan tab inline with the Continue editing link; counts update after each autosave. Keyboard: no interactive element except links. Screen reader: the sentence is plain text in a `role="status"` region only for the autosave part; state changes after publish are announced once. Responsive: sticky under the header at all widths; counts wrap below the Tag. Data: current version, draft updated-at, diff counts. Testing: all five derived states fixture; vocabulary snapshot across directory, record, builder and patient plan; axe.

## 7. Decision: unsaved-change protection (CD-306)

### 7.1 Task
Do not lose edits to a clinical plan when a save is pending or fails, the network drops, or the clinician navigates away. The builder already autosaves 900 ms after an edit, shows honest save text, offers "Load the saved draft" on a 409, and relies on the browser's `beforeunload` prompt [Prior K section 5].

### 7.2 Constraints
Brief section 11 requires unsaved-change protection and focus management. Only edits that are still pending or failed need protection, because saved edits are safe in the draft. `beforeunload` covers tab close and reload but not in-app route changes through the record tabs, the Patients nav or Back [Judgement; Next App Router has no built-in navigation-block API, not verified this session].

### 7.3 Examples
Canva and Snowflake version panels show saved states by time (4.3). Google Ads' asset flow shows "All changes saved" in the footer [Observed in the Mobbin frame at https://mobbin.com/screens/24e44106-8693-4933-9051-cb529c97463b, which contains that text]. Zillow's flow offers "Save & exit" [Observed: https://mobbin.com/screens/ea123c30-5911-46d9-ba35-ed36ef56d09f]. WebPT help describes save as template and Submit Care Plan; what it says about unsaved work was not checked [Prior].

### 7.4 Alternatives
A. Manual save only. B. Autosave plus browser prompt (current). C. Autosave plus an in-app leave dialog that appears only when a save is pending or has failed ("Your last changes are not saved yet"), with "Stay and retry" and "Leave anyway". D. Autosave plus a local copy recovered on return.

### 7.5 Gates
A fails safety (an unprompted loss path). B passes accessibility and partly fails the safety goal for in-app navigation. C passes. D conditional on privacy: a local copy of a plan holds PHI in browser storage on a shared workstation; it needs a clear-on-sign-out rule and advisor review.

### 7.6 Evaluation
| Criterion | A | B | C | D |
|---|---|---|---|---|
| Task (25) | 2 | 4 | 5 | 4 |
| Accessibility (25) | 4 | 4 | 4 | 3 |
| Error prevention (20) | 3 | 4 | 5 | 5 |
| Business (15) | 2 | 4 | 4 | 4 |
| Efficiency (10) | 2 | 5 | 4 | 4 |
| Cost (5) | 4 | 5 | 3 | 1 |
| **Total** | **2.80** | **4.15** | **4.40** | **3.80** |

### 7.7 Selected
**C, autosave with an in-app guard only for pending or failed saves**, keeping the browser prompt for tab close. When the state is "Saved", leaving is silent. The guard is an alert dialog (focus to "Stay and retry", Escape means stay). The status line texts are fixed: "Unsaved changes. Saving automatically.", "Draft saved at 9:02 AM", "Not saved. Your edits stay on screen. Try again." Rejected: A; B alone (in-app gap); D (PHI in local storage, cost).

### 7.8 Spec
Behaviour: guard intercepts in-app link clicks and the browser Back while status is pending or failed; waits up to the in-flight request before showing the dialog when the save is about to finish (avoids a pointless dialog). Offline: "You are offline. Edits are kept here and saved when you reconnect." only while the page stays open [Assumption: needs local hold in memory]. Keyboard: dialog traps focus, returns focus to the triggering link on Stay. Screen reader: dialog labelled "Leave without saving?"; status line polite. Testing: pending-save navigation, failed-save navigation, saved navigation (no dialog), 409 stale flow, tab close prompt, keyboard-only.

## 8. Library add, preview and starting point (not a separate decision record)
K selected the split-pane model and a library preview before Add. The `ExerciseSummary` library variant satisfies that: its disclosure shows full instructions before Add. "Start from the current version" remains the only non-blank starting point until a template API exists.

## 9. References and inaccessible sources
Retrieved today: Carbon data table usage; WCAG 2.2 Understanding 2.5.7 and 2.5.8; Mobbin screens listed above. Not retrieved or no relevant content: Apple HIG tables (fetch failed); Material 3 pages (JavaScript shell, no content); NN/g and Baymard reorder or editor guidance (not located); Hinge Health, Sword, SPRY and MedBridge builder screens (no public screens); NHS, CMS, DHCW have no treatment-plan editor guidance (DHCW repository page lists a Search component and a patterns folder only).
