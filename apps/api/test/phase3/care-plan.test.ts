import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { as, login, testApp, type Session } from "../support/http.js";
import { createOrgFixture, createTestDb, type OrgFixture } from "../support/repo.js";
import {
  auditEvents,
  createClinicalFixture,
  goalsOfPlan,
  tryEditVersion,
  type ClinicalFixture,
} from "../support/fixtures/repo.js";

/** Delivery step 4: Scenario B (draft, preview, publish, versions). */
const NOW = new Date("2026-11-19T16:00:00Z");
let clock = NOW;
const db = createTestDb();
let app: FastifyInstance;
let org: OrgFixture;
let orgB: OrgFixture;
let fx: ClinicalFixture;
let therapist: Session;
let patient: Session;

beforeAll(async () => {
  app = await testApp(db, { now: () => clock });
  org = await createOrgFixture(db);
  orgB = await createOrgFixture(db);
  fx = await createClinicalFixture(db, org, NOW);
  therapist = await login(app, org.therapist.email);
  patient = await login(app, org.patient.email);
});
afterAll(async () => {
  await app.close();
  await db.$disconnect();
});

const base = () => `/patients/${org.patient.patientId}`;
const DRAFT_TITLE = "Draft-only title 7f3a";

function item(exerciseId: string, position: number, reps = 10) {
  return {
    exerciseId,
    position,
    dose: { sets: 2, reps, holdSeconds: null, durationSeconds: null, restSeconds: 30 },
    schedule: { daysOfWeek: [1, 3, 5], timesPerDay: 1 },
    instructions: position === 0 ? "Keep the knee over the toes." : null,
  };
}

function content(order: string[]) {
  return {
    title: DRAFT_TITLE,
    instructions: "Fictional instructions for the draft.",
    items: order.map((id, i) => item(id, i, id === fx.exerciseIds[0] ? 14 : 12)),
    goals: [
      {
        id: null,
        description: "Walk 20 minutes",
        targetValue: 20,
        targetUnit: "min",
        dueDate: "2027-01-15",
      },
    ],
  };
}

describe("draft autosave", () => {
  let updatedAt: string;
  let openSessionId: string;

  it("has no draft at first, then saves one (the plan already exists)", async () => {
    const call = as(app, therapist);
    expect((await call({ method: "GET", url: `${base()}/care-plan/draft` })).statusCode).toBe(404);
    // The patient starts a session on version 2 before anything is published (AC-B5).
    const s = await as(app, patient)({ method: "POST", url: `${base()}/sessions`, payload: {} });
    openSessionId = s.json().id;
    expect(s.json().versionNumber).toBe(2);

    const res = await call({
      method: "PUT",
      url: `${base()}/care-plan/draft`,
      payload: {
        ...content([fx.exerciseIds[0]!, fx.exerciseIds[3]!, fx.exerciseIds[1]!]),
        expectedUpdatedAt: null,
      },
    });
    expect(res.statusCode, res.body).toBe(200);
    expect(res.json()).toMatchObject({
      carePlanId: fx.carePlanId,
      nextVersionNumber: 3,
      currentVersionId: fx.v2,
      author: { practitionerId: org.therapist.practitionerId },
    });
    updatedAt = res.json().updatedAt;
  });

  it("never shows the draft to the patient (AC-B1)", async () => {
    const call = as(app, patient);
    for (const path of ["today", "care-plan", "care-plan/versions", "progress", "sessions"]) {
      const res = await call({ method: "GET", url: `${base()}/${path}` });
      expect(res.statusCode, path).toBe(200);
      expect(res.body, path).not.toContain(DRAFT_TITLE);
      expect(res.body, path).not.toContain("Walk 20 minutes");
    }
    expect((await call({ method: "GET", url: `${base()}/care-plan/draft` })).statusCode).toBe(403);
    expect(
      (await call({ method: "GET", url: `${base()}/care-plan/draft/preview` })).statusCode,
    ).toBe(403);
  });

  it("rejects a stale save and reorders with move-style positions (AC-B8)", async () => {
    const call = as(app, therapist);
    const stale = await call({
      method: "PUT",
      url: `${base()}/care-plan/draft`,
      payload: { ...content([fx.exerciseIds[0]!]), expectedUpdatedAt: null },
    });
    expect(stale.statusCode).toBe(409);
    expect(stale.json().error.code).toBe("draft_stale");

    const badOrder = await call({
      method: "PUT",
      url: `${base()}/care-plan/draft`,
      payload: {
        ...content([]),
        items: [item(fx.exerciseIds[0]!, 1), item(fx.exerciseIds[3]!, 0)],
        expectedUpdatedAt: updatedAt,
      },
    });
    expect(badOrder.statusCode).toBe(400);

    clock = new Date(NOW.getTime() + 60_000);
    // "Move up" on the last item: it swaps with the one above and positions are renumbered.
    const moved = await call({
      method: "PUT",
      url: `${base()}/care-plan/draft`,
      payload: {
        ...content([fx.exerciseIds[0]!, fx.exerciseIds[1]!, fx.exerciseIds[3]!]),
        expectedUpdatedAt: updatedAt,
      },
    });
    expect(moved.statusCode, moved.body).toBe(200);
    expect(moved.json().content.items.map((i: { exerciseId: string }) => i.exerciseId)).toEqual([
      fx.exerciseIds[0],
      fx.exerciseIds[1],
      fx.exerciseIds[3],
    ]);
    updatedAt = moved.json().updatedAt;
    expect(updatedAt).toBe(clock.toISOString());
  });

  it("rejects exercises outside the organization's library", async () => {
    const other = await createClinicalFixture(db, orgB, NOW);
    const res = await as(
      app,
      therapist,
    )({
      method: "PUT",
      url: `${base()}/care-plan/draft`,
      payload: { ...content([other.exerciseIds[0]!]), expectedUpdatedAt: updatedAt },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.details[0]).toMatchObject({
      path: "body.items.0.exerciseId",
      issue: "unknown_exercise",
    });
  });

  it("refuses writes off the care team (403, audited) and from another organization (404) (AC-B6)", async () => {
    const off = await as(
      app,
      await login(app, org.otherTherapist.email),
    )({
      method: "PUT",
      url: `${base()}/care-plan/draft`,
      payload: { ...content([fx.exerciseIds[0]!]), expectedUpdatedAt: updatedAt },
    });
    expect(off.statusCode).toBe(403);
    expect(off.json().error.code).toBe("not_on_care_team");
    const events = await auditEvents(db, { requestId: off.headers["x-request-id"] as string });
    expect(events[0]).toMatchObject({
      eventName: "security.access_denied",
      detailCode: "not_on_care_team",
    });

    const foreign = await as(
      app,
      await login(app, orgB.therapist.email),
    )({
      method: "PUT",
      url: `${base()}/care-plan/draft`,
      payload: { ...content([fx.exerciseIds[0]!]), expectedUpdatedAt: updatedAt },
    });
    expect(foreign.statusCode).toBe(404);
    const coordinator = await as(
      app,
      await login(app, org.coordinator.email),
    )({
      method: "PUT",
      url: `${base()}/care-plan/draft`,
      payload: { ...content([fx.exerciseIds[0]!]), expectedUpdatedAt: updatedAt },
    });
    expect(coordinator.statusCode).toBe(403);
  });

  describe("preview and publish", () => {
    let preview: { plan: Record<string, unknown> & { items: Record<string, unknown>[] } };

    it("previews through the patient serializer with the diff from version 2", async () => {
      const res = await as(
        app,
        therapist,
      )({ method: "GET", url: `${base()}/care-plan/draft/preview` });
      expect(res.statusCode).toBe(200);
      preview = res.json();
      expect(preview.plan).toMatchObject({
        preview: true,
        title: DRAFT_TITLE,
        version: { id: null, number: 3, publishedAt: null, isCurrent: false },
        diffFromPrevious: { previousVersionNumber: 2 },
      });
    });

    it("requires a change note from version 2 (AC-B4)", async () => {
      for (const note of [null, "   "]) {
        const res = await as(
          app,
          therapist,
        )({
          method: "POST",
          url: `${base()}/care-plan/publish`,
          payload: { changeNoteForPatient: note, expectedUpdatedAt: updatedAt },
        });
        expect(res.statusCode).toBe(400);
        expect(res.json().error.details[0]).toMatchObject({
          path: "body.changeNoteForPatient",
          issue: "required",
        });
      }
      const stale = await as(
        app,
        therapist,
      )({
        method: "POST",
        url: `${base()}/care-plan/publish`,
        payload: { changeNoteForPatient: "x", expectedUpdatedAt: NOW.toISOString() },
      });
      expect(stale.json().error.code).toBe("draft_stale");
    });

    it("publishes version 3, audited in the same request, and clears the draft", async () => {
      clock = new Date(NOW.getTime() + 120_000);
      const res = await as(
        app,
        therapist,
      )({
        method: "POST",
        url: `${base()}/care-plan/publish`,
        payload: {
          changeNoteForPatient: "We swapped in a new hip exercise.",
          expectedUpdatedAt: updatedAt,
        },
      });
      expect(res.statusCode, res.body).toBe(201);
      const v3 = res.json();
      expect(v3).toMatchObject({
        preview: false,
        title: DRAFT_TITLE,
        version: {
          number: 3,
          isCurrent: true,
          changeNoteForPatient: "We swapped in a new hip exercise.",
        },
      });
      const events = await auditEvents(db, { requestId: res.headers["x-request-id"] as string });
      expect(events.map((e) => e.eventName)).toEqual(["careplan.publish"]);
      expect(events[0]).toMatchObject({
        resourceId: v3.version.id,
        patientId: org.patient.patientId,
      });
      expect(
        (await as(app, therapist)({ method: "GET", url: `${base()}/care-plan/draft` })).statusCode,
      ).toBe(404);
      const goals = await goalsOfPlan(db, fx.carePlanId);
      expect(goals.map((g) => [g.description, g.lifecycleStatus]).sort()).toEqual([
        ["Climb one flight of stairs without stopping", "cancelled"],
        ["Walk 20 minutes", "active"],
      ]);
    });

    it("shows the patient exactly what the preview showed (REQ-PLN-05) and the change (AC-B2, AC-B3)", async () => {
      const call = as(app, patient);
      const { plan } = (await call({ method: "GET", url: `${base()}/care-plan` })).json();
      const strip = (items: Record<string, unknown>[]) =>
        items.map(({ assignmentId: _a, ...rest }) => rest);
      expect(strip(plan.items)).toEqual(strip(preview.plan.items));
      expect(plan.diffFromPrevious).toEqual(preview.plan["diffFromPrevious"]);
      expect(plan.goals.map((g: { description: string }) => g.description)).toEqual([
        "Walk 20 minutes",
      ]);
      const today = (await call({ method: "GET", url: `${base()}/today` })).json();
      expect(today.plan.versionNumber).toBe(3);
      expect(today.planChange).toMatchObject({
        versionNumber: 3,
        changeNoteForPatient: "We swapped in a new hip exercise.",
        publishedBy: { name: "Riley Example" },
      });
      expect(plan.diffFromPrevious.added.map((e: { exerciseId: string }) => e.exerciseId)).toEqual([
        fx.exerciseIds[1],
      ]);
    });

    it("finishes the session started on version 2 against version 2 (AC-B5)", async () => {
      const call = as(app, patient);
      const s = (await call({ method: "GET", url: `${base()}/sessions/${openSessionId}` })).json();
      for (const a of s.activities) {
        await call({
          method: "PUT",
          url: `${base()}/sessions/${openSessionId}/activities/${a.id}`,
          payload: { status: "completed" },
        });
      }
      const done = await call({
        method: "POST",
        url: `${base()}/sessions/${openSessionId}/complete`,
        payload: { currentPosition: 4, elapsedSeconds: 500 },
      });
      expect(done.json()).toMatchObject({
        status: "completed",
        versionNumber: 2,
        carePlanVersionId: fx.v2,
      });
      const next = await call({ method: "POST", url: `${base()}/sessions`, payload: {} });
      expect(next.json().versionNumber).toBe(3);
    });

    it("lists all versions and refuses edits to a published one (AC-B7)", async () => {
      const list = (
        await as(app, therapist)({ method: "GET", url: `${base()}/care-plan/versions` })
      ).json();
      expect(list.items.map((v: { number: number }) => v.number)).toEqual([3, 2, 1]);
      expect(
        list.items.every(
          (v: { publishedBy: { name: string } }) => v.publishedBy.name === "Riley Example",
        ),
      ).toBe(true);
      await expect(tryEditVersion(db, fx.v1)).rejects.toThrow();
    });

    it("lets one of two concurrent publishes through", async () => {
      const call = as(app, therapist);
      clock = new Date(NOW.getTime() + 180_000);
      const saved = await call({
        method: "PUT",
        url: `${base()}/care-plan/draft`,
        payload: { ...content([fx.exerciseIds[0]!]), expectedUpdatedAt: null },
      });
      expect(saved.statusCode, saved.body).toBe(200);
      const body = {
        changeNoteForPatient: "Fewer exercises this week.",
        expectedUpdatedAt: saved.json().updatedAt,
      };
      const results = await Promise.all([
        call({ method: "POST", url: `${base()}/care-plan/publish`, payload: body }),
        call({ method: "POST", url: `${base()}/care-plan/publish`, payload: body }),
      ]);
      expect(results.map((r) => r.statusCode).sort()).toEqual([201, 409]);
    });
  });
});

describe("first plan for a new patient", () => {
  it("creates the plan on first save and publishes version 1 without a note", async () => {
    const fresh = await createOrgFixture(db);
    const freshFx = await createClinicalFixture(db, fresh, NOW);
    const t = as(app, await login(app, fresh.therapist.email));
    // otherPatient has a plan from the fixture; build one for a patient on the care team without one.
    await db.carePlan.update({ where: { id: freshFx.carePlanId }, data: { status: "revoked" } });
    const url = `/patients/${fresh.patient.patientId}`;
    const saved = await t({
      method: "PUT",
      url: `${url}/care-plan/draft`,
      payload: {
        title: "First plan",
        instructions: "",
        items: [item(freshFx.exerciseIds[0]!, 0)],
        goals: [],
        expectedUpdatedAt: null,
      },
    });
    expect(saved.statusCode, saved.body).toBe(200);
    expect(saved.json().nextVersionNumber).toBe(1);
    const pub = await t({
      method: "POST",
      url: `${url}/care-plan/publish`,
      payload: { changeNoteForPatient: null, expectedUpdatedAt: saved.json().updatedAt },
    });
    expect(pub.statusCode, pub.body).toBe(201);
    expect(pub.json()).toMatchObject({ version: { number: 1 }, diffFromPrevious: null });
  });
});
