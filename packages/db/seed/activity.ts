/**
 * Exercise sessions, per-exercise activity records, patient check-ins and their pain
 * observations. Adherence is a per-patient factor; sessions are kept in order of a deterministic
 * score so a cap on activity records (full profile) lands on an exact count.
 */
import {
  D,
  H,
  MIN,
  iso,
  type AssignmentItem,
  type CheckInInfo,
  type Ctx,
  type PatientInfo,
  type VersionInfo,
} from "./ctx.js";
import { checkInNotes, discomfortNotes, skipReasons } from "./data/text.js";

interface Candidate {
  patient: PatientInfo;
  startMs: number;
  version: VersionInfo;
  score: number;
  forced: "resume" | null;
}

function versionAt(p: PatientInfo, ms: number): VersionInfo | null {
  let found: VersionInfo | null = null;
  for (const v of p.versions) if (v.publishedAtMs <= ms) found = v;
  return found;
}

function activityDurationSeconds(i: AssignmentItem): number {
  const sets = i.sets ?? 1;
  if (i.durationSeconds !== null && i.reps === null)
    return sets * i.durationSeconds + (sets - 1) * i.restSeconds;
  const perSet = (i.reps ?? 1) * 3 + (i.holdSeconds ?? 0) * (i.reps ?? 1);
  return sets * perSet + (sets - 1) * i.restSeconds;
}

export function buildActivity(ctx: Ctx): void {
  const { t, profile } = ctx;

  // ---- candidates ----------------------------------------------------------------------
  const candidates: Candidate[] = [];
  for (const p of ctx.patients) {
    if (p.versions.length === 0) continue;
    const rng = ctx.rng.fork(`candidates/${p.id}`);
    const prefHour = rng.int(6, 20);
    const first = p.versions[0] as VersionInfo;
    const kStart = Math.max(-profile.historyDays, ctx.dayOffsetOf(p.org, first.publishedAtMs));
    const kEnd = p.status === "active" ? -1 : Math.min(-1, ctx.dayOffsetOf(p.org, p.activeEndMs));
    for (let k = kStart; k <= kEnd; k++) {
      const startMs = ctx.localMidnight(p.org, k) + prefHour * H + rng.int(-30, 30) * MIN;
      const u = rng.next();
      if (
        startMs < first.publishedAtMs + H ||
        startMs > Math.min(p.activeEndMs, ctx.anchorMs - 2 * H)
      )
        continue;
      const version = versionAt(p, startMs);
      if (!version || !version.days.includes(ctx.weekday(p.org, k))) continue;
      const score = p.persona ? (u < p.adherence ? -1 + u * 0.001 : 2) : u / p.adherence;
      candidates.push({ patient: p, startMs, version, score, forced: null });
    }
    if (p.persona === "resume") {
      const startMs = ctx.anchorMs - 70 * MIN;
      const version = versionAt(p, startMs);
      if (version) candidates.push({ patient: p, startMs, version, score: -2, forced: "resume" });
    }
  }
  candidates.sort(
    (a, b) => a.score - b.score || a.patient.index - b.patient.index || a.startMs - b.startMs,
  );

  const selected: { c: Candidate; keep: number }[] = [];
  let budget = profile.activityRecords;
  for (const c of candidates) {
    if (c.score >= 1) break;
    const n = c.version.items.length;
    if (budget === null) selected.push({ c, keep: n });
    else {
      if (budget <= 0) break;
      selected.push({ c, keep: Math.min(n, budget) });
      budget -= Math.min(n, budget);
    }
  }
  selected.sort((a, b) => a.c.patient.index - b.c.patient.index || a.c.startMs - b.c.startMs);

  // ---- sessions and activities ---------------------------------------------------------
  const lastPerPatient = new Map<string, number>();
  selected.forEach((s, i) => lastPerPatient.set(s.c.patient.id, i));

  selected.forEach((s, i) => {
    const { patient: p, startMs, version } = s.c;
    const rng = ctx.rng.fork(`session/${p.id}/${startMs}`);
    const sessionId = ctx.id("session", `${p.id}/${startMs}`);
    const items = version.items;
    const n = items.length;
    const truncated = s.keep < n;
    const isLast = lastPerPatient.get(p.id) === i;
    let status: "completed" | "abandoned" | "paused" | "stopped_discomfort" = "completed";
    let doneCount = n; // activities finished before the session stops
    if (s.c.forced === "resume") {
      status = "paused";
      doneCount = Math.min(2, n - 1);
    } else if (truncated) {
      status = "abandoned";
      doneCount = Math.max(0, s.keep - 1);
    } else if (
      isLast &&
      p.status === "active" &&
      p.persona === null &&
      startMs >= ctx.anchorMs - 2 * D &&
      rng.chance(0.4)
    ) {
      status = "paused";
      doneCount = rng.int(1, n - 1);
    } else if (rng.chance(0.07)) {
      status = "abandoned";
      doneCount = rng.int(0, n - 1);
    }

    let cursor = startMs;
    let elapsed = 0;
    const activityRows = items.slice(0, s.keep).map((item, idx) => {
      const done = idx < doneCount;
      const stoppedHere = status === "abandoned" && idx === doneCount;
      const skipped = done && status === "completed" && rng.chance(0.08);
      const seconds = activityDurationSeconds(item) + rng.int(0, 20);
      let state: "pending" | "completed" | "skipped" = "pending";
      let completedAt: string | null = null;
      if (done && !skipped) {
        cursor += seconds * 1000;
        elapsed += seconds;
        state = "completed";
        completedAt = iso(cursor);
      } else if (skipped) state = "skipped";
      const discomfort = (done && !skipped && rng.chance(0.08)) || (stoppedHere && rng.chance(0.6));
      const level = discomfort ? rng.int(3, 8) : null;
      // A separate stream, so adding skip reasons left every other generated value unchanged.
      const skipReason = skipped
        ? ctx.rng.fork(`skip/${sessionId}/${item.id}`).pick(skipReasons)
        : null;
      return {
        id: ctx.id("activity", `${sessionId}/${item.id}`),
        organizationId: p.org.id,
        sessionId,
        assignmentId: item.id,
        status: state,
        completedSets: state === "completed" ? item.sets : null,
        completedReps:
          state === "completed" && item.reps !== null
            ? Math.max(1, item.reps - (rng.chance(0.2) ? rng.int(1, 2) : 0))
            : null,
        durationSeconds: state === "completed" ? seconds : null,
        discomfortReported: discomfort,
        discomfortLevel: level,
        discomfortNote: discomfort ? rng.pick(discomfortNotes) : null,
        skipReason,
        completedAt,
        updatedAt: completedAt ?? iso(startMs),
      };
    });
    for (const row of activityRows) t.SessionActivity.push(row);

    // "Stop, this hurts" (AC-C4): an interrupted session whose stopping exercise reported
    // discomfort ended as stopped for discomfort rather than abandoned.
    if (status === "abandoned" && activityRows[doneCount]?.discomfortReported) {
      status = "stopped_discomfort";
    }
    const endMs = startMs + elapsed * 1000;
    t.ExerciseSession.push({
      id: sessionId,
      organizationId: p.org.id,
      patientId: p.id,
      carePlanVersionId: version.id,
      status,
      currentPosition: doneCount,
      elapsedSeconds: elapsed,
      startedAt: iso(startMs),
      pausedAt: status === "paused" ? iso(endMs) : null,
      completedAt: status === "completed" ? iso(endMs) : null,
      stoppedAt: status === "stopped_discomfort" ? iso(endMs) : null,
      updatedAt: iso(endMs),
    });
    p.sessions.push({
      id: sessionId,
      startedAtMs: startMs,
      completedAtMs: status === "completed" ? endMs : null,
      status,
      version,
    });
  });

  // ---- check-ins and observations ------------------------------------------------------
  for (const p of ctx.patients) {
    if (p.versions.length === 0) continue;
    const rng = ctx.rng.fork(`checkins/${p.id}`);
    if (p.status === "active" && p.persona === null && !p.flare && rng.chance(0.1)) p.flare = true;
    const base = rng.int(2, 6);
    const slope = 0.03 + rng.next() * 0.05;
    const painAt = (ms: number, recentCap: boolean): number => {
      const days = (ms - p.planStartMs) / D;
      let v = Math.round(base - slope * days + (rng.next() * 2 - 1));
      v = Math.max(0, Math.min(10, v));
      if (recentCap && ms > ctx.anchorMs - 5 * D) v = Math.min(v, 6);
      return v;
    };
    const add = (submittedMs: number, sessionId: string | null, pain: number): void => {
      const id = ctx.id("checkin", `${p.id}/${submittedMs}`);
      const difficulty = rng.weighted([
        ["easier", 20],
        ["as_expected", 55],
        ["harder", 25],
      ] as const);
      const row = {
        id,
        organizationId: p.org.id,
        patientId: p.id,
        sessionId,
        painScore: pain,
        difficulty,
        notes: rng.chance(0.25) ? rng.pick(checkInNotes) : null,
        submittedAt: iso(submittedMs),
        reviewedAt: null,
        reviewedByUserId: null,
      } satisfies Ctx["t"]["PatientCheckIn"][number];
      t.PatientCheckIn.push(row);
      const info: CheckInInfo = { id, submittedAtMs: submittedMs, painScore: pain, row };
      p.checkIns.push(info);
      t.Observation.push({
        id: ctx.id("observation", id),
        organizationId: p.org.id,
        patientId: p.id,
        encounterId: null,
        checkInId: id,
        sessionId,
        status: "final",
        category: "survey",
        codeSystem: "http://loinc.org",
        code: "72514-3",
        display: "Pain severity - 0-10 verbal numeric rating [Score] - Reported",
        valueQuantity: pain,
        valueUnit: "{score}",
        valueString: null,
        dataAbsentReason: null,
        performerType: "patient",
        performerPractitionerId: null,
        effectiveAt: iso(submittedMs),
        recordedAt: iso(submittedMs),
      });
    };

    for (const s of p.sessions) {
      if (s.status === "completed" && s.completedAtMs !== null && rng.chance(0.85)) {
        const at = s.completedAtMs + rng.int(2, 12) * MIN;
        add(at, s.id, painAt(at, true));
      }
    }
    // Weekly check-ins that are not tied to a session.
    if (p.status !== "awaiting_assignment" && p.status !== "intake_incomplete") {
      const windowStart = Math.max(p.planStartMs, ctx.anchorMs - profile.historyDays * D);
      const windowEnd = Math.min(p.activeEndMs, ctx.anchorMs - 3 * H);
      for (let w = windowStart; w < windowEnd; w += 7 * D) {
        if (!rng.chance(0.3)) continue;
        const at = w + rng.int(0, 6) * D + rng.int(8, 21) * H;
        if (at > windowEnd || p.checkIns.some((c) => Math.abs(c.submittedAtMs - at) < 6 * H))
          continue;
        add(at, null, painAt(at, true));
      }
    }
    // A recent high-pain report for flare patients, so the review queue has live items.
    if (p.flare) {
      const at = ctx.anchorMs - (p.persona === "flare" ? 20 * H : rng.int(4, 90) * H);
      add(at, null, p.persona === "flare" ? 8 : rng.int(7, 9));
    }
    p.checkIns.sort((a, b) => a.submittedAtMs - b.submittedAtMs);

    // Last activity.
    const last = Math.max(
      0,
      ...p.sessions.map((s) => s.completedAtMs ?? s.startedAtMs),
      ...p.checkIns.map((c) => c.submittedAtMs),
    );
    if (last > 0) {
      p.row.lastActivityAt = iso(last);
      p.row.updatedAt = iso(Math.max(last, Date.parse(p.row.updatedAt)));
    }
  }
}
