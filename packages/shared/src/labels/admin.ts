import type {
  AuditAction,
  AuditEventName,
  AuditOutcome,
  EnrollmentCodeStatus,
  MetricKey,
  MetricListKey,
  MetricUnit,
  ReviewBand,
  SlotStatus,
} from "../contracts/admin.js";
import type { StatusLabel } from "./types.js";

/**
 * WP 6.1. The words printed with each metric (DR-002 N: definition-first, no hover-only text) and
 * the labels of the admin vocabularies. Every map is an exhaustive Record, and the tests compare
 * each with its enum.
 */
export interface MetricText {
  name: string;
  unit: MetricUnit;
  numeratorLabel: string;
  denominatorLabel: string | null;
  windowLabel: string;
  definition: string;
  calculation: string;
  source: string;
  supports: string;
  /** Caveat printed with a previous-window value; null where there is no previous value. */
  previousCaveat: string | null;
  /** Why there is no previous value; null where there is one. */
  noPreviousReason: string | null;
}

export const metricText: Record<MetricKey, MetricText> = {
  enrollment_completion: {
    name: "Enrollment completion",
    unit: "patients",
    numeratorLabel: "Submitted onboarding",
    denominatorLabel: "Accounts created",
    windowLabel: "Accounts created in the last 30 days",
    definition:
      "Of the patient accounts created in the last 30 days, how many have submitted their onboarding.",
    calculation:
      "Accounts created in the last 30 days with a submitted or reviewed intake, divided by accounts created in the last 30 days.",
    source: "Patient accounts and intake assessments.",
    supports: "Whether to follow up on sign-ups that stalled.",
    previousCaveat:
      "The 30 days before, recomputed from current records. The newest accounts have had less time to finish.",
    noPreviousReason: null,
  },
  appointment_utilisation: {
    name: "Appointment utilisation",
    unit: "minutes",
    numeratorLabel: "Minutes used",
    denominatorLabel: "Minutes published",
    windowLabel: "Times that started in the last 30 days",
    definition:
      "Of the minutes the clinic published for booking in the last 30 days, how many were booked, checked in, in progress or completed.",
    calculation:
      "Minutes of open or booked times that started in the last 30 days and hold a booked, checked-in, in-progress or completed visit, divided by minutes of all open or booked times that started in that period. Blocked times are not counted as published.",
    source: "Availability times and appointments.",
    supports: "Whether to add, remove or move availability.",
    previousCaveat:
      "The 30 days before, recomputed from current availability. Times removed or edited since then are not counted.",
    noPreviousReason: null,
  },
  cancellations: {
    name: "Cancellations",
    unit: "appointments",
    numeratorLabel: "Cancelled",
    denominatorLabel: "Booked",
    windowLabel: "Appointments booked in the last 30 days",
    definition: "Of the appointments booked in the last 30 days, how many were cancelled.",
    calculation:
      "Appointments booked in the last 30 days that are now cancelled by the patient or the clinic, divided by appointments booked in the last 30 days. A visit cancelled to move it to another time counts as cancelled and is shown separately.",
    source: "Appointments.",
    supports: "Whether cancellation volume or source calls for a policy or outreach change.",
    previousCaveat:
      "The 30 days before, by booking date, recomputed from current records. Recent bookings may still be cancelled later.",
    noPreviousReason: null,
  },
  care_plan_activation: {
    name: "Care plan activation",
    unit: "patients",
    numeratorLabel: "With a published plan",
    denominatorLabel: "Active patients",
    windowLabel: "Now",
    definition:
      "Of the patients whose status is Active, how many have a published care plan. Active means intake submitted and a therapist assigned.",
    calculation:
      "Patients with status Active that have an open care plan with a published version, divided by patients with status Active.",
    source: "Patients and care plans.",
    supports: "Which active patients still need a plan, so plan building can be assigned.",
    previousCaveat: null,
    noPreviousReason: "No comparison: this metric is a snapshot, and no earlier values are stored.",
  },
  activity_completion: {
    name: "Activity completion",
    unit: "items",
    numeratorLabel: "Items done",
    denominatorLabel: "Items scheduled",
    windowLabel: "The last 7 days, today included",
    definition:
      "Of the exercise items that published care plans scheduled in the last 7 days, how many were marked done. This counts assigned items. It is not a measure of recovery.",
    calculation:
      "For each day, each exercise in the plan version in force that is scheduled that weekday counts once per time per day. An item is done when a completed activity for that exercise falls on that clinic-zone day, up to the times per day. Skipped items are not done.",
    source: "Published care plan versions and session activities.",
    supports: "Whether assigned exercise is being done enough to prompt outreach or a plan check.",
    previousCaveat:
      "The 7 days before, recomputed from current records. Counts only; no pain values or notes are used.",
    noPreviousReason: null,
  },
  pending_review_items: {
    name: "Pending review items",
    unit: "review_tasks",
    numeratorLabel: "Open or in review",
    denominatorLabel: null,
    windowLabel: "Now",
    definition:
      "Review tasks that are open or in review, grouped by how long they have waited. The age bands are a demonstration default, not a clinical standard.",
    calculation:
      "Tasks with status open or in review, by whole hours since they were created: under 24 hours, 24 to 47 hours, 48 hours or more.",
    source: "Review tasks.",
    supports: "How much review work is waiting, and whether to reassign it.",
    previousCaveat: null,
    noPreviousReason: "No comparison: this metric is a snapshot, and no earlier values are stored.",
  },
};

export const metricListLabels: { [K in MetricKey]: Record<MetricListKey<K>, string> } = {
  enrollment_completion: {
    not_submitted: "Onboarding not submitted",
    submitted: "Onboarding submitted",
    created: "All accounts created",
  },
  appointment_utilisation: {
    unbooked: "Unbooked times",
    booked: "Booked times",
    published: "All published times",
  },
  cancellations: {
    cancelled: "Cancelled appointments",
    cancelled_by_patient: "Cancelled by the patient",
    cancelled_by_clinic: "Cancelled by the clinic",
    booked: "All appointments booked",
  },
  care_plan_activation: {
    without_plan: "Active without a published plan",
    with_plan: "Active with a published plan",
    active: "All active patients",
  },
  activity_completion: {
    not_done: "Items not done",
    done: "Items done",
    scheduled: "All items scheduled",
    by_patient: "By patient",
  },
  pending_review_items: {
    all: "All pending tasks",
    under_24h: "Waiting under 24 hours",
    "24_to_48h": "Waiting 24 to 48 hours",
    over_48h: "Waiting 48 hours or more",
  },
};

export const reviewBandLabels: Record<ReviewBand, string> = {
  under_24h: "Under 24 hours",
  "24_to_48h": "24 to 48 hours",
  over_48h: "48 hours or more",
};

export const slotStatusLabels: Record<SlotStatus, StatusLabel> = {
  open: { label: "Open", tone: "success", form: "text" },
  booked: { label: "Booked", tone: "info", form: "text" },
  blocked: { label: "Blocked", tone: "neutral", form: "tag" },
};

export const enrollmentCodeStatusLabels: Record<EnrollmentCodeStatus, StatusLabel> = {
  unused: { label: "Unused", tone: "info", form: "tag" },
  redeemed: { label: "Used", tone: "success", form: "tag" },
  expired: { label: "Expired", tone: "neutral", form: "tag" },
  revoked: { label: "Revoked", tone: "warning", form: "tag" },
};

export const auditOutcomeLabels: Record<AuditOutcome, string> = {
  success: "Succeeded",
  minor_failure: "Minor failure",
  serious_failure: "Serious failure",
  major_failure: "Major failure",
};

export const auditActionLabels: Record<AuditAction, string> = {
  C: "Create",
  R: "Read",
  U: "Update",
  D: "Delete",
  E: "Execute",
};

export const auditEventLabels: Record<AuditEventName, string> = {
  "auth.login": "Signed in",
  "auth.login_failed": "Sign-in failed",
  "auth.logout": "Signed out",
  "account.create": "Account created",
  "consent.grant": "Consent given",
  "consent.revoke": "Consent withdrawn",
  "phi.read": "Record opened",
  "careplan.publish": "Care plan published",
  "note.sign": "Note signed",
  "note.version": "Note draft saved",
  "note.entered_in_error": "Note marked entered in error",
  "ai.generate": "Draft generated",
  "ai.refused": "Draft refused",
  "ai.review": "Draft reviewed",
  "review_task.resolve": "Review task resolved",
  "review_rule.update": "Review rule changed",
  "appointment.book": "Appointment booked",
  "appointment.cancel": "Appointment cancelled",
  "assignment.create": "Clinician assigned",
  "availability.update": "Availability changed",
  "settings.update": "Settings changed",
  "export.fhir": "Record exported",
  "import.fhir": "Record imported",
  "security.access_denied": "Access denied",
  "audit.query": "Audit log read",
  "enrollment_code.issue": "Eligibility code issued",
  "enrollment_code.revoke": "Eligibility code revoked",
};
