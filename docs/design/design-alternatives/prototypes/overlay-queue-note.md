# Prototype spec: resolving a review task with a note (CD-523, CD-522)

Status: spec only, not built. Research: `docs/design/component-research/16-overlays.md` sections 4 and 5.

## Question
Should the required note for Resolve or Dismiss be a dialog, an inline expansion in the detail pane, or a separate page?

## Alternatives to render
- A: inline expansion below the action buttons inside the detail (pane at 1280 px and above, drawer below).
- B: dialog from the detail (current).
- C: separate page with the same form.

## Identical across alternatives
Same task (rule, value read, threshold, source links, created and due times), same note field and limits, same API failure and success outcomes, same tokens and type, viewports 1024, 1280, 1440 (drawer at 1024).

## What differs
Only where the note form appears and how dismissal with typed text is handled (discard row inside the form, or in the overlay).

## What to look at
Is the evidence visible while writing; is there a modal inside the drawer; is typed text kept on an API failure and on a stray outside click or Esc; where the error appears; focus after save. Design observations only; no participant results are claimed.
