# 07. Clinical documentation components

Protocol: `docs/design/component-research/PROTOCOL.md`. Brief: `docs/COMPONENT-BRIEF.md` sections 16, 18, 21 and 22. Decision records: `docs/design/component-decisions/CD-410` to `CD-416`. Access date for every source: 2026-11-20. Scores are heuristic expert judgement; no clinician has tested anything. Colours are not chosen; token roles only.

Status of the product: no clinical note UI exists in any route (inventory section on the record; usage matrix C8). The data model does: `ClinicalNote` (header) and `ClinicalNoteVersion` (SOAP content, append-only); status `draft`, `signed`, `entered_in_error`; only the author on the care team can sign; a signed note's header is frozen; new versions on a signed note must be amendments with a reason; a version from an AI draft carries `source = ai_draft` and still needs the clinician's signature; only signed notes export (`docs/architecture/domain-model.md` line 42 and state table lines 99 to 100; PRD REQ-NOT-01, REQ-NOT-02, AC-F8, AC-G8). The record's History tab today is a plain table of domain rows (usage matrix, inventory). Everything below is spec for screens that do not exist.

Contract gaps found (not designed around silently):
1. The domain model does not say whether an amendment is a draft that needs its own signature or becomes the current version when saved. The spec below treats "Save amendment" as the committing action with a confirmation step, and flags the question (CD-412).
2. There is no per-section completeness rule for signing. The spec below warns about empty sections and does not block (CD-411); the advisor should confirm.
3. `entered_in_error` has no UI contract (who may set it, whether a reason is stored). Spec asks for a reason (CD-415).

## 1. Production examples and guidance used

`[Observed]` = read on the page. "via M" = retrieved in the M research session on the same date and not re-fetched.

| Source | Where | Observation |
|---|---|---|
| SPRY agentic scribe (via M) | https://www.spryhealth.ai/agentic-scribe | [Observed] Clinician reviews, edits and signs; only then the note is final and passed to billing; flags for conflicts and missing details appear before signing. |
| Abridge, prompt editing and linked evidence (via M) | https://www.abridge.com/blog/ambient-ai-prompt-editing ; https://support.abridge.com/hc/en-us/articles/30235128433811-Verify-a-Note-With-Linked-Evidence | [Observed] Clinician owns the final note; edits are made in the web editor. Neither page describes signing or amendment. |
| Microsoft DAX Copilot for Epic (via M) | https://support.microsoft.com/en-us/dax-copilot/epic/review-in-dax-copilot-for-epic | [Observed] Note tab in sections; each recording makes a version card in a timeline; version history kept. Does not describe a signing step. |
| Heidi (Mobbin, via M) | https://mobbin.com/screens/8a93fc9d-6c23-4a3e-9540-35035455ab0d | [Observed] A persistent line under the composer reminds the clinician to review the note before use. |
| Square, new contract (Mobbin) | https://mobbin.com/screens/a84d4630-00c8-4eb3-b35c-3f250b10f338 | [Observed] A document flow with "Save as draft" as a secondary pill and a disabled "Share" as the committing action, and a red "Invalid request" banner across the top. Not clinical; shows the draft versus commit pairing. |
| Plane, Drafts list (Mobbin) | https://mobbin.com/screens/e65c98ae-dfe1-4f31-afeb-a452a24c2152 | [Observed] A "Drafts" list separate from published work items; deleting a draft uses a confirmation dialog stating it cannot be undone. Not clinical. |
| eCFR 45 CFR 164.526 | https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-C/part-164/subpart-E/section-164.526 | [Observed] For an individual's accepted request to amend, the covered entity identifies the affected entries and appends the amendment or links to where it is kept. Source of the append-and-link principle only. [Assumption] This is the patient-requested amendment rule; it is used as an analogy for clinician addenda, not as a statement that clinician amendments are governed by it. |
| NN/g, confirmation dialogs | https://www.nngroup.com/articles/confirmation-dialog/ | [Observed] Reserve confirmation for serious or irreversible actions; name the item and outcome; avoid pre-selecting the affirmative. Applies to signing (7.2). |
| W3C WCAG 2.2 SC 4.1.3 | https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html | [Observed] Status messages (saved, signed) need role status without moving focus. |
| Internal: plan builder autosave line | `apps/web/app/(clinician)/patients/[patientId]/plan/builder.tsx` lines 688 to 706 | [Observed] "Unsaved changes. Saving automatically.", "Saving draft", "Draft saved at {time}", "Not saved: {reason}"; `beforeunload` guard; `role=status`. Reused for notes (7.5). |
| Mobbin search for EHR note, amendment, signature | Mobbin web search, 2026-11-20 | [Observed] Returned no clinical products (Canva, Spellbook, WeTransfer, incident.io, Plane, Square). No Mobbin clinical-note reference is claimed. |
| Not retrieved | | HL7 FHIR Composition (the fetch was refused by the site's robots rules); HHS HIPAA amendment guidance page (the fetch failed). Their status vocabulary (preliminary, final, amended, entered-in-error) is therefore not cited as read; the vocabulary here comes from the CarePath domain model, which is stated to be FHIR-aligned (PRD O7) but not verified here. Epic, Cerner and other EHR note screens were not available. |

---

## 7.1 SOAP note editor structure (CD-410)

**User task and place in journey.** The therapist documents a visit (Subjective, Objective, Assessment, Plan) during or after it, in the patient's record, usually on desktop. Needs: the four sections in order, the patient's recent records to hand, a draft that survives interruption, and clarity about which text came from a draft. Action: write, review, sign.

**Requirements.** Business: shorter documentation time without losing the audit story. Healthcare: signed content immutable, only author signs, AI text never signed unseen (AC-F8), patient identity visible while writing (J), patient-reported pain labelled as such.

**Alternatives.**

| | Model |
|---|---|
| A. One rich-text document | A single editor with template headings. |
| B. Four labelled plain-text sections with explicit insert-from-records | One `Textarea` per section, each with a visible heading and its own helper line; an "Insert from records" control for Objective that lists records and inserts only on selection. |
| C. Coded structured fields | Pain scores, ROM values and plan items as form controls. |
| D. Transcript-first | A transcript is shown and sections are generated beneath it (REQ-AIS-06 only). |

**Gates.** A: privacy and safety pass; but section boundaries and `source` attribution cannot be tracked inside one blob (judgement), so the "which text came from a draft" requirement is not met: fail safety. B pass. C pass but depends on fields the contracts do not define (`records.ts` has no note schema beyond SOAP content): treated as infeasible now, not a gate fail. D passes only when generated text is inserted by explicit action (CD-406); it is an input path to B, not a replacement editor.

| Criterion | A | B | C | D |
|---|---|---|---|---|
| Task effectiveness (25) | 3 | 4 | 3 | 4 |
| Accessibility and usability (25) | 3 | 5 | 3 | 3 |
| Error prevention and trust (20) | 2 | 4 | 4 | 2 |
| Business and operational (15) | 3 | 4 | 3 | 4 |
| Interaction efficiency (10) | 4 | 4 | 2 | 4 |
| Implementation cost (5) | 4 | 4 | 1 | 2 |
| **Weighted** | 2.95 (gate fail) | **4.25** | 3.00 | 3.25 (input path only) |

**Selected: B.** D is available as the source of a draft inside B (transcript pane docked at 1280 px and above, as in CD-400). **Rejected:** A (loses section and source tracking), C (no contract, narrative content dominates). Trade-off: plain text means no inline formatting beyond line breaks and simple lists (content format is an assumption; confirm with the contract).

**Spec: `NoteEditor`.**
- Anatomy: patient identity strip (sticky; banner decisions are in the patient-identity family, referenced not repeated); note header (visit date, author, status chip); four sections each with an `h2` ("Subjective", "Objective", "Assessment", "Plan"), a one-line helper in plain words (for Subjective: "What the patient reported, in their words where you can"; Objective: "What you measured or observed. Patient-reported values are labelled as patient-reported"), the `Textarea`, and below Objective an "Insert from records" button; save line (7.5); footer actions.
- Insert from records: opens a short list (latest check-in pain, sessions this week, plan version) as checkboxes with "Insert selected". Inserted text is plain, prefixed by its source in words ("Patient-reported pain 5 of 10, check-in 14 Nov"). Nothing is inserted automatically.
- Use when: writing or amending a visit note. When not to use: reading a signed note (render read-only, 7.3); a progress review draft (AI review panel, family 06).
- Variants: draft (editable), signed (read-only), amendment (editable copy with reason, 7.3).
- States: default; focus-visible; typing; saving; saved; save error ("Not saved: {reason}. Your text is still here."); read-only (signed); empty section (the section shows its helper, no placeholder text standing in for a label); long content (textarea grows to content with a minimum of 5 rows, `maxlength` only if the contract sets one); permission restricted (not on care team: whole editor read-only with the reason line, as `record.tsx` does for the builder); unsaved changes (leaving prompts); stale (another session saved a newer draft: banner "A newer draft was saved elsewhere. Load it." as the builder does); network unavailable (typing continues locally; status "Not saved yet: you are offline. It saves when you reconnect.").
- Keyboard: Tab through sections; no custom shortcuts except Ctrl/Cmd+S to force save (announced "Draft saved at {time}"); "Insert from records" opens a dialog with focus on the first checkbox.
- Screen reader: each `Textarea` has a persistent label (the section heading is the label via `aria-labelledby`, plus the helper via `aria-describedby`); save status through `role="status"` (7.5); on sign success the status "Note signed by {name} at {time}" is announced and focus moves to the note heading.
- Responsive: single column at every width; the four sections stack; the sticky footer holds Sign note and the save line; the "Insert from records" list is a bottom sheet below 768 px. Zoom 200 percent: no horizontal scroll in textareas.
- Data: `ClinicalNote`, current `ClinicalNoteVersion` (SOAP content, `source`, `aiGeneration`), recent records for Objective.
- Loading: skeleton of the four headings, text areas disabled until loaded. Error: header-level `QueryError` with Retry (CD-449).
- Testing: draft survives logout (REQ-NOT-01 API test); axe; keyboard-only write and sign; 200 percent zoom at 390 px; inserted text carries its source prefix.

---

## 7.2 Draft to signed: the signing control (CD-411)

**Task.** Take responsibility for a final note. Needs: a clear statement of what signing does, who is signing, what the note contains, and where generated text is included. Action: Sign note.

**Constraints.** Only the author on the care team can sign; signing needs a time and a current version; signed content is immutable (domain model). Signing is irreversible in place (amendment only).

**Alternatives.**

| | Model |
|---|---|
| A. One-click Sign | The button signs immediately. |
| B. Sign with a summary dialog | "Sign note" opens a dialog showing what will be locked; confirm "Sign note". |
| C. Typed attestation or re-authentication | The clinician types a phrase or password. |
| D. Co-sign workflow | A second clinician must countersign. |

**Gates.** A fails safety: irreversible action with no consequence statement and no moment to see AI-derived content (brief section 8: actions that affect clinical records; NN/g: serious, irreversible actions justify a confirmation). C passes but over-weights a routine action (NN/g warns against training click-through with frequent heavy confirmations). D is not in the PRD.

| Criterion | A | B | C | D |
|---|---|---|---|---|
| Task effectiveness (25) | 4 | 4 | 3 | 2 |
| Accessibility and usability (25) | 4 | 4 | 3 | 3 |
| Error prevention and trust (20) | 1 | 4 | 5 | 5 |
| Business and operational (15) | 3 | 3 | 2 | 1 |
| Interaction efficiency (10) | 5 | 4 | 2 | 1 |
| Implementation cost (5) | 5 | 4 | 3 | 1 |
| **Weighted** | 3.40 (gate fail) | **3.85** | 3.15 | 2.55 |

**Selected: B.** **Rejected:** A, C, D. Weakness: a summary dialog can become a reflex; mitigations are that the dialog states facts that change (sections with text, AI-derived content present) rather than a fixed "Are you sure".

**Spec: `SignNoteDialog`.**
- Trigger: "Sign note" (primary, one primary in the footer; "Save draft" is not a button because autosave handles it, see 7.5; "Discard draft" is a text button with its own confirmation if text exists). Disabled with a visible reason and `aria-describedby` when the user is not the author, is not on the care team, or no version exists: "Only {author} can sign this note." / "You are not on this patient's care team."
- Dialog (focused confirmation, not full-screen; `Dialog`, not danger, because signing is serious but is not a destructive act): title "Sign this note?"; description "Signing locks this version. You can add an amendment later; the signed version stays as it is."; a definition list: Patient, Visit date, Author, Sections with text ("Subjective, Objective, Assessment"), Sections left empty ("Plan") shown as a warning line without blocking, "Includes text from a draft you approved on {date}. You are responsible for all wording." only when `source = ai_draft`; footer: "Keep editing" (secondary, first in DOM and initial focus) and "Sign note" (primary).
- Initial focus on "Keep editing" is the safe choice; Enter on the primary requires moving to it. [Assumption: reduces accidental signing; untested.]
- Behaviour: on confirm the button shows loading ("Signing"); success closes the dialog, the editor becomes read-only, the status chip changes to "Signed", `role="status"` announces "Note signed by {name} at {time}", and focus moves to the note heading. Error: remains inside the dialog as a Banner above the footer ("The note was not signed. It is still a draft. Try again.") with focus on the banner; the toast is never used (CD-442).
- States: default, loading, success, error, permission restricted, network unavailable (disabled with "You are offline. Sign when you reconnect."), stale (draft changed elsewhere: dialog blocked with "This note changed. Reload to see the latest draft before you sign").
- Keyboard and screen reader: focus trapped in the dialog, Esc closes without signing, title and description linked by `aria-labelledby` and `aria-describedby`.
- Testing: AC-F8 (no signed note from an AI draft until signature); only author can sign (API); axe; keyboard-only; error keeps the draft editable.

---

## 7.3 Amendments as new versions (CD-412)

**Task.** Correct or add to a signed note without losing what was signed. Needs: the signed version stays visible, the reason is recorded, versions are comparable. Action: Amend note.

**Alternatives.**

| | Model |
|---|---|
| A. Amendment as a new version with a required reason; prior versions read-only and listed | "Amend note" opens an editable copy of the current version with a reason field; saving creates a new version marked as an amendment. |
| B. Edit in place with tracked changes | Signed text is editable with strike and insert marks. |
| C. Overwrite with audit only | Edit the note, log the change. |
| D. Mark entered in error and write a new note | No amendment concept. |

**Gates.** B and C fail the mandatory requirement REQ-NOT-02 (signed content immutable; DB rejects UPDATE). D passes but loses continuity for small corrections.

| Criterion | A | B | C | D |
|---|---|---|---|---|
| Task effectiveness (25) | 4 | 4 | 5 | 2 |
| Accessibility and usability (25) | 4 | 3 | 4 | 3 |
| Error prevention and trust (20) | 5 | 3 | 0 | 4 |
| Business and operational (15) | 4 | 3 | 3 | 2 |
| Interaction efficiency (10) | 3 | 3 | 5 | 2 |
| Implementation cost (5) | 3 | 2 | 5 | 4 |
| **Weighted** | **4.05** | 3.20 (gate fail) | 3.45 (gate fail) | 2.75 |

**Selected: A**, aligned with the append-and-link principle in 45 CFR 164.526(c)(1) as an analogy and with the domain model's append-only versions. **Rejected:** B, C, D (D remains available as the separate "Mark as entered in error" action, CD-415). Trade-off: slower than editing in place; accepted because that is the purpose.

**Spec: `AmendNote` and `NoteVersionList`.**
- Entry: "Amend note" (secondary) in the signed note header, enabled for clinicians who may write (care team); disabled with a reason otherwise. It is not an overflow item (brief section 8: no hiding of a frequent action in a menu; amendments may be rarer than signing, but they are a primary medico-legal path, so they stay visible).
- Amendment view: Banner (info) "You are amending a signed note. The signed version stays as it is." the four sections prefilled from the current version in editable `Textarea`s; a required field "Reason for the amendment" placed first with the helper "Your name, the time and this reason are kept with the new version."; changed sections are marked "Changed" in words (comparison of sections against the prior version uses CD-403's labelled blocks, not a colour diff); footer "Cancel amendment" (text button, confirms only if text changed) and "Save amendment" (primary).
- On save: a confirmation step identical in structure to 7.2 ("Save this amendment?" lists reason and changed sections; confirm "Save amendment"), because the amendment becomes the current version immediately (gap 1 above). If the advisor decides amendments need their own signature, the same dialog is "Sign amendment" with no other change.
- Version list: "Version history" under the note (and as a drawer on narrow screens) with rows "Version 1, signed by {name}, {date time zone}" and "Version 2, amendment by {name}, {date time zone}. Reason: {text}". Current version marked in words ("Current"), earlier versions "Earlier version" (the same vocabulary as plan versions, usage matrix C2, avoiding "(current)" variants). "View version 1" opens it read-only; "Compare with version 2" opens the two-column comparison (CD-403).
- Top of every note that has amendments: "This note has 1 amendment. Showing the current version." with a link to the version list. Exports: only the current signed version (domain rule); the UI says so in the version list footer only if export UI exists.
- States: default, amending, saving, save error (in-context Banner, text kept), unsaved changes, permission restricted, stale (a newer version exists: "A newer version was saved. Reload to amend the latest."), read-only (not care team), long content, partial data.
- Keyboard and screen reader: reason field is first focus; save announces "Amendment saved as version 2".
- Testing: UPDATE rejected API test; amendment links to prior; keyboard-only amend; version list reading order.

---

## 7.4 Audit trail display (CD-413)

Two surfaces with different readers: (a) the clinician's per-note "Version history" (7.3) and the record's History tab (domain rows, today a `Table`); (b) the administrator's audit viewer with filters by actor, patient, event type and date (REQ-AUD-04). The record's history is built from domain rows, not `AuditEvent`, which stays admin-only (PRD section on record history, ruling 3.7).

**Task.** Answer "who did what to this record, when, and why" accurately, in order, without being able to alter it. Admin: filter and find.

**Alternatives.**

| | Model |
|---|---|
| A. Chronological table | Columns: time, person and role, action in words, detail. Newest first; filters for the admin viewer. |
| B. Vertical timeline of cards | One card per event. |
| C. A single "last edited by" line | Latest actor only. |
| D. Field-level attribution | Each field shows its last editor. |

**Gates.** C fails the safety requirement for an audit view (no history). D fails accessibility and cost for free-text notes. A and B pass.

| Criterion | A | B | C | D |
|---|---|---|---|---|
| Task effectiveness (25) | 4 | 4 | 2 | 4 |
| Accessibility and usability (25) | 5 | 3 | 5 | 2 |
| Error prevention and trust (20) | 4 | 4 | 2 | 5 |
| Business and operational (15) | 4 | 3 | 3 | 2 |
| Interaction efficiency (10) | 3 | 3 | 5 | 2 |
| Implementation cost (5) | 5 | 3 | 5 | 1 |
| **Weighted** | **4.20** | 3.45 | 3.35 (gate fail) | 3.05 |

**Selected: A**, reusing the table pattern from the table family (header built with `Tr` and `Th`, never raw `tr`, per usage matrix A3). **Rejected:** B (cards cost scanning and screen reader reading order), C (not an audit trail; kept as a one-line "Last updated" summary in the note header only), D.

**Spec: `HistoryTable`.**
- Columns: "When" (date, time and zone abbreviation; relative text such as "2 h ago" may sit beside the absolute time but never replace it), "Who" (name and role), "What happened" (action in plain words: "Signed the note", "Saved an amendment", "Approved a generated draft", "Rejected a generated draft", "Marked a check-in reviewed"), "Detail" (reason or note text, truncated with a "Show full text" button, not a `title` attribute, usage matrix A3 finding 5).
- Rules: rows are never editable or deletable from the UI; no row action except "View version" where relevant; actor shown even for system events ("Clinic rule: reported pain 7 or higher"; "Generated draft, Demo provider, rule-based" for generation); AI events are named as such and the reviewer is named separately.
- Admin viewer: filters (actor, patient, event type, date range) in the standard filter bar, active filters as removable text chips, result count in `role="status"`, "Export" is out of scope until specified. Do not show patient names in the page title (`document.title` finding in J).
- States: default, loading (skeleton rows), empty ("No history yet."), filtered-empty, partial data (some events cannot be resolved to a name: "Unknown user (removed)"), long content, permission restricted (coordinator refused, AC-H5: "Audit is available to administrators"), network, stale.
- Responsive: below 768 px each row becomes a stacked group (time, who, what, detail) with the same words; the table is not left as a scroll region (usage matrix A3 mixed model).
- Testing: AC-I5 filters; AC-I4 immutability is server-side; axe table semantics; time zone label present.

---

## 7.5 Autosave and resume (CD-414)

**Task.** Never lose a note in progress; know whether it is saved.

| | Model |
|---|---|
| A. Manual save only | Save draft button. |
| B. Autosave with a visible status line | The plan builder's pattern. |
| C. Silent autosave | No status. |

**Gates.** C fails trust (no way to know a failure, WCAG 4.1.3 would still require exposing any status shown, so silence also hides failures). A and B pass.

Scores: A 2.65, **B 4.35**, C 3.35 (A: 2,4,2,2,2,5; B: 5,4,4,4,5,4; C: 4,3,2,3,5,5 on the standard weights).

**Selected: B**, reusing the builder pattern exactly so the clinician sees one save vocabulary: "Unsaved changes. Saving automatically." / "Saving draft" / "Draft saved at {time}" / "Not saved: {reason}. Your text is still here." Rejected: A, C. Rules: the status line is `role="status"`, polite; to avoid chatter it announces only on first save, on error and on recovery, not on every save (the visible text still updates). `beforeunload` guard while there are pending or failed saves (as the builder does). Resume: reopening a draft returns to the last section edited (scroll and focus on that section heading). Local-only recovery of text that never reached the server is not designed: storing PHI in the browser needs a privacy decision (open question, same as M section 13 "interrupted workflow"). Signed notes show no save line.

---

## 7.6 Note status vocabulary (CD-415)

**Decision (conventional; established rule applied).** Clinical note status is a clinical state, so it uses `StatusChip` (filled, icon, words) per the design-system rule (usage matrix C section header; `components.md`), not `Tag`.

| State | Source | Chip | Note |
|---|---|---|---|
| Draft | `status = draft` | neutral tone, edit icon, "Draft" | Only the author and care team see editing controls |
| Signed | `status = signed`, one version | success tone, check icon, "Signed" | Shows signer and time beside it |
| Signed, amended | `signed` with amendment versions | info tone, "Signed, amended" | Derived, not stored; link "View version history" |
| Entered in error | `status = entered_in_error` | error tone, alert icon, "Entered in error" | Content stays readable; banner "This note was marked as entered in error by {name}, {time}. Reason: {text}"; excluded from export |

Rules: the word "Final" is not used (ambiguous with plan "Published"); "Active" is not used. Vocabulary is distinct from plan status (Draft, Published, Superseded) and AI status (generated, approved, rejected), as brief section 13 requires, even where the word "Draft" repeats: the chip is always prefixed in context by the object ("Note: Draft"), written out in the header "Visit note, draft". "Mark as entered in error" is a secondary action with a required reason and a danger confirm (CD-422); it is not a delete. Open question: who may set it and whether it needs a second person. Testing: status maps are one shared module, no duplicate local maps (usage matrix section B duplication).

---

## 7.7 Clinician-written note read by the patient (CD-416)

**Task.** The "Note to the patient" written in the publish dialog is clinician-authored and patient-facing. It must read as the clinician's words to the patient, and the clinician must see what the patient will see.

**Decision (conventional extension).** Keep the required field in the publish dialog (required from version 2), add a "What your patient will see" preview beneath the field in the dialog (same text, patient wording and name of the sender), and change clinician-side display labels so that the sentence "Set by your care team." in `plan-view.tsx` reads for its audience: in the clinician plan view the label becomes "Note you sent to the patient" / "Set by the care team" (usage matrix G10). The patient's view stays "Your care team changed this plan". Generated text is never offered in this field (no AI assist until a decision records otherwise). No alternatives were invented; this applies the authorship distinction of CD-406 to an existing flow.

---

## 8. Cross-cutting rules

1. Signed content is never overwritten, in the UI or the API (CD-411 to CD-413).
2. Generated text enters a note only through "Use in note" and is labelled until edited (CD-406, CD-410).
3. Save and sign feedback is persistent, in context and announced politely; errors never use a toast (CD-442).
4. One status vocabulary for notes, in one shared module (CD-415).
5. Times always carry the zone; relative times only beside absolute (usage matrix G3).
6. Open questions for the advisor: amendment signing (gap 1), completeness rule for signing (gap 2), `entered_in_error` rules (gap 3), local PHI recovery, content format of note text.

## 9. Traceability (brief section 25)

| Decision | Selected | Screen | Implemented component | Storybook | Tests |
|---|---|---|---|---|---|
| CD-410 | Four labelled sections plus explicit insert | Record, note editor | `NoteEditor` (new) | to add | REQ-NOT-01 |
| CD-411 | Sign note with summary dialog | Note editor | `SignNoteDialog` (new) | to add | AC-F8 |
| CD-412 | Amendment as new version, reason required | Signed note | `AmendNote`, `NoteVersionList` (new) | to add | REQ-NOT-02 |
| CD-413 | Chronological history table | Record History, admin audit | `HistoryTable` (replaces plain table) | to add | AC-I5 |
| CD-414 | Autosave line (builder pattern) | Note editor, builder | `SaveStatusLine` (extract) | to add | draft survives logout |
| CD-415 | Chip vocabulary for notes | Note header, lists | `NoteStatusChip` | to add | shared map |
| CD-416 | Preview of patient-facing note | Publish dialog, plan view | publish dialog change | to add | copy check |
