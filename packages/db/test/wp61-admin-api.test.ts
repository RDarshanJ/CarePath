import { createHash, randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { DbErrorCode as E } from "../src/errors.js";
import { createOrg, expectDbError, insert, pool } from "./helpers.js";

/** Migration wp61_admin_api: an eligibility code is revoked or redeemed, never both. */
afterAll(async () => {
  await pool.end();
});

const hash = (code: string) => createHash("sha256").update(code).digest("hex");
const CHECK = "EnrollmentCode_revoked_unredeemed_check";

describe("EnrollmentCode.revokedAt", () => {
  it("accepts a revoked, unredeemed code and refuses one that is also redeemed", async () => {
    const org = await createOrg();
    const code = `DEMO-${randomUUID()}`;
    const id = await insert("EnrollmentCode", {
      organizationId: org.orgId,
      codeHash: hash(code),
      label: code.slice(-4),
      expiresAt: "2030-01-01T00:00:00Z",
    });
    await pool.query(`UPDATE "EnrollmentCode" SET "revokedAt" = now() WHERE id = $1`, [id]);
    await expectDbError(
      pool.query(
        `UPDATE "EnrollmentCode" SET "redeemedAt" = now(), "redeemedByPatientId" = $1 WHERE id = $2`,
        [org.patientId, id],
      ),
      E.checkViolation,
      CHECK,
    );
  });

  it("refuses to revoke a redeemed code", async () => {
    const org = await createOrg();
    const code = `DEMO-${randomUUID()}`;
    const id = await insert("EnrollmentCode", {
      organizationId: org.orgId,
      codeHash: hash(code),
      label: code.slice(-4),
      expiresAt: "2030-01-01T00:00:00Z",
    });
    await pool.query(
      `UPDATE "EnrollmentCode" SET "redeemedAt" = now(), "redeemedByPatientId" = $1 WHERE id = $2`,
      [org.patientId, id],
    );
    await expectDbError(
      pool.query(`UPDATE "EnrollmentCode" SET "revokedAt" = now() WHERE id = $1`, [id]),
      E.checkViolation,
      CHECK,
    );
    expect(
      (await pool.query(`SELECT "revokedAt" FROM "EnrollmentCode" WHERE id = $1`, [id])).rows[0]
        .revokedAt,
    ).toBeNull();
  });
});
