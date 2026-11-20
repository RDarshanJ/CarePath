import type { CarePlan, CarePlanActivity, Extension } from "@medplum/fhirtypes";
import { EXTENSIONS, identifierSystem, parseIdentifierSystem, SYSTEMS } from "../config.js";
import {
  activityStatusFor,
  carePlanStatusFromFhir,
  carePlanStatusToFhir,
  dayFromFhir,
  dayToFhir,
} from "../codes.js";
import type { FhirIssue } from "../issues.js";
import type { CarePlanActivityRecord, CarePlanRecord } from "../types.js";
import {
  instantUtc,
  mapIssue,
  narrative,
  ref,
  type FromFhirContext,
  type MapResult,
  type ToFhirContext,
} from "./common.js";

const DOSE_FIELDS = ["sets", "reps", "holdSeconds", "durationSeconds", "restSeconds"] as const;

function doseExtension(a: CarePlanActivityRecord): Extension {
  return {
    url: EXTENSIONS.exerciseDose,
    extension: DOSE_FIELDS.flatMap((f) =>
      a[f] === null ? [] : [{ url: f, valueInteger: a[f] as number }],
    ),
  };
}

/** Dose text for people reading the resource without CarePath's extension. */
function doseText(a: CarePlanActivityRecord): string {
  const parts = [
    a.sets !== null ? `${a.sets} sets` : null,
    a.reps !== null ? `${a.reps} reps` : null,
    a.holdSeconds !== null ? `hold ${a.holdSeconds} s` : null,
    a.durationSeconds !== null ? `${a.durationSeconds} s` : null,
  ].filter(Boolean);
  return parts.join(", ");
}

/**
 * CarePlan (US Core mandatory: status, intent, subject, category assess-plan). One published
 * version is one CarePlan: id = version id; identifiers carry the plan id and the version id;
 * the version number is a CarePath extension. Exercises are inline `activity.detail` with kind
 * ServiceRequest, never `activity.reference` (cpl-3). Narrative text is generated (US Core Must
 * Support).
 */
export function carePlanToFhir(c: CarePlanRecord, ctx: ToFhirContext): CarePlan {
  const activityStatus = activityStatusFor(c.status) as NonNullable<
    CarePlanActivity["detail"]
  >["status"];
  return {
    resourceType: "CarePlan",
    id: c.versionId,
    text: narrative([
      `${c.title} (version ${c.versionNumber})`,
      ...(c.instructions ? [c.instructions] : []),
      ...c.activities.map((a) => `${a.exerciseName}: ${doseText(a)}`),
    ]),
    extension: [{ url: EXTENSIONS.carePlanVersionNumber, valueInteger: c.versionNumber }],
    identifier: [
      { system: identifierSystem(ctx.orgSlug, "care-plan"), value: c.carePlanId },
      { system: identifierSystem(ctx.orgSlug, "care-plan-version"), value: c.versionId },
    ],
    status: carePlanStatusToFhir(c.status) as CarePlan["status"],
    intent: "plan",
    category: [{ coding: [{ system: SYSTEMS.carePlanCategory, code: "assess-plan" }] }],
    title: c.title,
    ...(c.instructions ? { description: c.instructions } : {}),
    subject: ref("Patient", c.patientId),
    created: c.publishedAt,
    author: ref("Practitioner", c.authorPractitionerId),
    ...(c.replacesVersionId ? { replaces: [ref("CarePlan", c.replacesVersionId)] } : {}),
    ...(c.goalIds.length ? { goal: c.goalIds.map((g) => ref("Goal", g)) } : {}),
    ...(c.changeNoteForPatient ? { note: [{ text: c.changeNoteForPatient }] } : {}),
    ...(c.activities.length
      ? {
          activity: c.activities.map((a) => ({
            extension: [doseExtension(a)],
            detail: {
              kind: "ServiceRequest" as const,
              code: {
                coding: [
                  { system: SYSTEMS.exercise, code: a.exerciseSlug, display: a.exerciseName },
                ],
                text: a.exerciseName,
              },
              status: activityStatus,
              ...(a.instructions ? { description: a.instructions } : {}),
              scheduledTiming: {
                repeat: {
                  frequency: a.timesPerDay,
                  period: 1,
                  periodUnit: "d" as const,
                  dayOfWeek: a.daysOfWeek.map(dayToFhir) as ("mon" | "tue")[],
                },
              },
            },
          })),
        }
      : {}),
  };
}

function intExt(ext: Extension[] | undefined, url: string): number | null {
  const v = ext?.find((e) => e.url === url)?.valueInteger;
  return typeof v === "number" ? v : null;
}

function activityFromFhir(
  a: CarePlanActivity,
  i: number,
): { activity: CarePlanActivityRecord | null; issue?: FhirIssue } {
  const coding = a.detail?.code?.coding?.find((c) => c.system === SYSTEMS.exercise && c.code);
  if (!coding) {
    return {
      activity: null,
      issue: mapIssue(
        "warning",
        "not-supported",
        "map.careplan.activity.not-exercise",
        "Activity is not a CarePath exercise code; it is not imported as an exercise.",
        `activity[${i}]`,
      ),
    };
  }
  const dose = a.extension?.find((e) => e.url === EXTENSIONS.exerciseDose)?.extension;
  const repeat = a.detail?.scheduledTiming?.repeat;
  const days = (repeat?.dayOfWeek ?? []).map(dayFromFhir).filter((d): d is number => d !== null);
  return {
    activity: {
      exerciseSlug: coding.code!,
      exerciseName: coding.display ?? a.detail?.code?.text ?? coding.code!,
      sets: intExt(dose, "sets"),
      reps: intExt(dose, "reps"),
      holdSeconds: intExt(dose, "holdSeconds"),
      durationSeconds: intExt(dose, "durationSeconds"),
      restSeconds: intExt(dose, "restSeconds") ?? 30,
      daysOfWeek: days.length ? days : [0, 1, 2, 3, 4, 5, 6],
      timesPerDay: repeat?.frequency ?? 1,
      instructions: a.detail?.description ?? null,
    },
  };
}

export function carePlanFromFhir(r: CarePlan, ctx: FromFhirContext): MapResult<CarePlanRecord> {
  const issues: FhirIssue[] = [];
  const status = carePlanStatusFromFhir(r.status);
  const subject = ctx.resolve(r.subject, "subject");
  const author = (r.author ? ctx.resolve(r.author, "author") : null) ?? null;
  const title =
    r.title ??
    r.category?.find((c) => !c.coding?.some((x) => x.code === "assess-plan"))?.text ??
    r.category?.flatMap((c) => c.coding ?? []).find((x) => x.code !== "assess-plan")?.display ??
    null;
  const published = instantUtc(r.created) ?? instantUtc(r.period?.start);
  if (!status)
    issues.push(
      mapIssue(
        "error",
        "code-invalid",
        "map.careplan.status",
        "CarePlan status is not one CarePath stores.",
        "status",
      ),
    );
  if (!subject || subject.type !== "Patient")
    issues.push(
      mapIssue(
        "error",
        "required",
        "map.careplan.subject",
        "CarePlan subject must be a patient.",
        "subject",
      ),
    );
  if (!author || author.type !== "Practitioner")
    issues.push(
      mapIssue(
        "error",
        "required",
        "map.careplan.author",
        "CarePath needs a practitioner as the author of every care plan version.",
        "author",
      ),
    );
  if (!title)
    issues.push(
      mapIssue(
        "error",
        "required",
        "map.careplan.title",
        "CarePlan has no title and no category text to use as one.",
        "title",
      ),
    );
  if (!published)
    issues.push(
      mapIssue(
        "error",
        "required",
        "map.careplan.created",
        "CarePlan needs a created or period.start time.",
        "created",
      ),
    );
  const activities: CarePlanActivityRecord[] = [];
  (r.activity ?? []).forEach((a, i) => {
    const out = activityFromFhir(a, i);
    if (out.activity) activities.push(out.activity);
    if (out.issue) issues.push(out.issue);
  });
  if (issues.some((i) => i.severity === "error")) return { record: null, issues };

  let carePlanId: string | null = null;
  let versionId: string | null = null;
  for (const id of r.identifier ?? []) {
    const parsed = parseIdentifierSystem(id.system);
    if (parsed?.kind === "care-plan" && id.value) carePlanId = id.value;
    if (parsed?.kind === "care-plan-version" && id.value) versionId = id.value;
  }
  const replaces = r.replaces?.[0] ? ctx.resolve(r.replaces[0], "replaces[0]") : null;
  return {
    record: {
      versionId: versionId ?? r.id ?? "",
      carePlanId: carePlanId ?? r.id ?? "",
      patientId: subject!.id,
      versionNumber: intExt(r.extension, EXTENSIONS.carePlanVersionNumber) ?? 1,
      title: title!,
      instructions: r.description ?? "",
      changeNoteForPatient: r.note?.[0]?.text ?? null,
      status: status!,
      authorPractitionerId: author!.id,
      publishedAt: published!,
      replacesVersionId: replaces?.type === "CarePlan" ? replaces.id : null,
      goalIds: (r.goal ?? [])
        .map((g, i) => ctx.resolve(g, `goal[${i}]`))
        .filter((g): g is { type: string; id: string } => g?.type === "Goal")
        .map((g) => g.id),
      activities,
    },
    issues,
  };
}
