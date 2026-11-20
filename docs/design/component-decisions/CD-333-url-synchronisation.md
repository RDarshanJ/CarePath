# CD-333: URL synchronisation and search privacy

- **ID:** CD-333
- **Status:** proposed, pending advisor sign-off. Research date 2026-11-20.
- **Research:** `docs/design/component-research/09-tables-search-filter.md`, section 4
- **Screen or workflow:** Directory, admin patients, queue
- **User segment:** Clinician; coordinator
- **User task:** Keep place across reload and Back; share a link without identifiers
- **Business objective:** Continuity without PHI in logs
- **Alternatives considered:** A everything in URL including search text; B filters sort page in URL and search text kept out; C nothing; D hashed search
- **Production references and sources:** Code read (`directory.tsx` writes q to the URL); GOV.UK pagination page (filter or sort resets to page one)
- **Research evidence and its limits:** Code finding; contradicts the statement in feature research I that the URL holds no names; weighted scores A 3.30, B 4.40, C 2.60, D 3.05 secondary to the gate. No participant data exists; scores are heuristic.
- **Accessibility considerations:** Back to results restores state; no extra controls
- **Clinical and privacy constraints:** A fails the privacy gate: name or MRN in history, logs, referrers
- **Interaction complexity:** Medium
- **Technical feasibility:** Medium: sessionStorage rule needs advisor view
- **Selected:** B: URL holds view, filters, sort, page size and opaque page token; search text in tab-scoped sessionStorage
- **Rejected:** A (privacy fail); C (no reload or share); D (reversible, no benefit)
- **Rationale:** Only B satisfies privacy and continuity
- **Validation method:** Assert no q in any URL; Back restores page and search; sessionStorage cleared on sign out
