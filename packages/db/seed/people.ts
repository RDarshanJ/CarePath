/**
 * Organizations, logins, memberships, practitioners, patients, care teams, consents, intake
 * answers and conditions. Fixed demo accounts and scenario personas are created here.
 */
import {
  H,
  D,
  MIN,
  emailFor,
  iso,
  isoDate,
  slugify,
  type Ctx,
  type OrgInfo,
  type PatientInfo,
  type TherapistInfo,
} from "./ctx.js";
import { clinicNames, clinicZones, familyNames, givenNames, regimens } from "./data/text.js";
import type { DemoAccount } from "./types.js";

export const DEMO_PASSWORD = "CarePath-Demo-2026";

type Status = PatientInfo["status"];

interface Persona {
  key: string;
  email: string;
  given: string;
  family: string;
  status: Status;
  regimen: string;
  startDays: number;
  ai: boolean;
  flare?: boolean;
  purpose: string;
}

/** Scenario personas, all in organization 1 and (when they have a care team) on therapist.demo. */
const personas: Persona[] = [
  {
    key: "demo",
    email: "patient.demo",
    given: "Dana",
    family: "Demopatient",
    status: "active",
    regimen: "lower back",
    startDays: 52,
    ai: true,
    purpose:
      "Main patient demo. Active plan with three versions, session history, check-ins, a booked visit tomorrow and a message thread. A session is due today (Scenario C).",
  },
  {
    key: "resume",
    email: "patient.resume",
    given: "Reese",
    family: "Resumepatient",
    status: "active",
    regimen: "knee",
    startDays: 30,
    ai: true,
    purpose: "Has a paused session from this morning, to show resume (Scenario C).",
  },
  {
    key: "intake",
    email: "patient.intake",
    given: "Indy",
    family: "Intakepatient",
    status: "intake_incomplete",
    regimen: "neck",
    startDays: 5,
    ai: false,
    purpose:
      "Intake in progress at the pain step, with no consents yet (Scenario A, incomplete intake).",
  },
  {
    key: "noai",
    email: "patient.noai",
    given: "Noel",
    family: "Noaipatient",
    status: "active",
    regimen: "neck",
    startDays: 35,
    ai: false,
    purpose:
      "Active patient without the ai_assisted_features consent: AI generation must be refused (Scenario F).",
  },
  {
    key: "flare",
    email: "patient.flare",
    given: "Flynn",
    family: "Flarepatient",
    status: "active",
    regimen: "shoulder",
    startDays: 26,
    ai: true,
    flare: true,
    purpose:
      "Recent check-in with pain 8 and an open review task on therapist.demo's queue (Scenario D).",
  },
];

export function buildPeople(ctx: Ctx): { demoAccounts: DemoAccount[] } {
  const { t, profile } = ctx;
  const demoAccounts: DemoAccount[] = [];
  const created = iso(ctx.anchorMs - (profile.historyDays + 60) * D);

  const addUser = (
    id: string,
    email: string,
    displayName: string,
    lastLoginDaysAgo: number | null,
  ) => {
    t.User.push({
      id,
      email,
      passwordHash: ctx.passwordHash,
      displayName,
      status: "active",
      lastLoginAt: lastLoginDaysAgo === null ? null : iso(ctx.anchorMs - lastLoginDaysAgo * D),
      createdAt: created,
      updatedAt: created,
    });
  };
  const addMembership = (
    org: OrgInfo,
    userId: string,
    roleKey: "patient" | "physical_therapist" | "care_coordinator" | "clinic_admin",
    at: string,
  ) => {
    t.OrganizationMembership.push({
      id: ctx.id("membership", `${org.id}/${userId}`),
      organizationId: org.id,
      userId,
      roleKey,
      status: "active",
      startedAt: at,
      endedAt: null,
      createdAt: at,
      updatedAt: at,
    });
  };

  // ---- organizations, staff -------------------------------------------------------------
  for (let oi = 0; oi < profile.orgs; oi++) {
    const name = `${clinicNames[oi % clinicNames.length] as string}${oi >= clinicNames.length ? ` ${Math.floor(oi / clinicNames.length) + 1}` : ""}`;
    const [timezone, offsetHours] = clinicZones[oi % clinicZones.length] as readonly [
      string,
      number,
    ];
    const id = ctx.id("org", String(oi + 1));
    const org: OrgInfo = {
      index: oi,
      id,
      slug: slugify(name),
      name,
      timezone,
      offsetHours,
      coordinatorUserId: ctx.id("user", `coordinator/${oi + 1}`),
      adminUserId: ctx.id("user", `admin/${oi + 1}`),
      therapists: [],
      ruleIds: {},
      exerciseIds: new Map(),
    };
    ctx.orgs.push(org);
    t.Organization.push({
      id,
      name: `${name} (synthetic)`,
      slug: org.slug,
      timezone,
      active: true,
      createdAt: created,
      updatedAt: created,
    });

    const n = oi + 1;
    const coordEmail = oi === 0 ? "coordinator.demo" : `coordinator.org${n}`;
    const adminEmail = oi === 0 ? "admin.demo" : `admin.org${n}`;
    addUser(
      org.coordinatorUserId,
      emailFor(coordEmail),
      oi === 0
        ? "Casey Democoordinator"
        : `Coordinator ${givenNames[(oi * 3) % givenNames.length]} (Org ${n})`,
      oi === 0 ? 0 : 1,
    );
    addUser(
      org.adminUserId,
      emailFor(adminEmail),
      oi === 0
        ? "Alex Demoadmin"
        : `Admin ${givenNames[(oi * 5 + 1) % givenNames.length]} (Org ${n})`,
      oi === 0 ? 1 : 2,
    );
    addMembership(org, org.coordinatorUserId, "care_coordinator", created);
    addMembership(org, org.adminUserId, "clinic_admin", created);
    if (oi === 0) {
      demoAccounts.push(
        {
          email: emailFor(coordEmail),
          role: "care_coordinator",
          organization: name,
          displayName: "Casey Democoordinator",
          purpose:
            "Enrollment, assignment, scheduling and messaging for the caseload (Scenarios A, E, H).",
        },
        {
          email: emailFor(adminEmail),
          role: "clinic_admin",
          organization: name,
          displayName: "Alex Demoadmin",
          purpose: "Settings, availability, metrics and audit (Scenarios H, I).",
        },
      );
    }

    for (let k = 1; k <= profile.therapistsPerOrg; k++) {
      const demo = oi === 0 && k === 1;
      const crossOrg = oi === 1 && k === 1;
      const email = demo ? "therapist.demo" : crossOrg ? "therapist.org2" : `pt.org${n}.${k}`;
      const given = demo
        ? "Terry"
        : crossOrg
          ? "Morgan"
          : (givenNames[(oi * 11 + k * 7) % givenNames.length] as string);
      const family = demo
        ? "Demotherapist"
        : crossOrg
          ? "Orgtwotherapist"
          : (familyNames[(oi * 13 + k * 5) % familyNames.length] as string);
      const userId = ctx.id("user", `pt/${n}/${k}`);
      const practitionerId = ctx.id("practitioner", `${n}/${k}`);
      addUser(userId, emailFor(email), `${given} ${family}`, demo ? 0 : k);
      addMembership(org, userId, "physical_therapist", created);
      t.Practitioner.push({
        id: practitionerId,
        organizationId: id,
        userId,
        staffId: `PT-${n}-${String(k).padStart(2, "0")}`,
        npi: `9${String(100_000_000 + (((oi + 1) * 7919 + k * 104_729) % 899_999_999)).padStart(9, "0")}`,
        givenName: given,
        familyName: family,
        credentials: "PT, DPT (fictional)",
        bio: "Fictional clinician profile for demonstration. Synthetic data.",
        timezone,
        active: true,
        createdAt: created,
        updatedAt: created,
      });
      const therapist: TherapistInfo = {
        userId,
        practitionerId,
        displayName: `${given} ${family}`,
        org,
        index: k,
      };
      org.therapists.push(therapist);
      if (demo) {
        demoAccounts.push({
          email: emailFor(email),
          role: "physical_therapist",
          organization: name,
          displayName: therapist.displayName,
          purpose:
            "Primary therapist for the demo patients; has a review queue, a calendar and draft and signed notes (Scenarios B, D, F).",
        });
      }
      if (crossOrg) {
        demoAccounts.push({
          email: emailFor(email),
          role: "physical_therapist",
          organization: name,
          displayName: therapist.displayName,
          purpose:
            "Account in the second organization. Use it to attempt to open an organization 1 patient record (Scenario I).",
        });
      }
    }
  }

  // ---- patients -------------------------------------------------------------------------
  const perOrg = ctx.orgs.map(
    (_, oi) =>
      Math.floor(profile.patients / profile.orgs) + (oi < profile.patients % profile.orgs ? 1 : 0),
  );
  const mix: readonly (readonly [Status, number])[] = [
    ["awaiting_assignment", 0.08],
    ["intake_incomplete", 0.08],
    ["inactive", 0.14],
    ["discharged", 0.1],
  ];

  let seq = 0;
  for (const org of ctx.orgs) {
    const rng = ctx.rng.fork(`patients/${org.index}`);
    const total = perOrg[org.index] as number;
    const orgPersonas = org.index === 0 ? personas.slice(0, total) : [];
    const generic = total - orgPersonas.length;
    const statuses: Status[] = [];
    let nonActive = 0;
    for (const [status, share] of mix) {
      const c = Math.min(
        generic - nonActive,
        Math.max(generic >= 10 ? 1 : 0, Math.round(generic * share)),
      );
      for (let i = 0; i < c; i++) statuses.push(status);
      nonActive += c;
    }
    while (statuses.length < generic) statuses.push("active");
    const shuffled = rng.shuffle(statuses);
    const therapistsByIndex = org.therapists;

    for (let i = 0; i < total; i++) {
      seq += 1;
      const persona = orgPersonas[i] ?? null;
      const status: Status = persona
        ? persona.status
        : (shuffled[i - orgPersonas.length] as Status);
      const given = persona ? persona.given : (rng.pick(givenNames) as string);
      const family = persona ? persona.family : (rng.pick(familyNames) as string);
      const regimen = persona
        ? (regimens.find((r) => r.area === persona.regimen) ?? regimens[0]!)
        : rng.pick(regimens);
      const hasLogin = persona
        ? true
        : status === "intake_incomplete" || status === "awaiting_assignment" || !rng.chance(0.08);
      const userId = hasLogin ? ctx.id("user", `patient/${org.index + 1}/${i + 1}`) : null;
      const id = ctx.id("patient", `${org.index + 1}/${i + 1}`);
      const n = org.index + 1;

      // Timeline.
      let startDays: number;
      let endDays = 0;
      if (persona) startDays = Math.min(persona.startDays, profile.historyDays - 2);
      else if (status === "active") startDays = rng.int(18, profile.historyDays);
      else if (status === "inactive") {
        endDays = rng.int(31, Math.max(32, profile.historyDays - 12));
        startDays = Math.min(profile.historyDays, endDays + rng.int(14, 30));
      } else if (status === "discharged") {
        endDays = rng.int(6, 28);
        startDays = Math.min(profile.historyDays, endDays + rng.int(24, 45));
      } else if (status === "awaiting_assignment") startDays = rng.int(1, 9);
      else startDays = rng.int(1, 14);
      const createdAtMs = ctx.anchorMs - startDays * D + rng.int(0, 8) * H;
      const activeEndMs = ctx.anchorMs - endDays * D;
      const planStartMs = createdAtMs + rng.int(2, 4) * D;

      // Therapist: persona patients with a care team use therapist.demo.
      const hasTeam = status === "active" || status === "inactive" || status === "discharged";
      const therapist = hasTeam
        ? persona
          ? (therapistsByIndex[0] as TherapistInfo)
          : rng.pick(therapistsByIndex)
        : null;

      // AI consent: personas are fixed; others vary.
      let aiMode: "active" | "none" | "revoked" | "regranted" = "none";
      if (persona) aiMode = persona.ai ? "active" : "none";
      else if (status !== "intake_incomplete") {
        aiMode = rng.weighted<"active" | "none" | "revoked" | "regranted">([
          ["active", 70],
          ["none", 15],
          ["revoked", 11],
          ["regranted", 4],
        ]);
      }

      const birthYear =
        new Date(ctx.anchorMs).getUTCFullYear() - (persona?.key === "demo" ? 41 : rng.int(22, 78));
      const birthMonth = persona?.key === "demo" ? 3 : rng.int(1, 12);
      const birthDay = persona?.key === "demo" ? 12 : rng.int(1, 28);
      const sparse = !persona && status !== "intake_incomplete" && rng.chance(0.1);
      const email = persona
        ? emailFor(persona.email)
        : userId
          ? emailFor(`patient.org${n}.${String(i + 1).padStart(3, "0")}`)
          : null;
      const phone =
        sparse || (persona === null && rng.chance(0.15))
          ? null
          : `555-01${String(rng.int(0, 99)).padStart(2, "0")}`;

      const row: PatientInfo["row"] = {
        id,
        organizationId: org.id,
        userId,
        mrn: `SYN-${n}-${String(i + 1).padStart(5, "0")}`,
        givenName: given,
        familyName: family,
        birthDate: `${birthYear}-${String(birthMonth).padStart(2, "0")}-${String(birthDay).padStart(2, "0")}`,
        gender: persona
          ? "unknown"
          : rng.weighted([
              ["female", 48],
              ["male", 48],
              ["other", 2],
              ["unknown", 2],
            ] as const),
        email: sparse ? null : email,
        phone,
        timezone: org.timezone,
        preferredLanguage: persona || rng.chance(0.9) ? "en" : "es",
        status,
        active: status !== "inactive" && status !== "discharged",
        lastActivityAt: null,
        createdAt: iso(createdAtMs),
        updatedAt: iso(createdAtMs),
      };
      t.Patient.push(row);
      const info: PatientInfo = {
        index: seq,
        id,
        org,
        userId,
        persona: persona?.key ?? null,
        status,
        givenName: given,
        familyName: family,
        createdAtMs,
        activeEndMs,
        therapist,
        aiConsent: aiMode === "active" || aiMode === "regranted",
        regimen,
        adherence: persona
          ? persona.key === "demo"
            ? 0.85
            : 0.8
          : rng.weighted([
              [0.92, 25],
              [0.7, 40],
              [0.45, 25],
              [0.2, 10],
            ] as const),
        flare: persona?.flare === true,
        planId: null,
        versions: [],
        sessions: [],
        checkIns: [],
        planStartMs,
        conditionId: null,
        row,
      };
      ctx.patients.push(info);

      if (userId) {
        addUser(
          userId,
          email ?? emailFor(`patient.org${n}.${i + 1}`),
          `${given} ${family}`,
          hasTeam ? rng.int(0, 6) : null,
        );
        addMembership(org, userId, "patient", iso(createdAtMs));
        if (persona) {
          demoAccounts.push({
            email: emailFor(persona.email),
            role: "patient",
            organization: org.name,
            displayName: `${given} ${family}`,
            purpose: persona.purpose,
          });
        }
      }

      buildCareTeam(ctx, info);
      buildConsents(ctx, info, aiMode, rng);
      buildIntake(ctx, info, rng);
      buildCondition(ctx, info, rng, sparse);
    }
  }
  return { demoAccounts };
}

function buildCareTeam(ctx: Ctx, p: PatientInfo): void {
  if (!p.therapist) return;
  const { t } = ctx;
  const teamCreated = p.createdAtMs + 1 * D + 2 * H;
  const discharged = p.status === "discharged";
  const teamId = ctx.id("careteam", p.id);
  t.CareTeam.push({
    id: teamId,
    organizationId: p.org.id,
    patientId: p.id,
    name: `${p.givenName} ${p.familyName} care team`,
    status: discharged ? "inactive" : "active",
    createdAt: iso(teamCreated),
    updatedAt: iso(discharged ? p.activeEndMs : teamCreated),
  });
  const ended = discharged ? iso(Math.max(p.activeEndMs, teamCreated)) : null;
  t.CareTeamMember.push(
    {
      id: ctx.id("ctm", `${teamId}/pt`),
      organizationId: p.org.id,
      careTeamId: teamId,
      userId: p.therapist.userId,
      role: "primary_therapist",
      startedAt: iso(teamCreated),
      endedAt: ended,
    },
    {
      id: ctx.id("ctm", `${teamId}/coord`),
      organizationId: p.org.id,
      careTeamId: teamId,
      userId: p.org.coordinatorUserId,
      role: "care_coordinator",
      startedAt: iso(teamCreated),
      endedAt: ended,
    },
  );
}

function buildConsents(
  ctx: Ctx,
  p: PatientInfo,
  aiMode: string,
  rng: ReturnType<Ctx["rng"]["fork"]>,
): void {
  const { t } = ctx;
  const capturedBy = p.userId ?? p.org.coordinatorUserId;
  const policyUri = (type: string) => `urn:carepath:policy:${type}:2026-11`;
  const add = (
    type: "treatment_and_data_use" | "ai_assisted_features",
    key: string,
    status: "active" | "inactive",
    grantedMs: number,
    revokedMs: number | null,
  ) => {
    t.Consent.push({
      id: ctx.id("consent", `${p.id}/${key}`),
      organizationId: p.org.id,
      patientId: p.id,
      type,
      status,
      policyVersion: "2026-11",
      policyUri: policyUri(type),
      grantedAt: iso(grantedMs),
      revokedAt: revokedMs === null ? null : iso(revokedMs),
      capturedByUserId: capturedBy,
      createdAt: iso(grantedMs),
      updatedAt: iso(revokedMs ?? grantedMs),
    });
  };
  const hasTreatment = p.status !== "intake_incomplete" || (p.persona === null && rng.chance(0.5));
  if (hasTreatment)
    add("treatment_and_data_use", "treatment", "active", p.createdAtMs + 10 * MIN, null);
  if (aiMode === "active")
    add("ai_assisted_features", "ai", "active", p.createdAtMs + 15 * MIN, null);
  if (aiMode === "revoked" || aiMode === "regranted") {
    const grant = p.createdAtMs + 15 * MIN;
    const revoke = Math.min(grant + rng.int(2, 10) * D, ctx.anchorMs - D);
    add("ai_assisted_features", "ai-1", "inactive", grant, Math.max(revoke, grant + H));
    if (aiMode === "regranted")
      add(
        "ai_assisted_features",
        "ai-2",
        "active",
        Math.max(revoke, grant + H) + 2 * D > ctx.anchorMs
          ? ctx.anchorMs - H
          : Math.max(revoke, grant + H) + 2 * D,
        null,
      );
  }
}

const intakeSteps = ["about-you", "reason-for-care", "pain", "history", "consent"] as const;

function buildIntake(ctx: Ctx, p: PatientInfo, rng: ReturnType<Ctx["rng"]["fork"]>): void {
  const { t } = ctx;
  const id = ctx.id("intake", p.id);
  if (p.status === "intake_incomplete") {
    const step = p.persona === "intake" ? "pain" : rng.pick(intakeSteps);
    const stepIndex = intakeSteps.indexOf(step);
    const answers: Record<string, unknown> = {};
    if (stepIndex >= 1) answers.reasonForCare = p.regimen.reason;
    if (stepIndex >= 2) answers.bodyArea = p.regimen.area;
    if (stepIndex >= 3) answers.painScore = rng.int(3, 7);
    const saved = p.createdAtMs + rng.int(10, 90) * MIN;
    t.IntakeAssessment.push({
      id,
      organizationId: p.org.id,
      patientId: p.id,
      status: "in_progress",
      currentStep: step,
      answers: answers as never,
      reasonForCare: stepIndex >= 1 ? p.regimen.reason : null,
      bodyArea: stepIndex >= 2 ? p.regimen.area : null,
      painScore: stepIndex >= 3 ? (answers.painScore as number) : null,
      startedAt: iso(p.createdAtMs),
      submittedAt: null,
      reviewedAt: null,
      updatedAt: iso(saved),
    });
    return;
  }
  const sparse = p.persona === null && rng.chance(0.1);
  const submitted = p.createdAtMs + rng.int(30, 120) * MIN;
  const reviewed = p.status === "awaiting_assignment" ? null : p.createdAtMs + 1 * D + 2 * H;
  const painScore = sparse ? null : rng.int(3, 7);
  t.IntakeAssessment.push({
    id,
    organizationId: p.org.id,
    patientId: p.id,
    status: reviewed === null ? "submitted" : "reviewed",
    currentStep: "review",
    answers: (sparse
      ? { reasonForCare: p.regimen.reason }
      : {
          reasonForCare: p.regimen.reason,
          bodyArea: p.regimen.area,
          painScore,
          priorTreatment: "none",
        }) as never,
    reasonForCare: p.regimen.reason,
    bodyArea: sparse ? null : p.regimen.area,
    painScore,
    startedAt: iso(p.createdAtMs),
    submittedAt: iso(submitted),
    reviewedAt: reviewed === null ? null : iso(reviewed),
    updatedAt: iso(reviewed ?? submitted),
  });
}

function buildCondition(
  ctx: Ctx,
  p: PatientInfo,
  rng: ReturnType<Ctx["rng"]["fork"]>,
  sparse: boolean,
): void {
  if (!p.therapist || sparse) return;
  const { t } = ctx;
  const regimens2 = [p.regimen];
  const resolved = p.status === "discharged";
  const teamCreated = p.createdAtMs + 1 * D + 2 * H;
  regimens2.forEach((r, i) => {
    const id = ctx.id("condition", `${p.id}/${i}`);
    if (i === 0) p.conditionId = id;
    t.Condition.push({
      id,
      organizationId: p.org.id,
      patientId: p.id,
      encounterId: null,
      codeSystem: "urn:carepath:synthetic-condition",
      code: r.conditionCode,
      display: r.conditionDisplay,
      category: "problem_list_item",
      clinicalStatus: resolved ? "resolved" : "active",
      verificationStatus: "confirmed",
      bodySite: r.bodySite,
      onsetDate: isoDate(p.createdAtMs - rng.int(10, 200) * D),
      abatementDate: resolved ? isoDate(p.activeEndMs) : null,
      recordedByPractitionerId: p.therapist!.practitionerId,
      note: null,
      recordedAt: iso(teamCreated),
      updatedAt: iso(resolved ? p.activeEndMs : teamCreated),
    });
  });
}
