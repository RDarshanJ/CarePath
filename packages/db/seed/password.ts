import { createHash } from "node:crypto";
import { hashPassword } from "@carepath/shared/password";
import { DEMO_PASSWORD } from "./people.js";

let cached: Promise<string> | undefined;

/**
 * scrypt hash of the shared demo password, in the format of packages/shared/src/password.ts
 * (the one the API verifies). The salt is fixed so the seed is reproducible; real accounts
 * created through the API get a random salt.
 */
export function seedPasswordHash(): Promise<string> {
  cached ??= hashPassword(DEMO_PASSWORD, {
    salt: createHash("sha256").update("carepath-seed-salt-v1").digest().subarray(0, 16),
  });
  return cached;
}
