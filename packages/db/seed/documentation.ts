/**
 * Encounters (visits that took place), clinician notes with versions and amendments, the AI
 * generations behind some drafts, and AI progress summaries. All text is synthetic.
 */
import { MIN, iso, type ApptInfo, type Ctx, type PatientInfo } from "./ctx.js";
import { aiProviderLabel } from "./data/text.js";

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

function transcript(p: PatientInfo, atMs: number): string {
  const f = facts(p, atMs);
  return [
    `Therapist: Hello ${p.givenName}, how have the exercises been going?`,
    `Patient: I have done ${f.sessions} sessions in the last two weeks.${f.pain !== null ? ` My pain is usually around ${f.pain} out of 10.` : ""}`,
    "Therapist: Did any exercise feel worse than before?",
    `Patient: No, the ${p.regimen.area} exercises felt about the same.`,
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
      transcript: transcript(p, a.startMs),
      createdAt: iso(a.startMs),
      updatedAt: iso(a.endMs),
    });
    const f = facts(p, a.startMs);
    const visitPain = Math.max(0, Math.min(10, (f.pain ?? 4) + rng.int(-1, 1)));
    const rom = rng.int(70, 150);
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
      aiDrafts += 1;
      const genId = ctx.id("ai-generation", `${noteId}/draft`);
      const aiText = {
        ...content,
        assessment:
          "Participation matches the plan. Draft generated from the visit transcript; clinician review required.",
      };
      t.AIGeneration.push({
        id: genId,
        organizationId: p.org.id,
        patientId: p.id,
        kind: "note_draft",
        provider: "demo",
        providerLabel: aiProviderLabel,
        model: null,
        promptKey: "note.soap",
        promptVersion: "1",
        status: "succeeded",
        input: {
          sourceRefs: [{ type: "Encounter", id: encounterId, field: "transcript" }],
          redacted: true,
        },
        output: aiText,
        error: null,
        inputTokens: null,
        outputTokens: null,
        costMicroUsd: null,
        latencyMs: 40,
        unsupportedStatementCount: 0,
        requestedByUserId: th.userId,
        createdAt: iso(created),
        completedAt: iso(created + 1000),
      });
      addVersion("ai_draft", aiText, created + 1000, genId, null);
      lastAt = created + 8 * MIN;
      const edited = {
        ...content,
        plan: `${content.plan} Therapist edit: confirmed with the patient at the visit.`,
      };
      lastVersionId = addVersion("clinician", edited, lastAt, null, null);
      t.AIReview.push({
        id: ctx.id("ai-review", genId),
        organizationId: p.org.id,
        generationId: genId,
        reviewerUserId: th.userId,
        decision: "approved_with_edits",
        editedOutput: edited,
        reason: null,
        createdAt: iso(lastAt),
      });
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
  ctx.post.push({ kind: "update", table: "ClinicalNote", rows: noteCurrent });
  if (noteSigned.length) ctx.post.push({ kind: "update", table: "ClinicalNote", rows: noteSigned });
  if (amendRows.length) {
    ctx.post.push({ kind: "insert", table: "ClinicalNoteVersion", rows: amendRows });
    ctx.post.push({ kind: "update", table: "ClinicalNote", rows: amendCurrent });
  }

  // ---- AI progress summaries ------------------------------------------------------------
  const eligible = ctx.patients.filter(
    (p) => p.status === "active" && p.aiConsent && p.therapist && p.checkIns.length >= 3,
  );
  const wanted = Math.max(2, Math.round(profile.encounters / 2));
  const picks = rng.shuffle(eligible).slice(0, wanted);
  picks.forEach((p, i) => {
    const th = p.therapist!;
    const windowStart = ctx.anchorMs - 14 * 86_400_000;
    const recentSessions = p.sessions.filter(
      (s) => s.status === "completed" && s.startedAtMs >= windowStart,
    );
    const recentCheckIns = p.checkIns.filter((c) => c.submittedAtMs >= windowStart);
    const createdAt = ctx.anchorMs - (i + 1) * 5 * 3_600_000;
    const id = ctx.id("ai-generation", `${p.id}/summary`);
    const base = {
      id,
      organizationId: p.org.id,
      patientId: p.id,
      kind: "progress_summary" as const,
      provider: "demo",
      providerLabel: aiProviderLabel,
      model: null,
      promptKey: "summary.progress",
      promptVersion: "1",
      requestedByUserId: th.userId,
      createdAt: iso(createdAt),
      input: {
        windowDays: 14,
        sourceRefs: [
          ...recentSessions.map((s) => ({ type: "ExerciseSession", id: s.id })),
          ...recentCheckIns.map((c) => ({ type: "PatientCheckIn", id: c.id })),
        ],
      },
      inputTokens: null,
      outputTokens: null,
      costMicroUsd: null,
    };
    if (i === 1) {
      t.AIGeneration.push({
        ...base,
        status: "failed",
        output: null,
        error: "Demo provider timeout after 20000 ms (simulated).",
        latencyMs: 20000,
        unsupportedStatementCount: null,
        completedAt: iso(createdAt + 20_000),
      });
      return;
    }
    const pains = recentCheckIns.map((c) => c.painScore);
    const output = {
      summary: `${recentSessions.length} completed sessions in the last 14 days.`,
      statements: [
        {
          text: `Completed ${recentSessions.length} sessions in the last 14 days.`,
          sourceRefs: recentSessions.map((s) => ({ type: "ExerciseSession", id: s.id })),
        },
        ...(pains.length
          ? [
              {
                text: `Reported pain ranged from ${Math.min(...pains)} to ${Math.max(...pains)} out of 10 (patient-reported).`,
                sourceRefs: recentCheckIns.map((c) => ({ type: "PatientCheckIn", id: c.id })),
              },
            ]
          : []),
      ],
      missingInformation: pains.length ? [] : ["No check-ins in the last 14 days."],
    };
    t.AIGeneration.push({
      ...base,
      status: "succeeded",
      output,
      error: null,
      latencyMs: 35,
      unsupportedStatementCount: 0,
      completedAt: iso(createdAt + 1000),
    });
    if (i !== 0) {
      t.AIReview.push({
        id: ctx.id("ai-review", id),
        organizationId: p.org.id,
        generationId: id,
        reviewerUserId: th.userId,
        decision: "approved",
        editedOutput: null,
        reason: null,
        createdAt: iso(createdAt + 20 * MIN),
      });
    }
  });
}
