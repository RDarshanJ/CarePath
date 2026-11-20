/**
 * Password hashing with scrypt (ADR-7). Server-only: import from "@carepath/shared/password",
 * never from the package root, so the web bundle never pulls in node:crypto.
 *
 * Stored format (one string, "$"-separated, every parameter explicit so it can be raised later):
 *   scrypt$<N>$<r>$<p>$<salt base64url>$<hash base64url>
 * The salt is 16 random bytes and the derived key is 64 bytes. Verification reads the
 * parameters from the stored string and compares in constant time.
 */
import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

export const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 } as const;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

function derive(
  password: string,
  salt: Buffer,
  keyLength: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password.normalize("NFKC"), salt, keyLength, options, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export interface HashPasswordOptions {
  /**
   * Fixed salt. Only for deterministic synthetic seed data; real sign-ups must leave this
   * unset so a fresh random salt is used.
   */
  salt?: Buffer;
}

export async function hashPassword(
  password: string,
  options: HashPasswordOptions = {},
): Promise<string> {
  const salt = options.salt ?? randomBytes(SALT_LENGTH);
  const { N, r, p } = SCRYPT_PARAMS;
  const key = await derive(password, salt, KEY_LENGTH, { N, r, p, maxmem: 64 * 1024 * 1024 });
  return ["scrypt", N, r, p, salt.toString("base64url"), key.toString("base64url")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (![N, r, p].every((n) => Number.isInteger(n) && n > 0)) return false;
  const salt = Buffer.from(parts[4] ?? "", "base64url");
  const expected = Buffer.from(parts[5] ?? "", "base64url");
  if (salt.length === 0 || expected.length === 0) return false;
  const actual = await derive(password, salt, expected.length, {
    N,
    r,
    p,
    maxmem: 128 * N * r + 1024 * 1024,
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
