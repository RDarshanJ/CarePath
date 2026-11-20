# Prototype spec: patient composer with urgent route (CD-511, CD-513, CD-515)

Status: spec only, not built. Research: `docs/design/component-research/13-messaging.md` sections 3, 5 and 7; feature G4.

## Question
Does placing the urgent route, reply time and guided starting points with the composer keep the patient oriented without crowding the screen, and does a sticky composer stay usable with the on-screen keyboard?

## Alternatives to render
- A: composer at the end of the thread, notices above Send (current layout with the urgent line added).
- B: sticky composer bar at phone widths with notices collapsing to one line after the first send in the session, never removed.
- C: chat-style single-line input with Enter to send (shown only as the rejected reference).

## Identical across alternatives
Same thread (empty, with history of 12 messages, and with one failed message), same fixed emergency string from `packages/shared/src/copy.ts`, same clinic phone and reply-time text (and a variant with neither), same starting points, same tokens and type scale, same viewports 375, 390, 768, 1024.

## What differs
Only composer placement, notice collapsing behaviour and the Send model.

## What to look at
Last message and focus ring not covered when the field is focused with the keyboard open; notices readable at 200 percent text; the empty thread screen height; banned-word check ("anytime", "24/7", "live", "online now"); whether Send ever fires with a half-written message. Results are design observations only.
