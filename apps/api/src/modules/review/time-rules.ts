import type { ReviewRuleKey } from "@carepath/shared/contracts";
import type { DbClient } from "../../core/db/repo.js";
import { addDays, localDate, startOfLocalDay } from "../../core/time.js";
import { findClinic } from "../clinic/repo.js";
import { asAnswers, missingSteps } from "../intake/completeness.js";
import { totalsBetween } from "../progress/compute.js";
import { scheduleVersions, sessionsSince } from "../progress/repo.js";
import { abandonIdleSessions } from "../sessions/repo.js";
import {
  activeConsentPatients,
  activePlanPatients,
  findRuleByKey,
  hasActiveTask,
  insertRuleTask,
  staleIntakes,
  staleUnreviewedCheckIns,
  upcomingFollowUps,
} from "./repo.js";
import { explain, paramsFor, ruleUnits } from "./rules.js";

/**
 * Time-based review rules (PRD section 10) and session abandonment, run by job handlers with a
 * system scope built from job.organizationId. They read and write one organization only and
 * use the same scoped repositories as the routes. Task creation is idempotent (insertRuleTask).
 */
export interface SystemScope {
  orgId: string;
}

const H = 3_600_000;
const D = 24 * H;

export type TimeRuleCounts = Record<Exclude<ReviewRuleKey, "reported_pain">, number>;

async function enabledRule(db: DbClient, scope: SystemScope, key: ReviewRuleKey) {
  const rule = await findRuleByKey(db, scope, key);
  return rule && rule.enabled ? rule : null;
}

export async function runTimeRules(
  db: DbClient,
  scope: SystemScope,
  now: Date,
): Promise<TimeRuleCounts> {
  const counts: TimeRuleCounts = {
    missed_sessions: 0,
    unreviewed_checkin: 0,
    upcoming_followup: 0,
    missing_intake: 0,
  };

  const unreviewed = await enabledRule(db, scope, "unreviewed_checkin");
  if (unreviewed) {
    const { thresholdHours } = paramsFor("unreviewed_checkin", unreviewed.params);
    for (const c of await staleUnreviewedCheckIns(
      db,
      scope,
      new Date(now.getTime() - thresholdHours * H),
    )) {
      const hours = Math.floor((now.getTime() - c.submittedAt.getTime()) / H);
      const id = await insertRuleTask(db, scope, {
        ruleId: unreviewed.id,
        patientId: c.patientId,
        dedupeKey: `checkin:${c.id}`,
        explanation: explain("unreviewed_checkin", hours, thresholdHours),
        evidence: [
          {
            type: "PatientCheckIn",
            id: c.id,
            field: "submittedAt",
            value: hours,
            threshold: thresholdHours,
            unit: ruleUnits.unreviewed_checkin,
          },
        ],
        priority: unreviewed.priority,
        dueAt: null,
        now,
      });
      if (id) counts.unreviewed_checkin += 1;
    }
  }

  const followUp = await enabledRule(db, scope, "upcoming_followup");
  if (followUp) {
    const { thresholdHours } = paramsFor("upcoming_followup", followUp.params);
    for (const a of await upcomingFollowUps(
      db,
      scope,
      now,
      new Date(now.getTime() + thresholdHours * H),
    )) {
      const hours = Math.ceil((a.startsAt.getTime() - now.getTime()) / H);
      const id = await insertRuleTask(db, scope, {
        ruleId: followUp.id,
        patientId: a.patientId,
        dedupeKey: `appointment:${a.id}`,
        explanation: explain("upcoming_followup", hours, thresholdHours),
        evidence: [
          {
            type: "Appointment",
            id: a.id,
            field: "startsAt",
            value: hours,
            threshold: thresholdHours,
            unit: ruleUnits.upcoming_followup,
          },
        ],
        priority: followUp.priority,
        dueAt: a.startsAt,
        now,
      });
      if (id) counts.upcoming_followup += 1;
    }
  }

  const intake = await enabledRule(db, scope, "missing_intake");
  if (intake) {
    const { thresholdDays } = paramsFor("missing_intake", intake.params);
    const rows = await staleIntakes(db, scope, new Date(now.getTime() - thresholdDays * D));
    const consented = await activeConsentPatients(
      db,
      scope,
      rows.map((r) => r.patientId),
    );
    for (const r of rows) {
      const days = Math.floor((now.getTime() - r.patient.createdAt.getTime()) / D);
      const missing = missingSteps(asAnswers(r.answers), consented.has(r.patientId));
      const id = await insertRuleTask(db, scope, {
        ruleId: intake.id,
        patientId: r.patientId,
        dedupeKey: `intake:${r.id}`,
        explanation: explain(
          "missing_intake",
          days,
          thresholdDays,
          missing.join(", ").replace(/_/g, " "),
        ),
        evidence: [
          {
            type: "IntakeAssessment",
            id: r.id,
            field: "currentStep",
            value: days,
            threshold: thresholdDays,
            unit: ruleUnits.missing_intake,
          },
        ],
        priority: intake.priority,
        dueAt: null,
        now,
      });
      if (id) counts.missing_intake += 1;
    }
  }

  const missed = await enabledRule(db, scope, "missed_sessions");
  if (missed) {
    const { threshold, windowDays } = paramsFor("missed_sessions", missed.params);
    const clinic = await findClinic(db, scope);
    const tz = clinic.timezone;
    const today = localDate(now, tz);
    const from = addDays(today, -windowDays);
    const to = addDays(today, -1);
    const plans = await activePlanPatients(db, scope);
    const ids = plans.map((p) => p.patientId);
    const versions = await scheduleVersions(db, scope, ids);
    const sessions = await sessionsSince(db, scope, ids, startOfLocalDay(from, tz));
    for (const p of plans) {
      const t = totalsBetween(
        from,
        to,
        tz,
        versions.get(p.patientId) ?? [],
        sessions.get(p.patientId) ?? [],
      );
      const count = t.assignedSessions - t.completedSessions;
      if (count < threshold || (await hasActiveTask(db, scope, missed.id, p.patientId))) continue;
      const id = await insertRuleTask(db, scope, {
        ruleId: missed.id,
        patientId: p.patientId,
        dedupeKey: `window:${today}`,
        explanation: explain("missed_sessions", count, threshold),
        evidence: [
          {
            type: "CarePlanVersion",
            id: p.currentVersionId!,
            field: "daysOfWeek",
            value: count,
            threshold,
            unit: ruleUnits.missed_sessions,
          },
        ],
        priority: missed.priority,
        dueAt: null,
        now,
      });
      if (id) counts.missed_sessions += 1;
    }
  }
  return counts;
}

/** PRD section 9: the system abandons a session after 24 idle hours. */
export async function abandonSessions(
  db: DbClient,
  scope: SystemScope,
  now: Date,
): Promise<number> {
  return abandonIdleSessions(db, scope, new Date(now.getTime() - 24 * H), now);
}
