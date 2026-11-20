/**
 * Allowed status transitions, by table. The database enforces the same table on UPDATE
 * (StatusTransition rows + enforce_status_transition() trigger in the constraints migration);
 * test/status-transitions.test.ts asserts the two are identical.
 *
 * Only changes of status are checked; INSERT may use any status so seeds can write history.
 * A transition not listed here is rejected with SQLSTATE CP001.
 */
export const statusTransitions = {
  Patient: {
    column: "status",
    allowed: {
      intake_incomplete: ["awaiting_assignment", "inactive"],
      awaiting_assignment: ["active", "inactive"],
      active: ["inactive", "discharged"],
      inactive: ["active", "awaiting_assignment"],
      discharged: ["active"],
    },
  },
  OrganizationMembership: {
    column: "status",
    allowed: { active: ["revoked"] },
  },
  CareTeam: {
    column: "status",
    allowed: { active: ["inactive"], inactive: ["active"] },
  },
  Consent: {
    column: "status",
    allowed: {
      active: ["inactive", "entered_in_error"],
      inactive: ["entered_in_error"],
      rejected: ["entered_in_error"],
    },
  },
  IntakeAssessment: {
    column: "status",
    allowed: { in_progress: ["submitted"], submitted: ["reviewed"] },
  },
  Goal: {
    column: "lifecycleStatus",
    allowed: {
      proposed: ["planned", "accepted", "active", "cancelled", "rejected", "entered_in_error"],
      planned: ["accepted", "active", "cancelled", "entered_in_error"],
      accepted: ["active", "cancelled", "entered_in_error"],
      active: ["on_hold", "completed", "cancelled", "entered_in_error"],
      on_hold: ["active", "completed", "cancelled", "entered_in_error"],
      completed: ["entered_in_error"],
      cancelled: ["entered_in_error"],
      rejected: ["entered_in_error"],
    },
  },
  CarePlan: {
    column: "status",
    allowed: {
      draft: ["active", "revoked", "entered_in_error"],
      active: ["on_hold", "completed", "revoked", "entered_in_error"],
      on_hold: ["active", "completed", "revoked", "entered_in_error"],
      completed: ["entered_in_error"],
      revoked: ["entered_in_error"],
    },
  },
  ExerciseSession: {
    column: "status",
    allowed: {
      in_progress: ["paused", "completed", "abandoned", "stopped_discomfort"],
      paused: ["in_progress", "abandoned", "stopped_discomfort"],
    },
  },
  SessionActivity: {
    column: "status",
    allowed: { pending: ["completed", "skipped"], skipped: ["pending", "completed"] },
  },
  Observation: {
    column: "status",
    allowed: {
      final: ["amended", "corrected", "entered_in_error"],
      amended: ["corrected", "entered_in_error"],
      corrected: ["amended", "entered_in_error"],
      cancelled: ["entered_in_error"],
    },
  },
  AvailabilitySlot: {
    column: "status",
    allowed: { open: ["booked", "blocked"], booked: ["open"], blocked: ["open"] },
  },
  Appointment: {
    column: "status",
    allowed: {
      requested: ["booked", "cancelled_by_patient", "cancelled_by_clinic"],
      booked: [
        "checked_in",
        "in_progress",
        "cancelled_by_patient",
        "cancelled_by_clinic",
        "no_show",
      ],
      checked_in: ["in_progress", "completed", "cancelled_by_clinic", "no_show"],
      in_progress: ["completed"],
    },
  },
  Encounter: {
    column: "status",
    allowed: { in_progress: ["finished", "entered_in_error"], finished: ["entered_in_error"] },
  },
  ClinicalNote: {
    column: "status",
    allowed: { draft: ["signed", "entered_in_error"], signed: ["entered_in_error"] },
  },
  Message: {
    column: "status",
    allowed: { queued: ["sent", "failed"], failed: ["queued"] },
  },
  ReviewTask: {
    column: "status",
    allowed: {
      open: ["in_review", "resolved", "dismissed"],
      in_review: ["open", "resolved", "dismissed"],
    },
  },
  AIGeneration: {
    column: "status",
    allowed: { pending: ["succeeded", "failed"] },
  },
  Job: {
    column: "status",
    allowed: {
      queued: ["running"],
      running: ["succeeded", "queued", "dead"],
      dead: ["queued"],
    },
  },
} as const satisfies Record<string, { column: string; allowed: Record<string, readonly string[]> }>;

export type StatusTable = keyof typeof statusTransitions;

/** True when `from -> to` is allowed for the table (same-status writes are always allowed). */
export function canTransition(table: StatusTable, from: string, to: string): boolean {
  if (from === to) return true;
  const allowed = statusTransitions[table].allowed as Record<string, readonly string[]>;
  return allowed[from]?.includes(to) ?? false;
}

/** Flattened rows, in the same shape as the StatusTransition table. */
export function transitionRows(): Array<{
  tableName: string;
  column: string;
  fromStatus: string;
  toStatus: string;
}> {
  return Object.entries(statusTransitions).flatMap(([tableName, def]) =>
    Object.entries(def.allowed as Record<string, readonly string[]>).flatMap(([fromStatus, tos]) =>
      tos.map((toStatus) => ({ tableName, column: def.column, fromStatus, toStatus })),
    ),
  );
}
