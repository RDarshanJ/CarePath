# CarePath Competitor Analysis

Access date for every source: 2026-11-19. CarePath is an independent portfolio product using synthetic data and is not affiliated with any company listed here.

## Method and limits

- Sources: official product pages, help centers, App Store listing (Sword only), vendor blogs and job boards. Pages were summarized by a fetch tool, then paraphrased again here. No quote exceeds 15 words (none are quoted).
- Tags: **[Observed — URL]** means the source page states it. **[Assumption]** means inference, flagged as such. "Not found in public sources" means the pages I read do not say it; it does not prove the feature is absent.
- Vendor outcome numbers are marketing claims and are not independently verified.
- Not inspected: logged-in apps, App Store pages for Hinge, Omada and Maven (fetch failed), Mobbin flows (separate deliverable), visual design of any product (page-text fetches cannot see rendering). Visual design is therefore "not assessed" unless a source describes it.
- SPRY was only fetched through its marketing and blog pages; the redirect domain is spryhealth.ai.

## Segmentation

| Segment | Products |
|---|---|
| Patient-facing care programs (employer/plan paid) | Hinge Health, Sword Health, Omada Health, Maven Clinic |
| Patient apps sold through clinicians | MedBridge (Medbridge GO), PhysiApp (Physitrack) |
| Provider-facing rehab software (EMR / HEP / RTM) | SPRY, WebPT, MedBridge, PhysiApp/Physitrack |
| Access marketplaces | Zocdoc (patient-facing booking plus provider tools), Headway (provider-facing, insurance network) |
| Clinical AI documentation | Abridge, Commure |
| Developer infrastructure | Medplum |

---

## 1. Patient-facing care programs

### 1.1 Hinge Health

**Positioning.** [Observed — https://www.hingehealth.com/how-it-works/experience] A digital musculoskeletal program combining guided exercise therapy, a care team and a wearable pain-relief device in one app. Also lists pelvic health, migraine, balance and fall prevention.
**Target users.** [Observed — same] Members with joint and muscle pain, offered through participating employers and health plans. [Observed — https://www.hingehealth.com/for-individuals/] Cost to eligible members is $0; spouses/partners and dependents 18+ are eligible.
**Core functionality.** [Observed — https://www.hingehealth.com/how-it-works/experience] PT-designed exercises, real-time form feedback, movement analysis branded TrueMotion, multiple body parts treated at once.
**Business/user problems.** [Observed — https://www.hingehealth.com/for-individuals/] Employer/plan pays, which removes member cost for virtual care; in-person care may have cost sharing.
**Onboarding.** [Observed — https://www.hingehealth.com/for-individuals/] Eligibility form, then a roughly 10-minute questionnaire that creates the account, then download the app and do a few exercises so the plan can be personalized. Equipment notes: phone or tablet, floor space; motion tracking needs good light and a flat surface for the device.
**Clinical workflows.** [Observed — https://www.hingehealth.com/how-it-works/care] PTs assess movement, track progress and adjust the plan; orthopedic doctors do virtual evaluations and can refer to surgery; board-certified coaches support habits.
**Scheduling.** [Observed — same] Video visits with a PT or orthopedic doctor are booked in the app; in-person care through a local network without referral, arranged in as little as 48 hours (vendor claim).
**Treatment plan management.** [Observed — same] Plan built around goals and root cause, personalized by PTs throughout recovery; a virtual assistant named Robin can suggest next steps within the plan. How formal revisions work: not found in public sources.
**Engagement.** [Observed — https://www.hingehealth.com/for-individuals/] Suggested 15 minutes at least three times a week; progress tracking; coach support.
**Remote monitoring.** [Observed — https://www.hingehealth.com/how-it-works/experience] Camera/motion-based tracking during exercise; Enso is an FDA-cleared wearable for pain relief. Wearable data integration beyond Enso: not found in public sources.
**AI.** [Observed — https://www.hingehealth.com/how-it-works/care] Robin answers program, exercise and technical questions around the clock and can alert the care team during a flare-up; the page does not label Robin as AI. [Observed — https://www.hingehealth.com/product/enso] The Enso page makes no AI claims and does not say clinicians review AI outputs. Job posting confirms AI interest in design (see job-market doc).
**Privacy/trust.** [Observed — https://www.hingehealth.com/for-individuals/] Footer links to privacy policy, HIPAA notice, security page and privacy choices; contents not summarized on the page. In-app consent screens: not found in public sources.
**Navigation.** Not found in public sources (requires logged-in app).
**Visual design.** Not assessed.
**Accessibility.** [Observed — https://www.hingehealth.com/for-individuals/] No dedicated accessibility statement on the page; a non-discrimination and interpretive-services notice is linked; page is English only. App accessibility: not found in public sources.
**Gaps.** [Assumption] Clinician-side transparency about what the assistant tells patients is not public. [Assumption] Patient-visible reasoning for why a plan changed is not documented publicly.

### 1.2 Sword Health

**Positioning.** [Observed — https://sword.com/solutions/ai-care-platform] One AI care platform spanning pain, women's health, cardiometabolic and mental health, with a shared clinical memory across programs.
**Target users.** [Observed — same] Buyers are employers, health plans, unions and brokers, with outcome-based pricing; individuals can reach clinical pain specialists. [Observed — https://apps.apple.com/app/id1468523447] Members get programs free through participating employers/plans.
**Core functionality.** [Observed — https://apps.apple.com/app/id1468523447] Thrive (PT: motion tracking, real-time form guidance, messaging with a DPT), Bloom (women's health), Move (whole-body plans, Apple Health integration), Mind (mental health with AI and clinician access). Sessions about 10-15 minutes a day plus short lessons.
**Onboarding.** [Observed — https://sword.com/solutions/ai-care-platform] Members can start from symptoms rather than a diagnosis and are routed to a program, another program, or traditional care. Detailed screen flow: not found in public sources.
**Clinical workflows.** [Observed — same] Clinicians oversee the AI specialist (Phoenix) within protocols and make the clinical decisions; they join the same conversation as the AI.
**Scheduling.** Not found in public sources for members; [Observed — same] the platform can guide members to outside providers they can book.
**Treatment plan management.** [Observed — same] Care is personalized within governed clinical protocols and adapts to sleep, schedule and behavior changes.
**Engagement.** [Observed — https://apps.apple.com/app/id1468523447] Daily short sessions and education lessons.
**Remote monitoring.** [Observed — https://sword.com/solutions/ai-care-platform] With member permission, wearables, calendars and behavior signals feed real-time adjustments. [Observed — App Store] Motion tracking; reviewers report sensors sometimes fail to track.
**AI.** [Observed — https://sword.com/solutions/ai-care-platform] Phoenix gives 24/7 support in one continuing conversation with retained context. [Observed — https://swordhealth.com/newsroom/introducing-sword-s-ai-care-platform] The page names Mind but gives few details.
**Privacy/trust.** [Observed — https://sword.com/solutions/ai-care-platform] Data use depends on member permission; links to a Trust Center, HIPAA and consumer-health-data notices, telehealth consent. [Observed — App Store] The app declares itself a regulated medical device in the US; privacy labels list health and fitness data linked to the user. Reviewers raise concerns about recording images/video (reviewer reports, not verified).
**Navigation.** Not found in public sources.
**Visual design.** Not assessed.
**Accessibility.** [Observed — https://apps.apple.com/app/id1468523447] Reviewers complain that text is hard to read because the app ignores system font and display settings (user reviews, not verified). Languages: English, French, Portuguese, Spanish.
**Gaps.** [Observed — App Store reviews] Sensor reliability, support response time, font scaling. [Assumption] Human-AI handoff cues are pitched but how a patient sees "who is talking" is not public.

### 1.3 Omada Health

**Positioning.** [Observed — https://www.omadahealth.com/for-organizations] Virtual care between doctor visits aimed at lasting behavior change and lower cost; multi-condition.
**Target users.** [Observed — same] Employers, health plans, consultants, health systems; individuals typically enroll through a sponsor.
**Core functionality.** [Observed — same] Prediabetes, diabetes, hypertension, cholesterol, GLP-1 companion care, MSK, behavioral health tools. App plus connected devices; no-cost CGM sensors with government-payer exclusions.
**Onboarding.** Not found in public sources (entry points are eligibility check, demo, sales).
**Clinical workflows.** [Observed — same] Care teams plus contracted clinical partners (Physera PT group named).
**Scheduling, treatment plan management, patient engagement, navigation, visual design.** Not found in public sources on the page read.
**Remote monitoring.** [Observed — same] Connected devices and CGM.
**AI.** Not found on that page.
**Privacy/trust.** [Observed — same] NCQA population-health accreditation (diabetes programs) and URAC telehealth accreditation (MSK) are listed. Consent flows: not found.
**Accessibility.** Not found in public sources.
**Gaps.** [Assumption] Public material says little about clinician-side tooling or explainable AI; I did not research Omada beyond one organization page and search results.

### 1.4 Maven Clinic

**Positioning.** [Observed — https://www.mavenclinic.com/maven-enrollment/enroll-today] Virtual support for pregnancy, postpartum and family health (search listing and enrollment page; details limited). [Observed — https://support.mavenclinic.com/hc/en-us/articles/34228933931923-Getting-Started-with-Maven] Employer/plan-covered; non-eligible users can pay a small per-appointment fee.
**Target users.** Members of sponsoring employers/plans; also self-pay appointments (same help article).
**Core functionality / navigation.** [Observed — help article] Navigation labels include My Care (book virtual appointments, view care team), Library (articles, on-demand classes, live events) and an Assistant for benefits.
**Onboarding.** [Observed — help article] New members start with the Assistant to learn their benefits; a Care Advocate orients members and coordinates around goals and history.
**Scheduling.** [Observed — help article] Same-day virtual appointments from My Care.
**Messaging.** [Observed — help article] Direct messages to providers and to the Care Advocate; availability visible.
**Privacy/trust.** The help article does not cover privacy; not found on that page.
**Clinical workflows, treatment plans, remote monitoring, AI, accessibility, visual design.** Not found in public sources I read.
**Gaps.** [Assumption] Condition domain differs from rehab; use mainly as a model for an advocate/concierge role and benefits-first onboarding.

---

## 2. Patient apps sold through clinicians

### 2.1 MedBridge (Medbridge GO plus HEP/RTM)

**Positioning.** [Observed — https://www.medbridge.com/enterprise/remote-therapeutic-monitoring-solution] All-in-one platform that adds engagement and RTM revenue without separate point solutions.
**Target users.** [Observed — same] Rehab clinics running RTM (case-study examples named on the page); patients use Medbridge GO. Health-system targeting: listed in search results only, page not read.
**Patient app (Medbridge GO).** [Observed — https://www.medbridge.com/enterprise/medbridge_go] Exercises in short daily doses, activity calendar, custom push reminders plus inactivity reminders, looping demo videos with timers, playlists, in-app messaging to provider/care team, post-session pain ratings and "too easy/too hard" surveys. Accessibility features: not stated on that page.
**Provider tools.** [Observed — https://www.medbridge.com/l/home-exercise-program-builder] Drag-and-drop HEP builder, library of 7,000+ video exercises, 100+ education resources, delivery by text/email/print, outcomes library (PROMIS and others), one-click EMR documentation.
**Remote monitoring.** [Observed — RTM page] Patient dashboard with activity, feedback and motion-capture reports; RTM-only alerts for outreach; automatic provider-time timer; billing-code detail views (98975, 98977, 98980, 98981); three service tiers from self-managed to fully managed.
**Engagement/AI.** [Observed — RTM page] Guided Pathways uses behavioral science and AI for adaptive programs; streak tracker and goals shown in the patient app.
**Treatment plan management.** [Observed — RTM page] Programs editable from patient feedback and progress.
**Scheduling.** Not found in public sources.
**Privacy.** [Observed — HEP page] HIPAA-compliant patient portal mentioned.
**Gaps.** [Assumption] Strong on adherence and billing, but patient-facing explanations of why a program changed are not described.

### 2.2 PhysiApp (Physitrack)

**Positioning.** [Observed — https://www.physitrack.com/en-gb] Remote patient engagement and telehealth: home exercise, outcome tracking, video consults.
**Target users.** [Observed — same] PTs and rehab clinicians from solo practices to enterprise; segments include private practice, occupational health, hospitals, sports, research.
**Patient app.** [Observed — same] Video-guided programs, session and discomfort logging, gamification, two-way messaging, video consults, PROMs; free for patients. Ratings quoted on the page are inconsistent (4.5 vs 4.9).
**Provider tools.** [Observed — same] Library of 18,000+ videos, 15+ languages, cohort outcome dashboards (PhysiData), integrations (Epic, Jane, Raintree, DrChrono and others), AI exercise search, AI-powered EMR/PMS with scribe (listed as live), motion capture "coming soon" (counts reps without recording video, per the page).
**Reminders.** Not found on that page.
**Privacy/trust.** [Observed — same] Links to a Trust and Security Center; no named certifications on the page.
**Onboarding, navigation, visual design, accessibility.** Not found in public sources.
**Gaps.** [Assumption] Wide library and integrations; patient-side explanation of clinical reasoning not documented.

---

## 3. Provider-facing rehab software

### 3.1 SPRY

**Positioning.** [Observed — https://www.spryhealth.ai/blog/sprys-pt-emr-feature-breakdown] PT-focused EMR with built-in AI documentation, billing and patient portal.
**Core functionality.** [Observed — same] Color-coded visual calendar with automated text/email reminders; smart charting for SOAP fields; dedicated HEP feature with remote monitoring of engagement; patient portal for scheduling, digital intake and invoices; integrated RCM; reporting; MIPS tracking and co-sign workflows; kiosk check-in.
**AI.** [Observed — https://www.spryhealth.ai/agentic-scribe] Scribe runs inside the EMR, pulls prior notes and plan-of-care context before the visit, drafts into structured fields, supports plain-language edits across sections, and flags body-part mismatches, missing details, conflicting measurements and documentation gaps before sign-off. Clinicians review, edit and sign.
**Privacy/trust.** [Observed — same] Mentions HIPAA, a BAA and CHPL certification; details linked, not described.
**Telehealth.** Not mentioned on the feature page read.
**Onboarding (patient), navigation, visual design, accessibility.** Not found in public sources.
**Gaps.** [Assumption] Pre-sign-off flagging is a strong trust pattern; patient-facing app depth is unclear from public pages.

### 3.2 WebPT

**Positioning.** [Observed — https://www.webpt.com/legal/ai-company-overview] Rehab-specific SaaS for outpatient PT/OT/SLP covering clinical, financial, operational and growth needs.
**Core functionality.** [Observed — same] EMR with templates and outcomes tracking, RCM, front-office tools (digital intake, scheduling, benefits verification, referrals), HEP and virtual visits, outcome measures, marketing tools, MIPS reporting.
**AI.** [Observed — same] Voice-to-text structured notes, real-time documentation completeness feedback, CPT coding guidance, a chatbot, and an AI platform named Aera; the page says AI supports and does not replace clinical judgment.
**Privacy/trust.** [Observed — same] HIPAA-compliant handling, SOC-aligned controls, role-based permissions.
**Patient app, onboarding, navigation, accessibility, visual design.** Not found in public sources I read.
**Gaps.** [Assumption] Breadth over depth; remote patient experience beyond HEP and virtual visits is not described.

### 3.3 Headway (provider-facing)

**Positioning.** [Observed — https://headway.co/for-providers] Free all-in-one platform for therapists and psychiatrists to take insurance: credentialing, claims, scheduling, notes, billing, telehealth.
**Provider tools.** [Observed — same] Multi-state credentialing (as little as 30 days), eligibility checks, enhanced rates paid bi-weekly, scheduling and messaging in a free EHR.
**Patient side.** Not found in the provider pages I read (the pages do not describe patient features).
**AI.** None mentioned on those pages. [Observed — Headway job posting https://job-boards.greenhouse.io/headway/jobs/5844461004] design roles use AI prototyping tools.
**Privacy.** [Observed — same] HIPAA compliance listed without detail.
**Admin/group practice design.** [Observed — job posting above] Owners and admins as primary users, bulk workflows, role-based views, multi-provider management.
**Gaps.** [Assumption] Not a rehab product; relevant for admin and role-based UX only.

---

## 4. Access marketplaces

### 4.1 Zocdoc

**Positioning.** [Observed — https://www.zocdoc.com/about/ai-llm-info/] Healthcare access infrastructure with 250,000+ providers.
**Patient flow.** [Observed — same] Search by location, specialty, insurance, availability, symptom or procedure; compare profiles, verified reviews and in-network status; book open slots at any hour; online intake and reminders; in-person and video visits.
**Filters/reviews.** [Observed — same] Advanced filters; reviews only from patients who attended.
**Insurance.** [Observed — same] In-network checks; about 20,000 plans claimed.
**Provider tools.** [Observed — same] Appointment management, eligibility checks, digital intake, 175+ EHR integrations, public API.
**AI.** [Observed — same] Zo voice assistant for phone scheduling (vendor claims up to 70% of scheduling calls handled).
**Privacy.** [Observed — same] States HIPAA adherence; never asks for payment by phone or email.
**Messaging.** General-purpose messaging not described on the page.
**Accessibility, visual design, navigation.** Not found in public sources.
**Gaps.** [Assumption] Booking-centric; no longitudinal plan or progress.

---

## 5. Clinical AI documentation

### 5.1 Abridge

**Positioning.** [Observed — https://www.abridge.com] An intelligence layer across health systems, payers and life sciences, supporting care before, during and after the visit.
**Target users.** [Observed — same] Clinicians across 40+ specialties, nurses, revenue cycle and IT teams.
**Core functionality.** [Observed — same] Ambient note capture, pre-visit drafting from existing context, mid-encounter decision support and care-gap flags, post-visit coding and patient summaries for review.
**Trust pattern.** [Observed — https://support.abridge.com/hc/en-us/articles/30235128433811-Verify-a-Note-With-Linked-Evidence] Selecting note text highlights the matching transcript passage and lets the clinician play the original audio. This is the clearest public example of source-linked AI verification in this set.
**Privacy/security.** [Observed — https://www.abridge.com] Marketed as enterprise-grade with a confabulation-reduction whitepaper; no certifications named on that page.
**EHR integration.** Not described on the page read.
**Patient-facing.** [Observed — same] Patient summaries mentioned for review and follow-up; patient app UX not found.
**Visual design, accessibility.** Not found.

### 5.2 Commure

**Positioning/target.** [Observed — https://www.commure.com/solutions/ambient-ai] Ambient AI for clinicians in 25+ specialties across ambulatory and enterprise.
**Core functionality.** [Observed — same] Specialty-specific notes, multi-speaker recognition, assistant that summarizes history and drafts care plans and after-visit summaries, real-time gap and billing prompts, macros, dictation across 60+ EHRs.
**Human-in-the-loop tiers.** [Observed — same] Self-service, expert-edited ("Assist"), live-supported, and autonomous coding tiers. The page does not describe a clinician review step for the base tier.
**Privacy, patient-facing, accessibility, visual design.** Not found.

---

## 6. Developer infrastructure

### 6.1 Medplum

**Positioning/target.** [Observed — https://medplum.com] Open-source (Apache 2.0) developer platform for building healthcare software.
**Core building blocks.** [Observed — same] FHIR server, prebuilt apps, Bots for automation, auth (OAuth2, MFA, external IdP), SMART App Launch and scopes.
**Care and scheduling.** [Observed — same, https://www.medplum.com/products] Tasks and work queues, care plans and goals, referrals, messaging, handoff/escalation, scheduling operations (availability definition in beta), React scheduling components.
**Trust.** [Observed — https://www.medplum.com/products] Each read, write and login recorded as a FHIR AuditEvent; access policies at resource, compartment and field levels; consent covered under intake.
**Compliance claims.** [Observed — https://medplum.com] HIPAA and SOC 2 listed as built in (vendor claim).
**Gaps/relevance.** [Assumption] CarePath should align its data model with these FHIR resources (CarePlan, Appointment, Observation, AuditEvent, Consent, Task) and not claim HIPAA compliance.

---

## Comparison matrix

Legend: Y = observed in a cited public source; P = partial/described only briefly; NF = not found in public sources read; N/A = not applicable to the product.

| Dimension | Hinge | Sword | Omada | Maven | MedBridge | PhysiApp | SPRY | WebPT | Headway | Zocdoc | Abridge | Commure | Medplum |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Patient app | Y | Y | Y | Y | Y | Y | P (portal) | NF | NF | Y | NF | NF | N/A (build) |
| Clinician-assigned exercise plan | Y | Y | NF | NF | Y | Y | Y | Y | N/A | N/A | N/A | N/A | N/A |
| Real-time movement feedback | Y | Y | NF | NF | P (motion-capture reports) | P (coming soon) | NF | NF | N/A | N/A | N/A | N/A | N/A |
| Scheduling | Y | NF | NF | Y | NF | P (video consults) | Y | Y | Y | Y | N/A | N/A | Y (components) |
| Secure messaging | Y | Y | NF | Y | Y | Y | NF | NF | Y | NF | N/A | N/A | Y |
| Pain/symptom logging | NF | NF | NF | NF | Y | Y | NF | NF | N/A | N/A | N/A | N/A | N/A |
| PROMs/outcomes | NF | NF | NF | NF | Y | Y | NF | Y | N/A | N/A | N/A | N/A | N/A |
| RPM / wearable | Y (Enso, motion) | Y | Y (CGM) | NF | Y (RTM) | P | P | NF | N/A | N/A | N/A | N/A | N/A |
| AI assistant to patient | P (Robin) | Y (Phoenix) | NF | NF | P (Pathways) | NF | NF | NF | NF | Y (phone, Zo) | NF | NF | N/A |
| AI documentation for clinicians | NF | NF | NF | NF | NF | Y | Y | Y | NF | N/A | Y | Y | N/A |
| Source-linked AI verification | NF | NF | NF | NF | NF | NF | P (pre-sign-off flags) | P (completeness feedback) | NF | N/A | Y (linked evidence) | NF | N/A |
| Clinician sign-off before final | NF | P (oversight) | NF | NF | P (sign-off in RTM billing tier) | NF | Y | NF | NF | N/A | NF | P (tier-dependent) | N/A |
| Admin/billing tooling | NF | NF | NF | NF | Y (RTM billing) | NF | Y | Y | Y | Y | Y | Y | P |
| Audit/role-based access | NF | NF | NF | NF | NF | NF | P (co-sign) | Y (role-based) | NF | NF | NF | NF | Y |
| Named accreditation/compliance | HIPAA notice | Trust Center | NCQA, URAC | NF | HIPAA portal | NF named | HIPAA, BAA, CHPL | HIPAA, SOC-aligned | HIPAA | HIPAA | NF named | NF | HIPAA, SOC 2 (vendor) |
| Accessibility stated | NF | Reviews negative on text scaling | NF | NF | NF | NF | NF | NF | NF | NF | NF | NF | NF |

---

## Patterns to adopt, avoid, and gaps to exploit

### Adopt
1. **Short daily dose with a clear "today" view.** [Observed — Medbridge GO, Sword App Store, Hinge] Daily sessions of roughly 10-15 minutes, calendar, streaks. CarePath: patient Today screen with one primary action.
2. **Post-session pain and difficulty rating that feeds the clinician.** [Observed — Medbridge GO, PhysiApp] CarePath: required-light pain/effort check after each session, tied to FHIR Observation.
3. **Triage by symptom, not diagnosis.** [Observed — Sword] CarePath intake should start with plain-language symptoms.
4. **Care team visible with message and availability.** [Observed — Maven, Hinge] CarePath: care-team card with last-seen/response expectations.
5. **Source-linked AI output.** [Observed — Abridge linked evidence] CarePath AI summaries should link each statement to the patient-reported entries or Observations it came from.
6. **Pre-sign-off AI checks plus mandatory clinician sign-off.** [Observed — SPRY] CarePath: AI drafts are never final; flag conflicts and missing data before sign-off.
7. **RTM-style needs-attention queue.** [Observed — Medbridge RTM] CarePath clinician dashboard with ranked "needs attention" list and reasons.
8. **Audit events and fine-grained access.** [Observed — Medplum] Align CarePath audit log and roles with FHIR AuditEvent and access policies.
9. **Role-based admin views and bulk workflows.** [Observed — Headway posting] CarePath coordinator console.

### Avoid
1. **Ignoring system text size.** [Observed — Sword App Store reviews, unverified] Support Dynamic Type and browser zoom to WCAG 2.2 AA.
2. **Unlabelled assistants.** [Observed — Hinge pages do not label Robin as AI] Always label AI and show who (human or AI) wrote a message.
3. **Hiding review steps by tier.** [Observed — Commure base tier has no described review step] Always require clinician review of AI content.
4. **Unverified outcome claims in the UI.** Vendors cite figures without public methodology. CarePath should show only synthetic-data demos and state that.
5. **Camera-dependent only exercise tracking.** [Assumption, based on Sword reviews and Hinge lighting requirements] Provide a no-camera path.
6. **Claiming HIPAA compliance.** Competitors state it as a vendor claim; CarePath must not (per brief).

### Gaps to exploit
1. **Patient-readable "why did my plan change?"** Not found in any public source reviewed. [Assumption: a gap in public material, not proof of absence.]
2. **Visible confidence and uncertainty in AI summaries for clinicians** combined with source links; only Abridge shows linked evidence and it is documentation-focused, not progress-review focused.
3. **A single product spanning patient app, clinician review queue and coordinator console** on an open FHIR model. Hinge/Sword are patient-led, SPRY/WebPT clinician-led, MedBridge/PhysiApp straddle, none documents all three roles with shared FHIR data publicly.
4. **Documented accessibility.** None of the vendors reviewed publish accessibility detail on the pages read; CarePath can publish a WCAG 2.2 AA conformance statement and test notes.
5. **Health-literacy support and low-vision/motor-limited paths** in guided exercise (no camera, large targets, audio cues). Not found in competitor public sources.
6. **Consent and sharing controls** visible in patient settings (who sees what, AI use opt-out). Public pages mention notices but not in-product controls.

## Source list (all accessed 2026-11-19)

- https://www.hingehealth.com/how-it-works/experience
- https://www.hingehealth.com/how-it-works/care
- https://www.hingehealth.com/for-individuals/
- https://www.hingehealth.com/product/enso
- https://help.hingehealth.com/en/support/solutions/articles/155000002588-how-does-the-program-work-
- https://sword.com/solutions/ai-care-platform
- https://swordhealth.com/newsroom/introducing-sword-s-ai-care-platform
- https://apps.apple.com/app/id1468523447
- https://www.omadahealth.com/for-organizations
- https://www.mavenclinic.com/maven-enrollment/enroll-today
- https://support.mavenclinic.com/hc/en-us/articles/34228933931923-Getting-Started-with-Maven
- https://www.medbridge.com/enterprise/remote-therapeutic-monitoring-solution
- https://www.medbridge.com/l/home-exercise-program-builder
- https://www.medbridge.com/enterprise/medbridge_go
- https://www.physitrack.com/en-gb
- https://www.spryhealth.ai/blog/sprys-pt-emr-feature-breakdown
- https://www.spryhealth.ai/agentic-scribe
- https://www.webpt.com/legal/ai-company-overview
- https://headway.co/for-providers
- https://headway.co/resources/how-headway-works-with-insurance
- https://www.zocdoc.com/about/ai-llm-info/
- https://www.abridge.com
- https://support.abridge.com/hc/en-us/articles/30235128433811-Verify-a-Note-With-Linked-Evidence
- https://www.commure.com/solutions/ambient-ai
- https://medplum.com
- https://www.medplum.com/products
