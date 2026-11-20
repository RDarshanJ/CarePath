/**
 * Deterministic randomness for the seed. No platform random or clock calls: every value comes from a
 * seeded PRNG (mulberry32 over an FNV-1a hash of the seed string) or from the fixed anchor date.
 * Each entity kind forks its own stream, so adding rows to one kind never shifts another.
 */
import { createHash } from "node:crypto";

function fnv1a(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export class Rng {
  private state: number;

  constructor(readonly seed: string) {
    this.state = fnv1a(seed) || 1;
  }

  /** Independent stream named after a label (for example "patients" or "patients/12"). */
  fork(label: string): Rng {
    return new Rng(`${this.seed}/${label}`);
  }

  /** Uniform float in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [min, max], both inclusive. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  chance(probability: number): boolean {
    return this.next() < probability;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error("pick from an empty list");
    return items[Math.floor(this.next() * items.length)] as T;
  }

  /** Pick by relative weight, in list order. */
  weighted<T>(entries: readonly (readonly [T, number])[]): T {
    const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
    let roll = this.next() * total;
    for (const [value, weight] of entries) {
      roll -= weight;
      if (roll < 0) return value;
    }
    return (entries[entries.length - 1] as readonly [T, number])[0];
  }

  /** Fisher-Yates on a copy. */
  shuffle<T>(items: readonly T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
    }
    return copy;
  }

  /** n distinct items, order randomised. */
  sample<T>(items: readonly T[], n: number): T[] {
    return this.shuffle(items).slice(0, n);
  }
}

/**
 * Stable UUID (version 5 layout) from a namespace string and a key. Ids never come from the
 * database, so two seed runs produce the same ids and the same content hash.
 */
export function stableUuid(namespace: string, key: string): string {
  const bytes = createHash("sha1").update(`${namespace}\u0000${key}`).digest().subarray(0, 16);
  bytes[6] = ((bytes[6] as number) & 0x0f) | 0x50;
  bytes[8] = ((bytes[8] as number) & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
