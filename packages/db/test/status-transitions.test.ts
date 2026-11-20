import { afterAll, describe, expect, it } from "vitest";
import { canTransition, statusTransitions, transitionRows } from "../src/status.js";
import { pool } from "./helpers.js";

afterAll(async () => {
  await pool.end();
});

const key = (r: { tableName: string; column: string; fromStatus: string; toStatus: string }) =>
  `${r.tableName}.${r.column}:${r.fromStatus}->${r.toStatus}`;

describe("status transition table", () => {
  it("matches src/status.ts exactly", async () => {
    const { rows } = await pool.query(
      `SELECT "tableName", "column", "fromStatus", "toStatus" FROM "StatusTransition"`,
    );
    expect(rows.map(key).sort()).toEqual(transitionRows().map(key).sort());
  });

  it("has an enforcing trigger on every listed table", async () => {
    const { rows } = await pool.query<{ table: string }>(
      `SELECT c.relname AS table FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
       WHERE t.tgname LIKE '%\\_status\\_transition' AND NOT t.tgisinternal`,
    );
    expect(rows.map((r) => r.table).sort()).toEqual(Object.keys(statusTransitions).sort());
  });

  it("only lists statuses that exist in the column's enum", async () => {
    for (const [table, def] of Object.entries(statusTransitions)) {
      const { rows } = await pool.query<{ label: string }>(
        `SELECT e.enumlabel AS label FROM pg_attribute a
         JOIN pg_class c ON c.oid = a.attrelid JOIN pg_enum e ON e.enumtypid = a.atttypid
         WHERE c.relname = $1 AND a.attname = $2`,
        [table, def.column],
      );
      const labels = new Set(rows.map((r) => r.label));
      expect(labels.size, `${table}.${def.column} is not an enum`).toBeGreaterThan(0);
      for (const [from, tos] of Object.entries(def.allowed as Record<string, readonly string[]>)) {
        expect(labels.has(from), `${table}: ${from}`).toBe(true);
        for (const to of tos) expect(labels.has(to), `${table}: ${to}`).toBe(true);
      }
    }
  });

  it("answers canTransition consistently", () => {
    expect(canTransition("ClinicalNote", "draft", "signed")).toBe(true);
    expect(canTransition("ClinicalNote", "signed", "draft")).toBe(false);
    expect(canTransition("Appointment", "booked", "booked")).toBe(true);
  });
});
