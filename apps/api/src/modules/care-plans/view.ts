import type { CarePlanView } from "@carepath/shared/contracts";
import type { RequestCtx } from "../../core/context.js";
import type { DbClient } from "../../core/db/repo.js";
import { practitionerRef } from "../../core/people.js";
import { findVersionByNumber, planGoals, toRenderItem, type VersionRow } from "./repo.js";
import { renderCarePlanView } from "./serializer.js";

/** A published version as the patient sees it, with the diff from the version before it. */
export async function publishedView(
  db: DbClient,
  ctx: Pick<RequestCtx, "orgId">,
  patientId: string,
  version: VersionRow,
): Promise<CarePlanView> {
  const previous =
    version.versionNumber > 1
      ? await findVersionByNumber(db, ctx, version.carePlanId, version.versionNumber - 1)
      : null;
  return renderCarePlanView({
    carePlanId: version.carePlanId,
    preview: false,
    title: version.title,
    instructions: version.instructions,
    version: {
      id: version.id,
      number: version.versionNumber,
      publishedAt: version.publishedAt,
      publishedBy: practitionerRef(version.publishedBy),
      changeNoteForPatient: version.changeNoteForPatient,
      isCurrent: version.carePlan.currentVersionId === version.id,
    },
    items: version.assignments.map(toRenderItem),
    goals: await planGoals(db, ctx, patientId, version.carePlanId),
    previous: previous
      ? { number: previous.versionNumber, items: previous.assignments.map(toRenderItem) }
      : null,
  });
}
