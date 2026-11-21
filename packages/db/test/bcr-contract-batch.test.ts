import { afterAll, describe, expect, it } from "vitest";
import { DbErrorCode as E } from "../src/errors.js";
import { createOrg, expectDbError, insert, one, pool, type Org } from "./helpers.js";

/**
 * Migration bcr_contract_batch (WP B-CR): the review task history is append-only and
 * well-formed (CR-11), and the idempotency record is bounded (CR-17).
 */
afterAll(async () => {
  await pool.end();
});

async function task(org: Org): Promise<string> {
  const ruleId = await insert("ReviewRule", {
    organizationId: org.orgId,
    key: "reported_pain",
    name: "Reported pain",
    description: "Rule.",
  });
  return insert("ReviewTask", {
    organizationId: org.orgId,
    patientId: org.patientId,
    ruleId,
    dedupeKey: "k",
    explanation: "Reported pain 8 of 10.",
    priority: 80,
  });
}

function event(org: Org, taskId: string, kind: string, extra: Record<string, unknown> = {}) {
  return {
    organizationId: org.orgId,
    taskId,
    kind,
    actorUserId: org.clinicianUserId,
    ...extra,
  };
}

describe("ReviewTaskEvent", () => {
  it("is append-only", async () => {
    const org = await createOrg();
    const taskId = await task(org);
    const id = await insert(
      "ReviewTaskEvent",
      event(org, taskId, "assigned", { practitionerId: org.practitionerId }),
    );
    await expectDbError(
      pool.query(`UPDATE "ReviewTaskEvent" SET note = 'x' WHERE id = $1`, [id]),
      E.appendOnly,
    );
    await expectDbError(
      pool.query(`DELETE FROM "ReviewTaskEvent" WHERE id = $1`, [id]),
      E.appendOnly,
    );
  });

  it("names the practitioner for assign and unassign only, and needs a note to close", async () => {
    const org = await createOrg();
    const taskId = await task(org);
    await expectDbError(
      insert("ReviewTaskEvent", event(org, taskId, "assigned")),
      E.checkViolation,
      "ReviewTaskEvent_practitioner_check",
    );
    await expectDbError(
      insert(
        "ReviewTaskEvent",
        event(org, taskId, "reviewed", { practitionerId: org.practitionerId }),
      ),
      E.checkViolation,
      "ReviewTaskEvent_practitioner_check",
    );
    await expectDbError(
      insert("ReviewTaskEvent", event(org, taskId, "resolved")),
      E.checkViolation,
      "ReviewTaskEvent_close_note_check",
    );
    await expectDbError(
      insert("ReviewTaskEvent", event(org, taskId, "dismissed", { note: "  " })),
      E.checkViolation,
    );
    await insert("ReviewTaskEvent", event(org, taskId, "reviewed"));
    await insert("ReviewTaskEvent", event(org, taskId, "resolved", { note: "Done." }));
  });

  it("keeps insertion order for events at the same instant", async () => {
    const org = await createOrg();
    const taskId = await task(org);
    const at = "2026-11-19T16:00:00Z";
    for (const kind of ["reviewed", "resolved"]) {
      await insert(
        "ReviewTaskEvent",
        event(org, taskId, kind, { occurredAt: at, ...(kind === "resolved" ? { note: "n" } : {}) }),
      );
    }
    const rows = await pool.query(
      `SELECT kind FROM "ReviewTaskEvent" WHERE "taskId" = $1 ORDER BY "occurredAt", seq`,
      [taskId],
    );
    expect(rows.rows.map((r) => r.kind)).toEqual(["reviewed", "resolved"]);
  });

  it("cannot point at a task of another organization", async () => {
    const a = await createOrg();
    const b = await createOrg();
    const taskId = await task(a);
    await expectDbError(
      insert("ReviewTaskEvent", { ...event(b, taskId, "reviewed") }),
      E.foreignKeyViolation,
    );
  });
});

describe("IdempotencyKey", () => {
  const row = (org: Org, extra: Record<string, unknown> = {}) => ({
    organizationId: org.orgId,
    userId: org.patientUserId,
    scope: "book:p",
    key: "k1",
    requestHash: "h",
    statusCode: 201,
    responseBody: JSON.stringify({ id: "x" }),
    createdAt: "2026-11-19T16:00:00Z",
    expiresAt: "2026-11-20T16:00:00Z",
    ...extra,
  });

  it("holds one record per organization, user, scope and key", async () => {
    const org = await createOrg();
    await insert("IdempotencyKey", row(org));
    await expectDbError(insert("IdempotencyKey", row(org)), E.uniqueViolation);
    await insert("IdempotencyKey", row(org, { key: "k2" }));
    await insert("IdempotencyKey", row(org, { userId: org.clinicianUserId }));
    expect(
      (
        await one<{ n: string }>(
          `SELECT count(*) n FROM "IdempotencyKey" WHERE "organizationId" = $1`,
          [org.orgId],
        )
      ).n,
    ).toBe("3");
  });

  it("bounds the key, the status and the window", async () => {
    const org = await createOrg();
    await expectDbError(insert("IdempotencyKey", row(org, { key: "" })), E.checkViolation);
    await expectDbError(
      insert("IdempotencyKey", row(org, { key: "x".repeat(129) })),
      E.checkViolation,
    );
    await expectDbError(insert("IdempotencyKey", row(org, { statusCode: 409 })), E.checkViolation);
    await expectDbError(
      insert("IdempotencyKey", row(org, { expiresAt: "2026-11-19T16:00:00Z" })),
      E.checkViolation,
    );
  });
});
