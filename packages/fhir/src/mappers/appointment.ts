import type { Appointment, AppointmentParticipant } from "@medplum/fhirtypes";
import { EXTENSIONS, identifierSystem, SYSTEMS } from "../config.js";
import { appointmentStatusFromFhir, appointmentStatusToFhir } from "../codes.js";
import type { FhirIssue } from "../issues.js";
import type { AppointmentRecord, AppointmentStatus, AppointmentType } from "../types.js";
import {
  instantUtc,
  mapIssue,
  ref,
  type FromFhirContext,
  type MapResult,
  type ToFhirContext,
} from "./common.js";

const TYPE_DISPLAY: Record<AppointmentType, string> = {
  initial_evaluation: "Initial evaluation",
  follow_up: "Follow-up visit",
  video_follow_up: "Video follow-up visit",
};

type Participation = NonNullable<AppointmentParticipant["status"]>;

/** Participant answers implied by the CarePath status (patient, practitioner). */
function participation(s: AppointmentStatus): [Participation, Participation] {
  switch (s) {
    case "requested":
      return ["accepted", "needs-action"];
    case "cancelled_by_patient":
      return ["declined", "accepted"];
    case "cancelled_by_clinic":
      return ["accepted", "declined"];
    default:
      return ["accepted", "accepted"];
  }
}

/**
 * Appointment (R4: status and at least one participant with a status; no US Core profile was
 * read). Status per research HD section 3.1. app-2 and app-3: start and end are always written.
 * app-4: cancelationReason only on cancelled and noshow; for a cancellation its coding names who
 * cancelled (pat or prov, R4 appointment-cancellation-reason) and its text carries the reason.
 * The booking time zone travels in a local extension. The slot is not exported (Slot is not a
 * mapped type), so Appointment.slot is never written and cannot dangle.
 */
export function appointmentToFhir(a: AppointmentRecord, ctx: ToFhirContext): Appointment {
  const [patientStatus, practitionerStatus] = participation(a.status);
  const by =
    a.status === "cancelled_by_patient"
      ? { code: "pat", display: "Patient" }
      : a.status === "cancelled_by_clinic"
        ? { code: "prov", display: "Provider" }
        : null;
  const reasonAllowed = by !== null || a.status === "no_show";
  return {
    resourceType: "Appointment",
    id: a.id,
    extension: [{ url: EXTENSIONS.bookedTimezone, valueString: a.bookedTimezone }],
    identifier: [{ system: identifierSystem(ctx.orgSlug, "appointment"), value: a.id }],
    status: appointmentStatusToFhir(a.status) as Appointment["status"],
    ...(reasonAllowed && (by || a.cancellationReason)
      ? {
          cancelationReason: {
            ...(by ? { coding: [{ system: SYSTEMS.appointmentCancellationReason, ...by }] } : {}),
            ...(a.cancellationReason ? { text: a.cancellationReason } : {}),
          },
        }
      : {}),
    appointmentType: {
      coding: [{ system: SYSTEMS.appointmentType, code: a.type, display: TYPE_DISPLAY[a.type] }],
    },
    ...(a.reason ? { reasonCode: [{ text: a.reason }] } : {}),
    start: a.startsAt,
    end: a.endsAt,
    created: a.createdAt,
    participant: [
      { actor: ref("Patient", a.patientId), required: "required", status: patientStatus },
      {
        actor: ref("Practitioner", a.practitionerId),
        required: "required",
        status: practitionerStatus,
      },
    ],
  };
}

export function appointmentFromFhir(
  r: Appointment,
  ctx: FromFhirContext,
): MapResult<AppointmentRecord> {
  const issues: FhirIssue[] = [];
  const cancelledBy = r.cancelationReason?.coding?.find(
    (c) => c.system === SYSTEMS.appointmentCancellationReason,
  )?.code;
  const status = appointmentStatusFromFhir(r.status, cancelledBy);
  const typeCode = r.appointmentType?.coding?.find((c) => c.system === SYSTEMS.appointmentType)
    ?.code as AppointmentType | undefined;
  const type = typeCode && typeCode in TYPE_DISPLAY ? typeCode : null;
  const actors = (r.participant ?? []).map((p, i) => ctx.resolve(p.actor, `participant[${i}]`));
  const patient = actors.find((a) => a?.type === "Patient");
  const practitioner = actors.find((a) => a?.type === "Practitioner");
  const start = instantUtc(r.start);
  const end = instantUtc(r.end);
  const tz = r.extension?.find((e) => e.url === EXTENSIONS.bookedTimezone)?.valueString;

  if (!status)
    issues.push(
      mapIssue(
        "error",
        "not-supported",
        "map.appointment.status",
        `Appointment status "${r.status ?? ""}" is not one CarePath stores.`,
        "status",
      ),
    );
  if (!type)
    issues.push(
      mapIssue(
        "error",
        "not-supported",
        "map.appointment.type",
        "Appointment type is not a CarePath appointment type.",
        "appointmentType",
      ),
    );
  if (!patient || !practitioner)
    issues.push(
      mapIssue(
        "error",
        "required",
        "map.appointment.participant",
        "CarePath appointments have one patient and one practitioner participant.",
        "participant",
      ),
    );
  if (!start || !end)
    issues.push(
      mapIssue(
        "error",
        "required",
        "map.appointment.period",
        "Appointment needs a start and an end with a time.",
        "start",
      ),
    );
  if (issues.length) return { record: null, issues };
  const withReason = status!.startsWith("cancelled") || status === "no_show";
  return {
    record: {
      id: r.id ?? "",
      patientId: patient!.id,
      practitionerId: practitioner!.id,
      type: type!,
      status: status!,
      startsAt: start!,
      endsAt: end!,
      bookedTimezone: tz ?? "UTC",
      reason: r.reasonCode?.[0]?.text ?? null,
      cancellationReason: withReason ? (r.cancelationReason?.text ?? null) : null,
      createdAt: instantUtc(r.created) ?? start!,
    },
    issues: [],
  };
}
