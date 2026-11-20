import type { RequestCtx } from "../../core/context.js";
import type { DbClient } from "../../core/db/repo.js";

/** The caller's organization: name, time zone and the clinic contact settings. */
export async function findClinic(db: DbClient, ctx: Pick<RequestCtx, "orgId">) {
  return db.organization.findUniqueOrThrow({
    where: { id: ctx.orgId },
    select: { id: true, name: true, timezone: true, phone: true, replyTimeText: true },
  });
}
