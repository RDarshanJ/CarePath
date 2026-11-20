/**
 * Review rules and tasks, notifications, background jobs (including one that failed for good)
 * and audit events. Tasks are derived from the generated check-ins, schedules and intake rows,
 * so each explanation and evidence reference matches data that exists.
 */
import { intakeSteps } from "@carepath/shared/contracts";
import type { Tables } from "./types.js";
import { D, H, MIN, iso, type Ctx, type PatientInfo, type VersionInfo } from "./ctx.js";
import type { UnreadMessage } from "./comms.js";

const rules = [
  {
    key: "reported_pain",
    name: "Reported pain",
    description: "Creates a task when a check-in reports pain at or above the threshold.",
    priority: 80,
    params: { threshold: 7 },
  },
  {
    key: "missed_sessions",
    name: "Missed sessions",
    description: "Creates a task when assigned sessions missed in 7 days reach the threshold.",
    priority: 50,
    params: { threshold: 2, windowDays: 7 },
  },
  {
    key: "unreviewed_checkin",
    name: "Unreviewed check-in",
    description:
      "Creates a task when a check-in has not been opened by the care team within the threshold hours.",
    priority: 60,
    params: { thresholdHours: 48 },
  },
  {
    key: "upcoming_followup",
    name: "Upcoming follow-up",
    description: "Creates a task when a follow-up visit is within the threshold hours.",
    priority: 30,
    params: { thresholdHours: 48 },
  },
  {
    key: "missing_intake",
    name: "Missing intake",
    description:
      "Creates a task when intake stays incomplete for the threshold days after sign-up.",
    priority: 40,
    params: { thresholdDays: 3 },
  },
] as const;

type TaskRow = Tables["ReviewTask"][number];

export function buildOps(ctx: Ctx, unread: UnreadMessage[]): void {
  const { t } = ctx;
  const rng = ctx.rng.fork("ops");
  const created = iso(ctx.anchorMs - (ctx.profile.historyDays + 55) * D);
  let auditSeq = 0;
  const audit = (
    row: Omit<
      Tables["AuditEvent"][number],
      "id" | "requestId" | "sourceIpHash" | "detailCode" | "metadata" | "outcome" | "actorType"
    >,
  ): void => {
    auditSeq += 1;
    t.AuditEvent.push({
      ...row,
      id: ctx.id("audit", `ops/${auditSeq}`),
      actorType: "user",
      outcome: "success",
      requestId: `seed-${String(auditSeq).padStart(6, "0")}`,
      sourceIpHash: null,
      detailCode: null,
      metadata: {},
    });
  };

  // ---- rules ---------------------------------------------------------------------------
  for (const org of ctx.orgs) {
    for (const r of rules) {
      const id = ctx.id("rule", `${org.id}/${r.key}`);
      org.ruleIds[r.key] = id;
      t.ReviewRule.push({
        id,
        organizationId: org.id,
        key: r.key,
        name: r.name,
        description: r.description,
        enabled: true,
        priority: r.priority,
        params: r.params,
        createdAt: created,
        updatedAt: created,
      });
    }
  }

  // ---- tasks ---------------------------------------------------------------------------
  const task = (
    p: PatientInfo,
    ruleKey: string,
    dedupeKey: string,
    explanation: string,
    evidence: unknown[],
    createdMs: number,
    extra: Partial<TaskRow> = {},
  ): void => {
    const rule = rules.find((x) => x.key === ruleKey)!;
    t.ReviewTask.push({
      id: ctx.id("task", `${p.id}/${ruleKey}/${dedupeKey}`),
      organizationId: p.org.id,
      patientId: p.id,
      ruleId: p.org.ruleIds[ruleKey] as string,
      dedupeKey,
      explanation,
      evidence: evidence as never,
      priority: rule.priority,
      status: "open",
      assignedPractitionerId: null,
      dueAt: null,
      resolvedAt: null,
      resolvedByUserId: null,
      resolutionNote: null,
      createdAt: iso(createdMs),
      updatedAt: iso(createdMs),
      ...extra,
    });
  };

  for (const p of ctx.patients) {
    const th = p.therapist;
    if (th) {
      for (const c of p.checkIns) {
        const age = ctx.anchorMs - c.submittedAtMs;
        if (c.painScore >= 7) {
          const evidence = [
            {
              type: "PatientCheckIn",
              id: c.id,
              field: "painScore",
              value: c.painScore,
              threshold: 7,
              unit: "of 10",
            },
          ];
          const text = `Reported pain ${c.painScore} of 10. Clinic rule: 7 or higher.`;
          const base = { dueAt: iso(c.submittedAtMs + 24 * H) };
          if (age <= 5 * D) {
            const inReview = p.persona !== "flare" && rng.chance(0.3);
            if (inReview) {
              const at = Math.min(c.submittedAtMs + rng.int(1, 8) * H, ctx.anchorMs - H);
              c.row.reviewedAt = iso(at);
              c.row.reviewedByUserId = th.userId;
              task(p, "reported_pain", `checkin:${c.id}`, text, evidence, c.submittedAtMs + MIN, {
                ...base,
                status: "in_review",
                assignedPractitionerId: th.practitionerId,
                updatedAt: iso(at),
              });
            } else {
              task(p, "reported_pain", `checkin:${c.id}`, text, evidence, c.submittedAtMs + MIN, {
                ...base,
                assignedPractitionerId:
                  p.persona !== "flare" && rng.chance(0.5) ? th.practitionerId : null,
              });
            }
          } else {
            const resolvedMs = Math.min(c.submittedAtMs + rng.int(2, 30) * H, ctx.anchorMs - H);
            const dismissed = rng.chance(0.25);
            c.row.reviewedAt = iso(resolvedMs);
            c.row.reviewedByUserId = th.userId;
            task(p, "reported_pain", `checkin:${c.id}`, text, evidence, c.submittedAtMs + MIN, {
              ...base,
              status: dismissed ? "dismissed" : "resolved",
              assignedPractitionerId: th.practitionerId,
              resolvedAt: iso(resolvedMs),
              resolvedByUserId: th.userId,
              resolutionNote: dismissed
                ? "Reviewed; no action needed."
                : "Reviewed with the patient by message.",
              updatedAt: iso(resolvedMs),
            });
          }
        } else if (age > 3 * D) {
          const at = c.submittedAtMs + rng.int(1, 30) * H;
          c.row.reviewedAt = iso(at);
          c.row.reviewedByUserId = th.userId;
        } else if (age > 2 * D) {
          const hours = Math.floor(age / H);
          task(
            p,
            "unreviewed_checkin",
            `checkin:${c.id}`,
            `Not reviewed for ${hours} hours. Clinic rule: 48.`,
            [
              {
                type: "PatientCheckIn",
                id: c.id,
                field: "submittedAt",
                value: hours,
                threshold: 48,
                unit: "hours",
              },
            ],
            c.submittedAtMs + 48 * H,
          );
        }
      }

      // Missed sessions in the last 7 days (generic active patients only).
      if (p.status === "active" && p.persona === null && p.versions.length > 0) {
        let scheduled = 0;
        let done = 0;
        let version: VersionInfo | null = null;
        for (let k = -7; k <= -1; k++) {
          const noon = ctx.localMidnight(p.org, k) + 12 * H;
          const v = [...p.versions].reverse().find((x) => x.publishedAtMs <= noon);
          if (!v || !v.days.includes(ctx.weekday(p.org, k))) continue;
          scheduled += 1;
          version = v;
          const day = ctx.localMidnight(p.org, k);
          if (
            p.sessions.some(
              (s) => s.status === "completed" && s.startedAtMs >= day && s.startedAtMs < day + D,
            )
          )
            done += 1;
        }
        const missed = scheduled - done;
        if (missed >= 2 && version) {
          task(
            p,
            "missed_sessions",
            `window:${new Date(ctx.anchorMs).toISOString().slice(0, 10)}`,
            `Missed ${missed} sessions in 7 days. Clinic rule: 2 or more.`,
            [
              {
                type: "CarePlanVersion",
                id: version.id,
                field: "daysOfWeek",
                value: missed,
                threshold: 2,
                unit: "sessions",
              },
            ],
            ctx.anchorMs - rng.int(1, 6) * H,
          );
        }
      }
    }
    if (p.status === "intake_incomplete" && ctx.anchorMs - p.createdAtMs >= 3 * D) {
      const row = t.IntakeAssessment.find((x) => x.patientId === p.id);
      if (row) {
        // Steps before review not yet answered, as the API's missing_intake rule reports them.
        const answered = row.answers as Record<string, unknown>;
        const missing = intakeSteps
          .filter((s) => s !== "review" && answered[s] === undefined)
          .map((s) => s.replace(/_/g, " "))
          .join(", ");
        const days = Math.floor((ctx.anchorMs - p.createdAtMs) / D);
        task(
          p,
          "missing_intake",
          `intake:${row.id}`,
          `Intake incomplete for ${days} days. Missing: ${missing}.`,
          [
            {
              type: "IntakeAssessment",
              id: row.id,
              field: "currentStep",
              value: days,
              threshold: 3,
              unit: "days",
            },
          ],
          ctx.anchorMs - rng.int(1, 6) * H,
        );
      }
    }
  }
  for (const a of ctx.appointments) {
    if (
      a.status === "booked" &&
      a.type !== "initial_evaluation" &&
      a.startMs > ctx.anchorMs &&
      a.startMs - ctx.anchorMs <= 48 * H
    ) {
      const hours = Math.ceil((a.startMs - ctx.anchorMs) / H);
      task(
        a.patient,
        "upcoming_followup",
        `appointment:${a.id}`,
        `Follow-up in ${hours} hours. Clinic rule: within 48.`,
        [
          {
            type: "Appointment",
            id: a.id,
            field: "startsAt",
            value: hours,
            threshold: 48,
            unit: "hours",
          },
        ],
        ctx.anchorMs - 2 * H,
      );
    }
  }

  // ---- notifications -------------------------------------------------------------------
  const notify = (n: {
    org: string;
    userId: string;
    type: Tables["Notification"][number]["type"];
    title: string;
    body: string;
    linkPath: string | null;
    sourceType: string;
    sourceId: string;
    atMs: number;
    read: boolean;
  }): void => {
    t.Notification.push({
      id: ctx.id("notification", `${n.userId}/${n.type}/${n.sourceId}`),
      organizationId: n.org,
      userId: n.userId,
      type: n.type,
      title: n.title,
      body: n.body,
      linkPath: n.linkPath,
      sourceType: n.sourceType,
      sourceId: n.sourceId,
      readAt: n.read ? iso(Math.min(n.atMs + 3 * H, ctx.anchorMs - MIN)) : null,
      createdAt: iso(n.atMs),
    });
  };
  for (const p of ctx.patients) {
    if (!p.userId) continue;
    p.versions.forEach((v, i) => {
      const latest = i === p.versions.length - 1;
      const note = t.CarePlanVersion.find((x) => x.id === v.id)?.changeNoteForPatient ?? null;
      notify({
        org: p.org.id,
        userId: p.userId as string,
        type: "care_plan_published",
        title: v.number === 1 ? "Your care plan is ready" : "Your care plan was updated",
        body: note ?? `Your therapist published "${p.regimen.planTitle}".`,
        linkPath: "/plan",
        sourceType: "CarePlanVersion",
        sourceId: v.id,
        atMs: v.publishedAtMs,
        read: !latest || p.persona !== "demo" ? !latest || rng.chance(0.5) : false,
      });
    });
  }
  for (const a of ctx.appointments) {
    if (
      a.status === "booked" &&
      a.patient.userId &&
      a.startMs >= ctx.anchorMs &&
      a.startMs - ctx.anchorMs <= 3 * D
    ) {
      notify({
        org: a.patient.org.id,
        userId: a.patient.userId,
        type: "appointment_reminder",
        title: "Appointment reminder",
        body: "You have an upcoming appointment. Open Appointments for the time and place.",
        linkPath: "/appointments",
        sourceType: "Appointment",
        sourceId: a.id,
        atMs: Math.max(Date.parse(a.row.createdAt), a.startMs - D),
        read: false,
      });
    }
  }
  for (const u of unread) {
    notify({
      org: u.organizationId,
      userId: u.userId,
      type: "message_received",
      title: `New message from ${u.fromName}`,
      body: "Open Messages to read it.",
      linkPath: `/messages/${u.conversationId}`,
      sourceType: "Message",
      sourceId: u.messageId,
      atMs: u.atMs,
      read: false,
    });
  }
  for (const r of t.ReviewTask) {
    if (r.assignedPractitionerId && (r.status === "open" || r.status === "in_review")) {
      const th = ctx.orgs
        .flatMap((o) => o.therapists)
        .find((x) => x.practitionerId === r.assignedPractitionerId);
      if (th)
        notify({
          org: r.organizationId,
          userId: th.userId,
          type: "review_task_assigned",
          title: "A review task was assigned to you",
          body: r.explanation,
          linkPath: `/queue/${r.id}`,
          sourceType: "ReviewTask",
          sourceId: r.id,
          atMs: Date.parse(r.createdAt) + 5 * MIN,
          read: false,
        });
    }
  }
  const reviewed = new Set(t.AIReview.map((r) => r.generationId));
  for (const g of t.AIGeneration) {
    if (g.kind === "progress_summary" && g.status === "succeeded" && !reviewed.has(g.id)) {
      notify({
        org: g.organizationId,
        userId: g.requestedByUserId,
        type: "ai_draft_ready",
        title: "AI draft ready for review",
        body: "A progress summary draft is waiting for your review.",
        linkPath: `/patients/${g.patientId}`,
        sourceType: "AIGeneration",
        sourceId: g.id,
        atMs: Date.parse(g.createdAt) + 2000,
        read: false,
      });
    }
  }

  // ---- jobs ----------------------------------------------------------------------------
  const job = (
    org: string | null,
    key: string,
    queue: string,
    payload: unknown,
    status: "queued" | "succeeded" | "dead",
    runMs: number,
    extra: Partial<Tables["Job"][number]> = {},
  ): void => {
    t.Job.push({
      id: ctx.id("job", key),
      organizationId: org,
      queue,
      payload: payload as never,
      status,
      attempts: status === "queued" ? 0 : status === "dead" ? 5 : 1,
      maxAttempts: 5,
      runAt: iso(runMs),
      lockedAt: null,
      lockedBy: null,
      lastError: null,
      dedupeKey: key,
      completedAt: status === "succeeded" ? iso(runMs + 2000) : null,
      createdAt: iso(runMs - MIN),
      updatedAt: iso(runMs + 2000),
      ...extra,
    });
  };
  for (const org of ctx.orgs) {
    job(
      org.id,
      `review-rules/${org.id}`,
      "review-rules",
      { rule: "missed_sessions" },
      "succeeded",
      ctx.anchorMs - H,
    );
    const sent = ctx.appointments
      .filter((a) => a.patient.org === org && a.row.reminderSentAt !== null)
      .slice(0, 3);
    for (const a of sent)
      job(
        org.id,
        `reminder-sent/${a.id}`,
        "appointment-reminders",
        { appointmentId: a.id },
        "succeeded",
        Date.parse(a.row.reminderSentAt as string),
      );
    const upcoming = ctx.appointments
      .filter((a) => a.patient.org === org && a.status === "booked" && a.startMs - D > ctx.anchorMs)
      .slice(0, 2);
    for (const a of upcoming)
      job(
        org.id,
        `reminder/${a.id}`,
        "appointment-reminders",
        { appointmentId: a.id },
        "queued",
        a.startMs - D,
      );
  }
  const org0 = ctx.orgs[0]!;
  job(
    org0.id,
    "summary-retry",
    "ai-summary",
    { note: "retry demo" },
    "queued",
    ctx.anchorMs + 10 * MIN,
    { attempts: 2, lastError: "Demo provider timeout after 20000 ms (simulated)." },
  );
  job(
    org0.id,
    "reminder-failed",
    "appointment-reminders",
    { note: "failed demo" },
    "dead",
    ctx.anchorMs - 6 * H,
    {
      lastError: "Simulated delivery adapter error on every attempt (HTTP 503).",
      completedAt: null,
      updatedAt: iso(ctx.anchorMs - 5 * H),
    },
  );

  // ---- audit ---------------------------------------------------------------------------
  for (const p of ctx.patients) {
    p.versions.forEach((v) => {
      if (!p.therapist) return;
      audit({
        organizationId: p.org.id,
        actorUserId: p.therapist.userId,
        actorRole: "physical_therapist",
        action: "C",
        eventName: "careplan.publish",
        resourceType: "CarePlanVersion",
        resourceId: v.id,
        patientId: p.id,
        purposeOfUse: "treatment",
        occurredAt: iso(v.publishedAtMs),
      });
    });
  }
  for (const c of t.Consent) {
    const p = ctx.patients.find((x) => x.id === c.patientId)!;
    audit({
      organizationId: c.organizationId,
      actorUserId: c.capturedByUserId,
      actorRole: p.userId ? "patient" : "care_coordinator",
      action: "C",
      eventName: c.status === "inactive" ? "consent.revoke" : "consent.grant",
      resourceType: "Consent",
      resourceId: c.id,
      patientId: c.patientId,
      purposeOfUse: "patient_access",
      occurredAt: c.revokedAt ?? c.grantedAt,
    });
  }
  for (const u of t.User) {
    if (
      !/^(patient|therapist|coordinator|admin)\.(demo|resume|intake|noai|flare|org2)@/.test(u.email)
    )
      continue;
    const m = t.OrganizationMembership.find((x) => x.userId === u.id)!;
    audit({
      organizationId: m.organizationId,
      actorUserId: u.id,
      actorRole: m.roleKey,
      action: "E",
      eventName: "auth.login",
      resourceType: null,
      resourceId: null,
      patientId: null,
      purposeOfUse: null,
      occurredAt: u.lastLoginAt ?? iso(ctx.anchorMs - 3 * H),
    });
  }
  t.AuditEvent.sort((a, b) =>
    a.occurredAt < b.occurredAt ? -1 : a.occurredAt > b.occurredAt ? 1 : a.id < b.id ? -1 : 1,
  );
}
