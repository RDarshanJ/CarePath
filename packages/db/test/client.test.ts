import { afterAll, describe, expect, it } from "vitest";
import { createPrismaClient } from "../src/client.js";
import { DbErrorCode, dbErrorInfo } from "../src/errors.js";
import { appointment, at, createOrg, freshDay, pool } from "./helpers.js";

const prisma = createPrismaClient();

afterAll(async () => {
  await prisma.$disconnect();
  await pool.end();
});

describe("typed Prisma client", () => {
  it("reads tenant rows with relations through the pg adapter", async () => {
    const org = await createOrg();
    const patient = await prisma.patient.findFirstOrThrow({
      where: { id: org.patientId, organizationId: org.orgId },
      include: { membership: { include: { role: true } } },
    });
    expect(patient.membership?.role.key).toBe("patient");
    expect(patient.birthDate.toISOString()).toBe("1975-09-14T00:00:00.000Z");
  });

  it("surfaces the exclusion violation code through Prisma errors", async () => {
    const org = await createOrg();
    const day = freshDay();
    const data = appointment(org, at(day, 12), at(day, 13)) as {
      organizationId: string;
      patientId: string;
      practitionerId: string;
      type: "follow_up";
      startsAt: string;
      endsAt: string;
      bookedTimezone: string;
    };
    await prisma.appointment.create({ data });
    const error = await prisma.appointment.create({ data }).catch((e: unknown) => e);
    expect(dbErrorInfo(error)?.code).toBe(DbErrorCode.exclusionViolation);
  });
});
