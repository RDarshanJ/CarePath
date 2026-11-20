/**
 * Encounters (visits that took place), clinician notes with versions and amendments, the AI
 * generations behind some drafts, and AI progress summaries. All text is synthetic.
 */
import { MIN, iso, type ApptInfo, type Ctx, type PatientInfo } from "./ctx.js";
import { approvalRow, seedNoteDraft } from "./ai.js";

const typeInfo: Record<ApptInfo["type"], readonly [string, string]> = {
  initial_evaluation: ["PT-INIT-EVAL", "Physical therapy initial evaluation"],
  follow_up: ["PT-FOLLOW-UP", "Physical therapy follow-up visit"],
  video_follow_up: ["PT-VIDEO-FOLLOW-UP", "Physical therapy video follow-up"],
};

function facts(p: PatientInfo, atMs: number) {
  const twoWeeks = 14 * 86_400_000;
  const sessions = p.sessions.filter(
    (s) => s.status === "completed" && s.startedAtMs < atMs && s.startedAtMs >= atMs - twoWeeks,
  ).length;
  const before = p.checkIns.filter((c) => c.submittedAtMs < atMs);
  const pain =
    before.length > 0 ? (before[before.length - 1] as { painScore: number }).painScore : null;
  const version =
    [...p.versions].reverse().find((v) => v.publishedAtMs <= atMs) ?? p.versions[0] ?? null;
  return { sessions, pain, version };
}

function soap(p: PatientInfo, atMs: number, visitPain: number, rom: number) {
  const f = facts(p, atMs);
  return {
    subjective: `Patient reports ${f.sessions} home sessions in the past two weeks.${f.pain !== null ? ` Most recent reported pain ${f.pain} of 10.` : ""} Area of concern: ${p.regimen.area}.`,
    objective: `Plan version ${f.version?.number ?? 1} with ${f.version?.items.length ?? 0} exercises. At the visit: pain ${visitPain} of 10, ${p.regimen.area} range of movement ${rom} degrees (synthetic values).`,
    assessment:
      "Participation matches the plan. Synthetic example note for demonstration, not a clinical assessment.",
    plan: "Continue the current plan and review at the next visit.",
  };
}

function transcript(p: PatientInfo, atMs: number, rom: number): string {
  const f = facts(p, atMs);
  return [
    `Therapist: Hello ${p.givenName}, how have the exercises been going?`,
    `Patient: I have done ${f.sessions} sessions in the last two weeks.${f.pain !== null ? ` My pain is usually around ${f.pain} out of 10.` : ""}`,
    "Therapist: Did any exercise feel worse than before?",
    `Patient: No, the ${p.regimen.area} exercises felt about the same.`,
    `Therapist: I measured ${p.regimen.area} range of movement at ${rom} degrees today.`,
    "Therapist: Good. We will keep the current plan, and I will leave a note for you on your Today screen.",
    "Patient: Okay, thank you.",
    "(Synthetic transcript for demonstration.)",
  ].join("\n");
}

export function buildDocumentation(ctx: Ctx): void {
  const { t, profile } = ctx;
  const rng = ctx.rng.fork("documentation");

  // ---- encounters ---------------------------------------------------------------------
  const completed = ctx.appointments.filter(
    (a) => a.status === "completed" && a.endMs < ctx.anchorMs,
  );
  const chosen = rng
    .shuffle(completed)
    .slice(0, profile.encounters)
    .sort((a, b) => a.startMs - b.startMs);
  const signedNoteIds: {
    noteId: string;
    authorUserId: string;
    versionCount: number;
    at: number;
  }[] = [];
  const noteCurrent: Record<string, unknown>[] = [];
  const noteSigned: Record<string, unknown>[] = [];
  const amendRows: Record<string, unknown>[] = [];
  const amendCurrent: Record<string, unknown>[] = [];

  let aiDrafts = 0;
  let amendments = 0;
  let noteIndex = -1;
  for (const a of chosen) {
    noteIndex += 1;
    const p = a.patient;
    const th = a.therapist;
    const [typeCode, typeDisplay] = typeInfo[a.type];
    const encounterId = ctx.id("encounter", a.id);
    const f = facts(p, a.startMs);
    const visitPain = Math.max(0, Math.min(10, (f.pain ?? 4) + rng.int(-1, 1)));
    const rom = rng.int(70, 150);
    const transcriptText = transcript(p, a.startMs, rom);
    t.Encounter.push({
      id: encounterId,
      organizationId: p.org.id,
      patientId: p.id,
      practitionerId: th.practitionerId,
      appointmentId: a.id,
      class: a.type === "video_follow_up" ? "VR" : "AMB",
      typeCode,
      typeDisplay,
      status: "finished",
      startedAt: iso(a.startMs),
      endedAt: iso(a.endMs),
      transcript: transcriptText,
      createdAt: iso(a.startMs),
      updatedAt: iso(a.endMs),
    });
    t.Observation.push(
      {
        id: ctx.id("observation", `${encounterId}/pain`),
        organizationId: p.org.id,
        patientId: p.id,
        encounterId,
        checkInId: null,
        sessionId: null,
        status: "final",
        category: "survey",
        codeSystem: "http://loinc.org",
        code: "72514-3",
        display: "Pain severity - 0-10 verbal numeric rating [Score] - Reported",
        valueQuantity: visitPain,
        valueUnit: "{score}",
        valueString: null,
        dataAbsentReason: null,
        performerType: "practitioner",
        performerPractitionerId: th.practitionerId,
        effectiveAt: iso(a.startMs + 10 * MIN),
        recordedAt: iso(a.startMs + 12 * MIN),
      },
      {
        id: ctx.id("observation", `${encounterId}/rom`),
        organizationId: p.org.id,
        patientId: p.id,
        encounterId,
        checkInId: null,
        sessionId: null,
        status: "final",
        category: "exam",
        codeSystem: "urn:carepath:observation-code",
        code: "range-of-movement",
        display: `Range of movement, ${p.regimen.area} (synthetic)`,
        valueQuantity: rom,
        valueUnit: "deg",
        valueString: null,
        dataAbsentReason: null,
        performerType: "practitioner",
        performerPractitionerId: th.practitionerId,
        effectiveAt: iso(a.startMs + 20 * MIN),
        recordedAt: iso(a.startMs + 22 * MIN),
      },
    );

    // ---- note ---------------------------------------------------------------------------
    const noteId = ctx.id("note", encounterId);
    const created = a.endMs + 20 * MIN;
    const content = soap(p, a.startMs, visitPain, rom);
    const fromAi = p.aiConsent && (aiDrafts === 0 || rng.chance(0.55));
    // Every third note stays a draft; the first signed note always gets an amendment.
    const sign = noteIndex % 3 !== 0;
    t.ClinicalNote.push({
      id: noteId,
      organizationId: p.org.id,
      patientId: p.id,
      encounterId,
      authorPractitionerId: th.practitionerId,
      noteType: a.type === "initial_evaluation" ? "initial_evaluation" : "progress_note",
      status: "draft",
      currentVersionId: null,
      signedAt: null,
      signedByPractitionerId: null,
      enteredInErrorAt: null,
      enteredInErrorReason: null,
      enteredInErrorByUserId: null,
      createdAt: iso(created),
      updatedAt: iso(created),
    });
    let versionNumber = 0;
    const addVersion = (
      source: "clinician" | "ai_draft",
      text: typeof content,
      atMs: number,
      aiGenerationId: string | null,
      amendment: string | null,
    ): string => {
      versionNumber += 1;
      const id = ctx.id("note-version", `${noteId}/${versionNumber}`);
      const row = {
        id,
        organizationId: p.org.id,
        noteId,
        versionNumber,
        ...text,
        source,
        aiGenerationId,
        isAmendment: amendment !== null,
        amendmentReason: amendment,
        createdByUserId: th.userId,
        createdAt: iso(atMs),
      };
      if (amendment !== null) amendRows.push(row);
      else t.ClinicalNoteVersion.push(row);
      return id;
    };
    let lastVersionId: string;
    let lastAt = created;
    if (fromAi) {
      // The demo provider's draft from this visit's synthetic transcript, approved by the
      // therapist (creating the note's first version), then rewritten by the therapist.
      aiDrafts += 1;
      const gen = seedNoteDraft(
        ctx,
        p,
        th.userId,
        { id: encounterId, type: a.type },
        transcriptText,
        created,
      );
      t.AIGeneration.push(gen.row);
      t.AIReview.push(approvalRow(ctx, p, gen.id, th.userId, gen.draft, noteId, created + 2 * MIN));
      addVersion("ai_draft", gen.soap, created + 2 * MIN, gen.id, null);
      lastAt = created + 8 * MIN;
      const edited = {
        ...content,
        plan: `${content.plan} Therapist edit: confirmed with the patient at the visit.`,
      };
      lastVersionId = addVersion("clinician", edited, lastAt, null, null);
    } else {
      lastVersionId = addVersion("clinician", content, created + 2 * MIN, null, null);
      lastAt = created + 2 * MIN;
    }
    noteCurrent.push({ id: noteId, currentVersionId: lastVersionId, updatedAt: iso(lastAt) });
    if (sign) {
      const signedAt = lastAt + 10 * MIN;
      noteSigned.push({
        id: noteId,
        status: "signed",
        signedAt: iso(signedAt),
        signedByPractitionerId: th.practitionerId,
        updatedAt: iso(signedAt),
      });
      signedNoteIds.push({
        noteId,
        authorUserId: th.userId,
        versionCount: versionNumber,
        at: signedAt,
      });
      if (amendments === 0 || rng.chance(0.2)) {
        amendments += 1;
        const amendedAt = signedAt + 26 * 3_600_000;
        const amended = {
          ...content,
          subjective: `${content.subjective} Amended to add the area of concern.`,
        };
        const id = addVersion(
          "clinician",
          amended,
          amendedAt,
          null,
          "Corrected the subjective section after the visit.",
        );
        amendCurrent.push({ id: noteId, currentVersionId: id, updatedAt: iso(amendedAt) });
      }
      ctx.t.AuditEvent.push({
        id: ctx.id("audit", `note-sign/${noteId}`),
        organizationId: p.org.id,
        actorUserId: th.userId,
        actorRole: "physical_therapist",
        actorType: "user",
        action: "U",
        eventName: "note.sign",
        outcome: "success",
        resourceType: "ClinicalNote",
        resourceId: noteId,
        patientId: p.id,
        purposeOfUse: "treatment",
        requestId: `seed-${noteId.slice(0, 8)}`,
        sourceIpHash: null,
        detailCode: null,
        metadata: {},
        occurredAt: iso(signedAt),
      });
    }
  }
  // WP 5.2, Scenario F: patient.demo's visit two days before the anchor, with therapist.demo,
  // a synthetic transcript and no note yet, so a SOAP draft can be requested from it.
  const demo = ctx.patients.find((p) => p.persona === "demo");
  if (demo?.therapist && demo.aiConsent) {
    const startMs = ctx.anchorMs - 2 * 86_400_000 - 3 * 3_600_000;
    t.Encounter.push({
      id: ctx.id("encounter", `${demo.id}/scenario-f`),
      organizationId: demo.org.id,
      patientId: demo.id,
      practitionerId: demo.therapist.practitionerId,
      appointmentId: null,
      class: "AMB",
      typeCode: typeInfo.follow_up[0],
      typeDisplay: typeInfo.follow_up[1],
      status: "finished",
      startedAt: iso(startMs),
      endedAt: iso(startMs + 45 * MIN),
      transcript: transcript(demo, startMs, 112),
      createdAt: iso(startMs),
      updatedAt: iso(startMs + 45 * MIN),
    });
  }
  ctx.post.push({ kind: "update", table: "ClinicalNote", rows: noteCurrent });
  if (noteSigned.length) ctx.post.push({ kind: "update", table: "ClinicalNote", rows: noteSigned });
  if (amendRows.length) {
    ctx.post.push({ kind: "insert", table: "ClinicalNoteVersion", rows: amendRows });
    ctx.post.push({ kind: "update", table: "ClinicalNote", rows: amendCurrent });
  }
}
