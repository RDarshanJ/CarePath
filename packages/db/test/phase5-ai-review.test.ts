import { afterAll, describe, expect, it } from "vitest";
import { DbErrorCode as E } from "../src/errors.js";
import { addPatient, createOrg, expectDbError, insert, one, pool, type Org } from "./helpers.js";

/**
 * Migration phase5_ai_review (WP 5.2): revisions are a review kind, one decision per
 * generation and nothing after it, only succeeded generations are reviewed, regenerations stay
 * with the same patient, and a completed generation never changes.
 */
afterAll(async () => {
  await pool.end();
});

function generation(org: Org, extra: Record<string, unknown> = {}) {
  return {
    organizationId: org.orgId,
    patientId: org.patientId,
    kind: "progress_summary",
    provider: "deterministic",
    providerLabel: "Demo provider, rule-based",
    promptKey: "progress_summary",
    promptVersion: "test",
    status: "succeeded",
    input: JSON.stringify({}),
    output: JSON.stringify({ draft: {} }),
    requestedByUserId: org.clinicianUserId,
    completedAt: new Date().toISOString(),
    ...extra,
  };
}

function review(org: Org, generationId: string, decision: string, extra = {}) {
  return {
    organizationId: org.orgId,
    generationId,
    reviewerUserId: org.clinicianUserId,
    decision,
    editedOutput: JSON.stringify({ state: {} }),
    ...extra,
  };
}

describe("AIReview order (trigger AIReview_order, index AIReview_one_decision_key)", () => {
  it("accepts revisions then one decision, and nothing after the decision", async () => {
    const org = await createOrg();
    const g = await insert("AIGeneration", generation(org));
    await insert("AIReview", review(org, g, "revised"));
    await insert("AIReview", review(org, g, "revised"));
    await insert("AIReview", review(org, g, "approved"));
    await expectDbError(insert("AIReview", review(org, g, "revised")), E.domainRule);
    await expectDbError(
      insert("AIReview", review(org, g, "rejected", { reason: "late" })),
      E.domainRule,
    );
  });

  it("backs the trigger with a partial unique index on decisions", async () => {
    const row = await one<{ indexdef: string }>(
      `SELECT indexdef FROM pg_indexes WHERE indexname = 'AIReview_one_decision_key'`,
    );
    expect(row.indexdef).toMatch(/UNIQUE INDEX .* \("generationId"\) WHERE/);
  });

  it("refuses a review of a failed generation", async () => {
    const org = await createOrg();
    const g = await insert(
      "AIGeneration",
      generation(org, { status: "failed", output: null, error: "Provider timeout." }),
    );
    await expectDbError(insert("AIReview", review(org, g, "revised")), E.domainRule);
  });

  it("requires the working state on a revision", async () => {
    const org = await createOrg();
    const g = await insert("AIGeneration", generation(org));
    await expectDbError(
      insert("AIReview", review(org, g, "revised", { editedOutput: null })),
      E.checkViolation,
      "AIReview_revision_check",
    );
  });

  it("keeps reviews append-only", async () => {
    const org = await createOrg();
    const g = await insert("AIGeneration", generation(org));
    const r = await insert("AIReview", review(org, g, "revised"));
    await expectDbError(
      pool.query(`UPDATE "AIReview" SET reason = 'x' WHERE id = $1`, [r]),
      E.appendOnly,
    );
  });
});

describe("AIGeneration lineage and immutability", () => {
  it("links a regeneration only to a generation of the same patient, never to itself", async () => {
    const org = await createOrg();
    const first = await insert("AIGeneration", generation(org));
    await insert("AIGeneration", generation(org, { previousGenerationId: first }));
    const other = await addPatient(org.orgId, "p2");
    await expectDbError(
      insert("AIGeneration", generation(org, { patientId: other, previousGenerationId: first })),
      E.domainRule,
    );
    const { id } = await one<{ id: string }>(`SELECT gen_random_uuid() AS id`);
    await expectDbError(
      insert("AIGeneration", generation(org, { id, previousGenerationId: id })),
      // The same-patient trigger finds no such row before the CHECK runs.
      E.domainRule,
    );
  });

  it("refuses to change or delete a completed generation; a pending one may complete", async () => {
    const org = await createOrg();
    const done = await insert("AIGeneration", generation(org));
    await expectDbError(
      pool.query(`UPDATE "AIGeneration" SET "providerLabel" = 'x' WHERE id = $1`, [done]),
      E.appendOnly,
    );
    await expectDbError(
      pool.query(`DELETE FROM "AIGeneration" WHERE id = $1`, [done]),
      E.appendOnly,
    );
    const pending = await insert(
      "AIGeneration",
      generation(org, { status: "pending", output: null, completedAt: null }),
    );
    await pool.query(
      `UPDATE "AIGeneration" SET status = 'failed', error = 'timeout', "completedAt" = now() WHERE id = $1`,
      [pending],
    );
    const row = await one<{ status: string }>(`SELECT status FROM "AIGeneration" WHERE id = $1`, [
      pending,
    ]);
    expect(row.status).toBe("failed");
  });
});
