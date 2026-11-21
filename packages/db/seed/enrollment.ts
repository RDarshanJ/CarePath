/**
 * Demo eligibility codes (AC-A3), per organization N:
 *   CAREPATH-N-START-1 to -3   unused, valid for 90 days after the anchor
 *   CAREPATH-N-USED            redeemed by a patient who signed up (intake persona in org 1)
 *   CAREPATH-N-EXPIRED         never redeemed, expired the day before the anchor
 * The plain codes are listed in docs/demo-accounts.md; only their hashes are stored.
 */
import { enrollmentCodeLabel, hashEnrollmentCode } from "@carepath/shared/enrollment-code";
import { D, H, iso, type Ctx, type OrgInfo, type PatientInfo } from "./ctx.js";

export function demoEnrollmentCodes(orgIndex: number) {
  const n = orgIndex + 1;
  return {
    unused: [1, 2, 3].map((k) => `CAREPATH-${n}-START-${k}`),
    used: `CAREPATH-${n}-USED`,
    expired: `CAREPATH-${n}-EXPIRED`,
  };
}

/** The patient who redeemed the org's used code: the intake persona, else the newest sign-up. */
function redeemer(ctx: Ctx, org: OrgInfo): PatientInfo | null {
  const withLogin = ctx.patients.filter((p) => p.org === org && p.userId !== null);
  const persona = withLogin.find((p) => p.persona === "intake");
  if (persona) return persona;
  const newest = [...withLogin].sort((a, b) => b.createdAtMs - a.createdAtMs || a.index - b.index);
  return newest[0] ?? null;
}

export function buildEnrollmentCodes(ctx: Ctx): void {
  const issuedMs = ctx.anchorMs - 30 * D;
  for (const org of ctx.orgs) {
    const codes = demoEnrollmentCodes(org.index);
    const row = (code: string, expiresMs: number, createdMs: number, patient: PatientInfo | null) =>
      ctx.t.EnrollmentCode.push({
        id: ctx.id("enrollment-code", `${org.id}/${code}`),
        organizationId: org.id,
        codeHash: hashEnrollmentCode(code),
        label: enrollmentCodeLabel(code),
        expiresAt: iso(expiresMs),
        redeemedAt: patient ? iso(patient.createdAtMs) : null,
        redeemedByPatientId: patient ? patient.id : null,
        revokedAt: null,
        createdAt: iso(createdMs),
      });
    for (const code of codes.unused) row(code, ctx.anchorMs + 90 * D, issuedMs, null);
    const patient = redeemer(ctx, org);
    if (patient) {
      row(codes.used, ctx.anchorMs + 90 * D, Math.min(issuedMs, patient.createdAtMs - H), patient);
    }
    row(codes.expired, ctx.anchorMs - D, issuedMs - D, null);
  }
}
