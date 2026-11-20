# CD-306: Unsaved-change protection in the plan builder

- **ID:** CD-306
- **Status:** proposed, pending advisor sign-off. Research date 2026-11-20.
- **Research:** `docs/design/component-research/03-treatment-planning.md`, section 7
- **Screen or workflow:** Plan builder
- **User segment:** Clinician (care team)
- **User task:** Not lose edits when a save is pending or fails
- **Business objective:** Protect clinical drafting work without nagging
- **Alternatives considered:** A manual save only; B autosave plus browser prompt; C autosave plus in-app guard for pending or failed saves; D local draft recovery
- **Production references and sources:** Google Ads asset flow https://mobbin.com/screens/24e44106-8693-4933-9051-cb529c97463b (All changes saved); Zillow https://mobbin.com/screens/ea123c30-5911-46d9-ba35-ed36ef56d09f (Save and exit); feature research K
- **Research evidence and its limits:** Code and prior research for the existing autosave; no design-system page retrieved; scores A 2.80, B 4.15, C 4.40, D 3.80 heuristic. No participant data exists; scores are heuristic.
- **Accessibility considerations:** Alert dialog with focus on Stay and retry, Escape means stay; status as text; polite announcements
- **Clinical and privacy constraints:** D would store a plan (PHI) in browser storage and needs advisor review; C stores nothing
- **Interaction complexity:** Medium: App Router has no built-in route-leave API (not verified this session)
- **Technical feasibility:** Medium: link interception and history handling to be prototyped
- **Selected:** C: autosave with an in-app guard only when saving is pending or has failed; keep the browser prompt for tab close
- **Rejected:** A (loss path); B alone (in-app navigation gap); D (PHI in local storage, cost)
- **Rationale:** Protects only what is actually unsaved, so the dialog is rare and meaningful
- **Validation method:** Pending, failed and saved navigation cases; 409 stale flow; tab close; keyboard-only; two-session conflict test
