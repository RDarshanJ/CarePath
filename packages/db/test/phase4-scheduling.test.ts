import { afterAll, describe, expect, it } from "vitest";
import { DbErrorCode as E } from "../src/errors.js";
import {
  addPatient,
  appointment,
  at,
  createOrg,
  expectDbError,
  freshDay,
  insert,
  one,
  pool,
  type Org,
} from "./helpers.js";

/**
 * Migration phase4_scheduling (checkpoint C2 section 2): an appointment with a slot matches it.
 * One rejection test per condition, plus the slot-side guard and the one-live-appointment index.
 */
afterAll(async () => {
  await pool.end();
});

async function slot(org: Org, day: Date, from: number, to: number, extra = {}): Promise<string> {
  return insert("AvailabilitySlot", {
    organizationId: org.orgId,
    practitionerId: org.practitionerId,
    startsAt: at(day, from),
    endsAt: at(day, to),
    ...extra,
  });
}

async function secondPractitioner(org: Org): Promise<string> {
  const userId = (
    await one<{ id: string }>(
      `INSERT INTO "User" (email, "passwordHash", "displayName")
       VALUES ('pt2-' || gen_random_uuid() || '@example.test', 'x', 'Synthetic PT2') RETURNING id`,
    )
  ).id;
  await pool.query(
    `INSERT INTO "OrganizationMembership" ("organizationId", "userId", "roleId")
     SELECT $1, $2, id FROM "Role" WHERE key = 'physical_therapist'`,
    [org.orgId, userId],
  );
  return insert("Practitioner", {
    organizationId: org.orgId,
    userId,
    staffId: `PT2-${userId.slice(0, 8)}`,
    givenName: "Sam",
    familyName: "Example",
  });
}

describe("appointment matches its slot (trigger Appointment_matches_slot, CP003)", () => {
  it("accepts an appointment equal to its slot and one inside it", async () => {
    const org = await createOrg();
    const day = freshDay();
    const s1 = await slot(org, day, 9, 10);
    const s2 = await slot(org, day, 10, 11);
    await insert("Appointment", appointment(org, at(day, 9), at(day, 10), { slotId: s1 }));
    await insert(
      "Appointment",
      appointment(org, at(day, 10), at(day, 10, 45), {
        slotId: s2,
        patientId: await addPatient(org.orgId),
      }),
    );
  });

  it("rejects an appointment with another practitioner than its slot", async () => {
    const org = await createOrg();
    const day = freshDay();
    const s = await slot(org, day, 9, 10);
    const other = await secondPractitioner(org);
    await expectDbError(
      insert(
        "Appointment",
        appointment(org, at(day, 9), at(day, 10), { slotId: s, practitionerId: other }),
      ),
      E.domainRule,
    );
  });

  it("rejects an appointment that starts before its slot", async () => {
    const org = await createOrg();
    const day = freshDay();
    const s = await slot(org, day, 9, 10);
    await expectDbError(
      insert("Appointment", appointment(org, at(day, 8, 30), at(day, 9, 30), { slotId: s })),
      E.domainRule,
    );
  });

  it("rejects an appointment that ends after its slot", async () => {
    const org = await createOrg();
    const day = freshDay();
    const s = await slot(org, day, 9, 10);
    await expectDbError(
      insert("Appointment", appointment(org, at(day, 9, 30), at(day, 10, 30), { slotId: s })),
      E.domainRule,
    );
  });

  it("checks UPDATE of the slot, the practitioner and the times as well", async () => {
    const org = await createOrg();
    const day = freshDay();
    const s1 = await slot(org, day, 9, 10);
    const s2 = await slot(org, day, 12, 13);
    const id = await insert(
      "Appointment",
      appointment(org, at(day, 9), at(day, 10), { slotId: s1 }),
    );
    await expectDbError(
      pool.query(`UPDATE "Appointment" SET "slotId" = $1 WHERE id = $2`, [s2, id]),
      E.domainRule,
    );
    await expectDbError(
      pool.query(
        `UPDATE "Appointment" SET "endsAt" = "endsAt" + interval '30 minutes' WHERE id = $1`,
        [id],
      ),
      E.domainRule,
    );
    const other = await secondPractitioner(org);
    await expectDbError(
      pool.query(`UPDATE "Appointment" SET "practitionerId" = $1 WHERE id = $2`, [other, id]),
      E.domainRule,
    );
  });

  it("leaves appointments without a slot (imported history) alone", async () => {
    const org = await createOrg();
    const day = freshDay();
    await insert("Appointment", appointment(org, at(day, 7), at(day, 8)));
  });

  it("refuses to move a slot out from under its appointment", async () => {
    const org = await createOrg();
    const day = freshDay();
    const s = await slot(org, day, 9, 10);
    await insert("Appointment", appointment(org, at(day, 9), at(day, 10), { slotId: s }));
    await expectDbError(
      pool.query(
        `UPDATE "AvailabilitySlot" SET "startsAt" = "startsAt" + interval '15 minutes' WHERE id = $1`,
        [s],
      ),
      E.domainRule,
    );
  });
});

describe("one live appointment per slot (Appointment_slot_live_key)", () => {
  it("rejects a second live appointment and allows one after cancellation", async () => {
    const org = await createOrg();
    const day = freshDay();
    const s = await slot(org, day, 9, 10);
    const first = await insert(
      "Appointment",
      appointment(org, at(day, 9), at(day, 9, 30), { slotId: s }),
    );
    // A different patient and a non-overlapping half of the slot: only the slot index applies.
    await expectDbError(
      insert(
        "Appointment",
        appointment(org, at(day, 9, 30), at(day, 10), {
          slotId: s,
          patientId: await addPatient(org.orgId),
        }),
      ),
      E.uniqueViolation,
      "Appointment_slot_live_key",
    );
    await pool.query(
      `UPDATE "Appointment" SET status = 'cancelled_by_clinic', "cancelledAt" = now() WHERE id = $1`,
      [first],
    );
    const again = await insert(
      "Appointment",
      appointment(org, at(day, 9), at(day, 10), { slotId: s }),
    );
    expect(again).toBeTruthy();
  });
});
