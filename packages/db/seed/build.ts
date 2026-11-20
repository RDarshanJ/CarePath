/**
 * Pure dataset generator: profile + seed + anchor in, rows out. No database, no clock, no
 * platform randomness, so the same inputs always return the same rows (tested through a content hash).
 */
import { buildActivity } from "./activity.js";
import { buildCarePlans, buildExercises } from "./careplans.js";
import { buildConversations } from "./comms.js";
import { makeCtx } from "./ctx.js";
import { buildDocumentation } from "./documentation.js";
import { buildEnrollmentCodes } from "./enrollment.js";
import { buildOps } from "./ops.js";
import { DEMO_PASSWORD, buildPeople } from "./people.js";
import { DEFAULT_ANCHOR, DEFAULT_SEED, type SeedProfile } from "./profiles.js";
import { buildScheduling } from "./scheduling.js";
import type { Dataset } from "./types.js";

export interface BuildOptions {
  seed?: string;
  anchor?: string;
  /** scrypt hash of the demo password, shared by every seeded login (see seed/password.ts). */
  passwordHash: string;
}

export function buildDataset(profile: SeedProfile, options: BuildOptions): Dataset {
  const seed = options.seed ?? DEFAULT_SEED;
  const anchor = options.anchor ?? DEFAULT_ANCHOR;
  const anchorMs = Date.parse(anchor);
  if (Number.isNaN(anchorMs)) throw new Error(`invalid anchor date: ${anchor}`);
  const ctx = makeCtx(profile, `${seed}/${profile.name}`, anchorMs, options.passwordHash);

  const { demoAccounts } = buildPeople(ctx);
  buildEnrollmentCodes(ctx);
  buildExercises(ctx);
  buildCarePlans(ctx);
  buildActivity(ctx);
  buildScheduling(ctx);
  buildDocumentation(ctx);
  const unread = buildConversations(ctx);
  buildOps(ctx, unread);

  return {
    profile,
    seed,
    anchor: new Date(anchorMs).toISOString(),
    tables: ctx.t,
    post: ctx.post,
    demoAccounts,
    demoPassword: DEMO_PASSWORD,
  };
}
