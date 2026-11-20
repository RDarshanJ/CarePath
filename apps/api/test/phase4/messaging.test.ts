import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { EMERGENCY_NOTICE } from "@carepath/shared";
import { envelope } from "@carepath/shared/contracts";
import { JobRunner } from "../../src/core/jobs/runner.js";
import {
  MESSAGE_DELIVER_QUEUE,
  messageDeliveryHandler,
} from "../../src/modules/messaging/delivery.js";
import { as, login, testApp, type Session } from "../support/http.js";
import {
  auditEventsForRequest,
  createOrgFixture,
  createTestDb,
  type OrgFixture,
} from "../support/repo.js";
import { setClinic } from "../support/fixtures/repo.js";
import { createConversation, messageRow, participantRow } from "../support/fixtures/messaging.js";

/**
 * WP 4.2: messaging. Unread counts from participant read markers, failure and retry, participant
 * only access (AC-E11), the audited coordinator read (C1 ruling 3.7).
 */
const db = createTestDb();
let app: FastifyInstance;
let org: OrgFixture;
let convId: string;
/** Thread of the patient with a therapist who is NOT on the care team (otherTherapist). */
let strangerConvId: string;
let otherConvId: string;
let patient: ReturnType<typeof as>;
let therapist: ReturnType<typeof as>;
let otherTherapist: ReturnType<typeof as>;
let otherPatient: ReturnType<typeof as>;
let coordinator: ReturnType<typeof as>;
let admin: ReturnType<typeof as>;
let patientSession: Session;

let clock = new Date("2026-11-19T16:00:00Z").getTime();
const now = () => new Date(clock);
const tick = (ms = 60_000) => (clock += ms);
let forceFailure = false;
const runner = () =>
  new JobRunner({
    db,
    now,
    handlers: {
      [MESSAGE_DELIVER_QUEUE]: messageDeliveryHandler({
        db,
        now,
        forceFailure: () => forceFailure,
      }),
    },
  });
const deliver = async () => {
  const r = runner();
  // Only this organization's jobs matter to the assertions; draining others is harmless.
  return r.drain();
};

async function send(who: ReturnType<typeof as>, id: string, body: string) {
  return who({ method: "POST", url: `/conversations/${id}/messages`, payload: { body } });
}
async function messages(who: ReturnType<typeof as>, id: string, query = "") {
  return who({ method: "GET", url: `/conversations/${id}/messages${query}` });
}
async function summaryOf(who: ReturnType<typeof as>, id: string) {
  const res = await who({ method: "GET", url: "/conversations" });
  expect(res.statusCode).toBe(200);
  return (res.json().items as { id: string; unreadCount: number; failedCount: number }[]).find(
    (c) => c.id === id,
  );
}

beforeAll(async () => {
  app = await testApp(db, { now });
  org = await createOrgFixture(db);
  await setClinic(db, org.orgId, {});
  convId = await createConversation(db, org, {
    patientId: org.patient.patientId,
    userIds: [org.patient.userId, org.therapist.userId],
  });
  strangerConvId = await createConversation(db, org, {
    patientId: org.patient.patientId,
    userIds: [org.patient.userId, org.otherTherapist.userId],
    subject: "Scheduling",
  });
  otherConvId = await createConversation(db, org, {
    patientId: org.otherPatient.patientId,
    userIds: [org.otherPatient.userId, org.otherTherapist.userId],
  });
  patientSession = await login(app, org.patient.email);
  patient = as(app, patientSession);
  therapist = as(app, await login(app, org.therapist.email));
  otherTherapist = as(app, await login(app, org.otherTherapist.email));
  otherPatient = as(app, await login(app, org.otherPatient.email));
  coordinator = as(app, await login(app, org.coordinator.email));
  admin = as(app, await login(app, org.admin.email));
});
afterAll(async () => {
  await app.close();
  await db.$disconnect();
});

describe("send, delivery and unread counts", () => {
  it("creates the message queued, delivers it by job, and counts it unread for the other side", async () => {
    tick();
    const res = await send(therapist, convId, "  Welcome. How is the knee today?  ");
    expect(res.statusCode).toBe(201);
    const sent = res.json();
    expect(sent).toMatchObject({
      status: "queued",
      body: "Welcome. How is the knee today?",
      mine: true,
      canRetry: false,
      sentAt: null,
      sender: { role: "physical_therapist", roleLabel: "Physical therapist" },
    });
    expect((await messageRow(db, sent.id)).status).toBe("queued");

    // Queued: the recipient sees nothing and has nothing unread; the sender sees it.
    expect((await messages(patient, convId)).json().items).toHaveLength(0);
    expect((await summaryOf(patient, convId))?.unreadCount).toBe(0);
    expect((await messages(therapist, convId)).json().items).toHaveLength(1);

    tick();
    const stats = await deliver();
    expect(stats.dead).toBe(0);
    expect((await messageRow(db, sent.id)).status).toBe("sent");

    const list = (await patient({ method: "GET", url: "/conversations" })).json();
    expect(list.unreadTotal).toBe(1);
    expect(list.items.find((c: { id: string }) => c.id === convId)).toMatchObject({
      unreadCount: 1,
      preview: "Welcome. How is the knee today?",
      access: "participant",
    });
    // The sender never counts their own message.
    expect((await summaryOf(therapist, convId))?.unreadCount).toBe(0);
  });

  it("feeds Today (patient) and the overview (therapist) from the same marker", async () => {
    const today = await patient({ method: "GET", url: `/patients/${org.patient.patientId}/today` });
    expect(today.statusCode).toBe(200);
    expect(today.json().messages).toEqual({ unreadCount: 1, unreadConversations: 1 });
    const overview = (await therapist({ method: "GET", url: "/overview" })).json();
    expect(overview.messages).toEqual({ unreadCount: 0, unreadConversations: 0 });

    tick();
    await send(patient, convId, "Better, thank you.");
    tick();
    await deliver();
    const after = (await therapist({ method: "GET", url: "/overview" })).json();
    expect(after.messages).toEqual({ unreadCount: 1, unreadConversations: 1 });
  });

  it("mark read zeroes the count and only newer messages count again, even on a frozen clock", async () => {
    tick();
    const read = await patient({
      method: "POST",
      url: `/conversations/${convId}/read`,
      payload: {},
    });
    expect(read.statusCode).toBe(200);
    expect(read.json()).toMatchObject({ id: convId, unreadCount: 0 });
    expect((await participantRow(db, convId, org.patient.userId)).lastReadAt).not.toBeNull();
    const today = await patient({ method: "GET", url: `/patients/${org.patient.patientId}/today` });
    expect(today.json().messages.unreadCount).toBe(0);

    // No tick: the clock has not moved since the read, yet the new message is unread.
    await send(therapist, convId, "Great. Keep the same plan this week.");
    await deliver();
    expect((await summaryOf(patient, convId))?.unreadCount).toBe(1);
    await send(therapist, convId, "Also drink water.");
    await deliver();
    expect((await summaryOf(patient, convId))?.unreadCount).toBe(2);
    await patient({ method: "POST", url: `/conversations/${convId}/read`, payload: {} });
    expect((await summaryOf(patient, convId))?.unreadCount).toBe(0);
    // Reading does not touch the other participant's marker.
    expect((await summaryOf(therapist, convId))?.unreadCount).toBe(1);
  });

  it("returns messages newest first in pages, with the composer copy", async () => {
    const first = await messages(patient, convId, "?limit=2");
    expect(first.statusCode).toBe(200);
    const a = first.json();
    expect(a.items).toHaveLength(2);
    expect(a.nextCursor).not.toBeNull();
    expect(a.items[0].body).toBe("Also drink water.");
    expect(a.composer).toEqual({
      replyTimeText: "Your care team usually replies within one business day.",
      emergencyNotice: EMERGENCY_NOTICE,
    });
    expect(a.conversation.participants.map((p: { roleLabel: string }) => p.roleLabel)).toEqual([
      "Patient",
      "Physical therapist",
    ]);
    const second = (await messages(patient, convId, `?limit=2&cursor=${a.nextCursor}`)).json();
    expect(second.items).toHaveLength(2);
    expect(second.nextCursor).toBeNull();
    const all = [...a.items, ...second.items].map((m: { createdAt: string }) => m.createdAt);
    expect([...all].sort().reverse()).toEqual(all);
  });

  it("rejects empty, oversized and unknown-key bodies", async () => {
    for (const payload of [{ body: "   " }, { body: "x".repeat(2001) }, { body: "hi", extra: 1 }]) {
      const res = await patient({
        method: "POST",
        url: `/conversations/${convId}/messages`,
        payload,
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe("validation_error");
    }
  });
});

describe("failed delivery and retry", () => {
  it("leaves a visible failed state the sender can retry, never shown to the recipient", async () => {
    forceFailure = true;
    tick();
    const sent = (await send(patient, convId, "My knee clicks on stairs.")).json();
    const stats = await deliver();
    expect(stats.dead).toBe(0);
    const row = await messageRow(db, sent.id);
    expect(row.status).toBe("failed");
    expect(row.failureReason).toMatch(/could not be delivered/);

    const mine = (await messages(patient, convId)).json().items[0];
    expect(mine).toMatchObject({ id: sent.id, status: "failed", canRetry: true, mine: true });
    expect(mine.failureReason).toMatch(/try again/);
    expect((await summaryOf(patient, convId))?.failedCount).toBe(1);

    // The recipient sees nothing of it and has no unread count for it.
    const theirs = (await messages(therapist, convId)).json().items;
    expect(theirs.map((m: { id: string }) => m.id)).not.toContain(sent.id);
    expect((await summaryOf(therapist, convId))?.unreadCount).toBe(1);

    // Only the sender may retry; a sent message cannot be retried.
    const notSender = await therapist({
      method: "POST",
      url: `/conversations/${convId}/messages/${sent.id}/retry`,
      payload: {},
    });
    expect(notSender.statusCode).toBe(403);
    expect(notSender.json().error.code).toBe("forbidden");

    // A retry while delivery still fails goes back to failed.
    tick();
    const again = await patient({
      method: "POST",
      url: `/conversations/${convId}/messages/${sent.id}/retry`,
      payload: {},
    });
    expect(again.statusCode).toBe(200);
    expect(again.json()).toMatchObject({ status: "queued", failureReason: null });
    await deliver();
    expect((await messageRow(db, sent.id)).status).toBe("failed");

    forceFailure = false;
    tick();
    expect(
      (
        await patient({
          method: "POST",
          url: `/conversations/${convId}/messages/${sent.id}/retry`,
          payload: {},
        })
      ).statusCode,
    ).toBe(200);
    await deliver();
    expect((await messageRow(db, sent.id)).status).toBe("sent");
    expect((await summaryOf(patient, convId))?.failedCount).toBe(0);
    expect((await summaryOf(therapist, convId))?.unreadCount).toBe(2);

    const sentAgain = await patient({
      method: "POST",
      url: `/conversations/${convId}/messages/${sent.id}/retry`,
      payload: {},
    });
    expect(sentAgain.statusCode).toBe(409);
    expect(sentAgain.json().error.code).toBe("invalid_transition");
  });

  it("scopes the delivery job by job.organizationId", async () => {
    const other = await createOrgFixture(db);
    const sent = (await send(patient, convId, "Scope probe.")).json();
    // A job naming another organization must not deliver this organization's message.
    await db.job.deleteMany({
      where: { queue: MESSAGE_DELIVER_QUEUE, payload: { path: ["messageId"], equals: sent.id } },
    });
    const r = runner();
    await r.enqueue({
      queue: MESSAGE_DELIVER_QUEUE,
      payload: { messageId: sent.id },
      organizationId: other.orgId,
      runAt: now(),
    });
    await r.drain();
    expect((await messageRow(db, sent.id)).status).toBe("queued");
    await r.enqueue({
      queue: MESSAGE_DELIVER_QUEUE,
      payload: { messageId: sent.id },
      organizationId: org.orgId,
      runAt: now(),
    });
    await r.drain();
    expect((await messageRow(db, sent.id)).status).toBe("sent");
  });

  it("marks a message failed when the last delivery attempt errors", async () => {
    const sent = (await send(patient, convId, "Dead letter probe.")).json();
    await db.job.deleteMany({
      where: { queue: MESSAGE_DELIVER_QUEUE, payload: { path: ["messageId"], equals: sent.id } },
    });
    const broken = messageDeliveryHandler({
      db,
      now,
      forceFailure: () => {
        throw new Error("simulated provider error");
      },
    });
    await expect(
      broken({
        id: "j",
        queue: MESSAGE_DELIVER_QUEUE,
        payload: { messageId: sent.id },
        attempts: 5,
        maxAttempts: 5,
        organizationId: org.orgId,
      }),
    ).rejects.toThrow("simulated provider error");
    expect((await messageRow(db, sent.id)).status).toBe("failed");
  });
});

describe("participant-only access (AC-E11)", () => {
  async function denied(res: Awaited<ReturnType<typeof send>>) {
    expect(res.statusCode).toBe(404);
    expect(res.body).toBe(JSON.stringify(envelope("not_found")));
    const events = await auditEventsForRequest(db, res.headers["x-request-id"] as string);
    expect(events.map((e) => e.eventName)).toContain("security.access_denied");
  }

  it("answers 404 and an audit event to a patient who is not in the thread", async () => {
    await denied(await messages(otherPatient, convId));
    await denied(await send(otherPatient, convId, "hello"));
    await denied(
      await otherPatient({ method: "POST", url: `/conversations/${convId}/read`, payload: {} }),
    );
    const mine = (await messages(patient, convId)).json().items[0];
    await denied(
      await otherPatient({
        method: "POST",
        url: `/conversations/${convId}/messages/${mine.id}/retry`,
        payload: {},
      }),
    );
    // And never in their list.
    const list = (await otherPatient({ method: "GET", url: "/conversations" })).json();
    expect(list.items.map((c: { id: string }) => c.id)).toEqual([otherConvId]);
  });

  it("answers 404 and an audit event to a clinician who is not in the thread, care team or not", async () => {
    // otherTherapist is in the organization but not in `convId`.
    await denied(await messages(otherTherapist, convId));
    await denied(await send(otherTherapist, convId, "hello"));
    // therapist is on the patient's care team but not in `strangerConvId`.
    await denied(await messages(therapist, strangerConvId));
    await denied(await send(therapist, strangerConvId, "hello"));
    const list = (await therapist({ method: "GET", url: "/conversations" })).json();
    expect(list.items.map((c: { id: string }) => c.id)).toEqual([convId]);
  });

  it("does not let a patient reach another patient's thread they sit in by a stray participant row", async () => {
    // The patient is in strangerConvId, which is their own thread: allowed.
    expect((await messages(patient, strangerConvId)).statusCode).toBe(200);
  });

  it("answers 404 for an unknown conversation id and a message id of another thread", async () => {
    await denied(await messages(patient, "11111111-1111-4111-8111-111111111111"));
    const otherMessage = (await send(otherPatient, otherConvId, "mine")).json();
    await denied(
      await patient({
        method: "POST",
        url: `/conversations/${convId}/messages/${otherMessage.id}/retry`,
        payload: {},
      }),
    );
  });

  it("gives clinic administrators no messaging access", async () => {
    const res = await admin({ method: "GET", url: "/conversations" });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe("forbidden");
  });
});

describe("coordinator read through message.org (C1 ruling 3.7)", () => {
  it("lists every conversation of the clinic without bodies or unread counts", async () => {
    const res = await coordinator({ method: "GET", url: "/conversations?limit=100" });
    expect(res.statusCode).toBe(200);
    const items = res.json().items as {
      id: string;
      access: string;
      preview: string | null;
      unreadCount: number;
    }[];
    expect(items.map((c) => c.id).sort()).toEqual([convId, strangerConvId, otherConvId].sort());
    for (const c of items) {
      expect(c).toMatchObject({ access: "organization", preview: null, unreadCount: 0 });
    }
  });

  it("reads a thread as an organization read, audited, delivered messages only", async () => {
    const res = await messages(coordinator, convId);
    expect(res.statusCode).toBe(200);
    const page = res.json();
    expect(page.conversation.access).toBe("organization");
    expect(page.items.length).toBeGreaterThan(0);
    for (const m of page.items) expect(m).toMatchObject({ status: "sent", mine: false });
    const events = await auditEventsForRequest(db, res.headers["x-request-id"] as string);
    const read = events.find((e) => e.eventName === "phi.read");
    expect(read).toMatchObject({
      resourceType: "Conversation",
      resourceId: convId,
      patientId: org.patient.patientId,
      purposeOfUse: "operations",
      detailCode: "message_org",
      actorUserId: org.coordinator.userId,
    });
  });

  it("cannot send, mark read or retry in a thread they are not in", async () => {
    for (const res of [
      await send(coordinator, convId, "hello"),
      await coordinator({ method: "POST", url: `/conversations/${convId}/read`, payload: {} }),
    ]) {
      expect(res.statusCode).toBe(404);
      const events = await auditEventsForRequest(db, res.headers["x-request-id"] as string);
      expect(events.map((e) => e.eventName)).toContain("security.access_denied");
    }
  });

  it("does not let a patient or therapist use the organization read", async () => {
    // Held message.org is the only way; patient and therapist roles lack it.
    expect(
      (await otherPatient({ method: "GET", url: `/conversations/${convId}/messages` })).statusCode,
    ).toBe(404);
  });
});
