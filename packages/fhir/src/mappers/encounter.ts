import type { Encounter } from "@medplum/fhirtypes";
import { identifierSystem, SYSTEMS } from "../config.js";
import { encounterStatusFromFhir, encounterStatusToFhir } from "../codes.js";
import type { FhirIssue } from "../issues.js";
import type { EncounterRecord } from "../types.js";
import {
  instantUtc,
  mapIssue,
  ref,
  type FromFhirContext,
  type MapResult,
  type ToFhirContext,
} from "./common.js";

const CLASS_DISPLAY = { AMB: "ambulatory", VR: "virtual" } as const;

/**
 * The Encounter.typeCode column holds a CarePath visit type as a bare code (`PT-FOLLOW-UP`) and
 * any other system's code as `<system>|<code>` (FHIR token syntax), so an imported SNOMED CT
 * visit type keeps its system without a schema change.
 */
export function encounterTypeColumn(e: Pick<EncounterRecord, "typeSystem" | "typeCode">): string {
  return e.typeSystem === SYSTEMS.encounterType ? e.typeCode : `${e.typeSystem}|${e.typeCode}`;
}
export function encounterTypeFromColumn(column: string): { typeSystem: string; typeCode: string } {
  const bar = column.lastIndexOf("|");
  return bar > 0
    ? { typeSystem: column.slice(0, bar), typeCode: column.slice(bar + 1) }
    : { typeSystem: SYSTEMS.encounterType, typeCode: column };
}

/**
 * Encounter (US Core mandatory: status, class, type, subject). CarePath records only visits that
 * took place (advisor plan revision 1): class AMB (in person) or VR (video, v3 ActCode), status
 * in-progress, finished or entered-in-error, period = the actual times. Planned times stay on
 * the Appointment, linked through Encounter.appointment. The transcript is not exported.
 */
export function encounterToFhir(e: EncounterRecord, ctx: ToFhirContext): Encounter {
  return {
    resourceType: "Encounter",
    id: e.id,
    identifier: [{ system: identifierSystem(ctx.orgSlug, "encounter"), value: e.id }],
    status: encounterStatusToFhir(e.status) as Encounter["status"],
    class: { system: SYSTEMS.v3ActCode, code: e.class, display: CLASS_DISPLAY[e.class] },
    type: [
      {
        coding: [{ system: e.typeSystem, code: e.typeCode, display: e.typeDisplay }],
        text: e.typeDisplay,
      },
    ],
    subject: ref("Patient", e.patientId),
    participant: [{ individual: ref("Practitioner", e.practitionerId) }],
    ...(e.appointmentId ? { appointment: [ref("Appointment", e.appointmentId)] } : {}),
    period: { start: e.startedAt, ...(e.endedAt ? { end: e.endedAt } : {}) },
    serviceProvider: ref("Organization", ctx.organizationId),
  };
}

export function encounterFromFhir(r: Encounter, ctx: FromFhirContext): MapResult<EncounterRecord> {
  const issues: FhirIssue[] = [];
  const status = encounterStatusFromFhir(r.status);
  const cls = r.class?.system === SYSTEMS.v3ActCode ? r.class.code : undefined;
  const klass = cls === "AMB" || cls === "VR" ? cls : null;
  const coding = r.type?.flatMap((t) => t.coding ?? []).find((c) => c.system && c.code);
  const subject = ctx.resolve(r.subject, "subject");
  const practitioner = (r.participant ?? [])
    .map((p, i) => ctx.resolve(p.individual, `participant[${i}].individual`))
    .find((x) => x?.type === "Practitioner");
  const appointment = r.appointment?.[0] ? ctx.resolve(r.appointment[0], "appointment[0]") : null;
  const start = instantUtc(r.period?.start);
  const end = instantUtc(r.period?.end);

  // Shapes CarePath does not record are "not-supported", so import skips them and reports why.
  if (!status)
    issues.push(
      mapIssue(
        "error",
        "not-supported",
        "map.encounter.status",
        `Encounter status "${r.status ?? ""}" is not a visit that took place (in-progress, finished, entered-in-error).`,
        "status",
      ),
    );
  if (!klass)
    issues.push(
      mapIssue(
        "error",
        "not-supported",
        "map.encounter.class",
        `Encounter class "${r.class?.code ?? ""}" is not one CarePath records (AMB in person, VR video).`,
        "class",
      ),
    );
  if (!coding)
    issues.push(
      mapIssue(
        "error",
        "required",
        "map.encounter.type",
        "Encounter type needs a coding with a system and a code.",
        "type",
      ),
    );
  if (!subject || subject.type !== "Patient")
    issues.push(
      mapIssue(
        "error",
        "required",
        "map.encounter.subject",
        "Encounter subject must be a patient.",
        "subject",
      ),
    );
  if (!practitioner)
    issues.push(
      mapIssue(
        "error",
        "required",
        "map.encounter.participant",
        "CarePath records the practitioner of every visit; no participant resolves to one.",
        "participant",
      ),
    );
  if (!start)
    issues.push(
      mapIssue(
        "error",
        "required",
        "map.encounter.period",
        "Encounter needs period.start with a time.",
        "period.start",
      ),
    );
  else if (status === "finished" && !end)
    issues.push(
      mapIssue(
        "error",
        "required",
        "map.encounter.period",
        "A finished encounter needs period.end.",
        "period.end",
      ),
    );
  if (issues.length) return { record: null, issues };
  return {
    record: {
      id: r.id ?? "",
      patientId: subject!.id,
      practitionerId: practitioner!.id,
      appointmentId: appointment?.type === "Appointment" ? appointment.id : null,
      class: klass!,
      typeSystem: coding!.system!,
      typeCode: coding!.code!,
      typeDisplay: coding!.display ?? r.type?.[0]?.text ?? coding!.code!,
      status: status!,
      startedAt: start!,
      endedAt: end,
    },
    issues: [],
  };
}
