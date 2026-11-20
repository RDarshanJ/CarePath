import { EXERCISE_CONTENT_NOTICE } from "@carepath/shared";
import type {
  ExerciseSessionDetail,
  ExerciseSessionStatus,
  ExerciseSessionSummary,
} from "@carepath/shared/contracts";
import type { SessionDetailRow, SessionSummaryRow } from "./repo.js";

function counts(activities: { status: string }[]) {
  const n = (s: string) => activities.filter((a) => a.status === s).length;
  return {
    total: activities.length,
    completed: n("completed"),
    skipped: n("skipped"),
    pending: n("pending"),
  };
}

export function toSessionSummary(
  row: SessionSummaryRow | SessionDetailRow,
): ExerciseSessionSummary {
  return {
    id: row.id,
    status: row.status as ExerciseSessionStatus,
    carePlanVersionId: row.carePlanVersionId,
    versionNumber: row.carePlanVersion.versionNumber,
    startedAt: row.startedAt.toISOString(),
    pausedAt: row.pausedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    stoppedAt: row.stoppedAt?.toISOString() ?? null,
    elapsedSeconds: row.elapsedSeconds,
    activityCounts: counts(row.activities),
    checkInId: row.checkIns[0]?.id ?? null,
  };
}

export function toSessionDetail(row: SessionDetailRow): ExerciseSessionDetail {
  const activities = [...row.activities].sort(
    (a, b) => a.assignment.position - b.assignment.position,
  );
  const ended = row.status === "completed" || row.status === "stopped_discomfort";
  return {
    ...toSessionSummary(row),
    currentPosition: row.currentPosition,
    activities: activities.map((a, index) => ({
      id: a.id,
      assignmentId: a.assignmentId,
      position: index,
      status: a.status,
      exercise: a.assignment.exercise,
      dose: {
        sets: a.assignment.sets,
        reps: a.assignment.reps,
        holdSeconds: a.assignment.holdSeconds,
        durationSeconds: a.assignment.durationSeconds,
        restSeconds: a.assignment.restSeconds,
      },
      clinicianInstructions: a.assignment.instructions,
      completedSets: a.completedSets,
      completedReps: a.completedReps,
      durationSeconds: a.durationSeconds,
      skipReason: a.skipReason,
      discomfortLevel: a.discomfortLevel,
      discomfortNote: a.discomfortNote,
      completedAt: a.completedAt?.toISOString() ?? null,
    })),
    checkInRequested: ended && row.checkIns.length === 0,
    contentNotice: EXERCISE_CONTENT_NOTICE,
  };
}
