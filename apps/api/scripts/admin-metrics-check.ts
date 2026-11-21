/**
 * WP 6.1 gate, AC-H3 on the seed: for every organization in the database at DATABASE_URL
 * (normally a freshly seeded gate database), computes the six metrics at the seed anchor,
 * compares the four that plain SQL can count with independent SQL counts, and walks every
 * drill-down list page by page to check that its rows equal the count the metric states.
 * Exit 1 on any difference.
 *   tsx scripts/admin-metrics-check.ts
 */
import { metricListKeys } from "@carepath/shared/contracts";
import { buildApp } from "../src/app.js";
import { computeAll, computeRows } from "../src/modules/admin/metrics/service.js";
import { sqlCounts } from "../test/support/admin/repo.js";

const ANCHOR = new Date(process.env["CAREPATH_FIXED_NOW"] ?? "2026-11-19T16:00:00.000Z");
const DAY = 86_400_000;
const app = await buildApp({ config: { logLevel: "silent", allowedOrigins: [] } });
let problems = 0;
const fail = (msg: string) => {
  problems += 1;
  console.error(`FAIL ${msg}`);
};
try {
  const { db } = app.deps;
  const orgs = await db.organization.findMany({
    select: { id: true, slug: true, timezone: true },
    orderBy: { slug: "asc" },
  });
  for (const org of orgs) {
    const scope = { orgId: org.id };
    const metrics = await computeAll(db, scope, ANCHOR, org.timezone);
    const get = (key: string) => metrics.find((m) => m.key === key)!;
    const sql = await sqlCounts(db, org.id, new Date(ANCHOR.getTime() - 30 * DAY), ANCHOR);
    const same = (name: string, got: number | null, want: number) => {
      if (got !== want) fail(`${org.slug} ${name}: metric ${got}, SQL ${want}`);
    };
    same("enrollment numerator", get("enrollment_completion").numerator, sql.submitted);
    same("enrollment denominator", get("enrollment_completion").denominator, sql.accounts);
    same("utilisation numerator", get("appointment_utilisation").numerator, sql.usedMinutes);
    same(
      "utilisation denominator",
      get("appointment_utilisation").denominator,
      sql.publishedMinutes,
    );
    same("cancellations numerator", get("cancellations").numerator, sql.cancelled);
    same("cancellations denominator", get("cancellations").denominator, sql.booked);
    same("care plan numerator", get("care_plan_activation").numerator, sql.activeWithPlan);
    same("care plan denominator", get("care_plan_activation").denominator, sql.activePatients);
    same("pending review", get("pending_review_items").numerator, sql.pending);

    const line: string[] = [];
    for (const m of metrics) {
      line.push(`${m.key}=${m.numerator}${m.denominator === null ? "" : `/${m.denominator}`}`);
      for (const key of metricListKeys[m.key]) {
        const list = m.lists.find((l) => l.key === key)!;
        let offset = 0;
        let rows = 0;
        let minutes = 0;
        for (;;) {
          const page = await computeRows(
            db,
            scope,
            m.key,
            key,
            { offset, limit: 100 },
            ANCHOR,
            org.timezone,
          );
          if (!page) break;
          rows += page.items.length;
          for (const r of page.items) if (r.kind === "slot") minutes += r.minutes;
          if (!page.nextCursor) break;
          offset += 100;
        }
        if (rows !== list.count)
          fail(`${org.slug} ${m.key}/${key}: ${rows} rows, count ${list.count}`);
        if (list.minutes !== null && minutes !== list.minutes) {
          fail(`${org.slug} ${m.key}/${key}: ${minutes} minutes, stated ${list.minutes}`);
        }
        const amount = m.unit === "minutes" ? list.minutes : list.count;
        if (list.role === "numerator") same(`${m.key}/${key} numerator list`, amount, m.numerator);
        if (list.role === "denominator")
          same(`${m.key}/${key} denominator list`, amount, m.denominator ?? 0);
        if (list.role === "remainder") {
          same(`${m.key}/${key} remainder list`, amount, (m.denominator ?? 0) - m.numerator);
        }
      }
    }
    console.log(`${org.slug}: ${line.join(" ")}`);
  }
  console.log(`organizations checked: ${orgs.length}, differences: ${problems}`);
} finally {
  await app.close();
}
process.exit(problems ? 1 : 0);
