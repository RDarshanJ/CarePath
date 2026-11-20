/**
 * Migration CLI for @carepath/db, built on Prisma's WebAssembly schema engine.
 *
 * Why not `prisma migrate`: Prisma 7's CLI downloads a native schema-engine binary from
 * binaries.prisma.sh, which this build environment blocks. The same engine ships on npm as
 * @prisma/schema-engine-wasm (pinned to the exact engine commit of prisma@7.10.1) and runs over
 * the pg driver adapter. Migration files and the `_prisma_migrations` table use Prisma's own
 * format, so `prisma migrate deploy` works unchanged wherever the binary is reachable.
 *
 * Usage (DATABASE_URL defaults to the local cluster from scripts/db.sh):
 *   tsx scripts/schema-engine.ts deploy          apply pending migrations
 *   tsx scripts/schema-engine.ts reset           drop everything, then deploy
 *   tsx scripts/schema-engine.ts create <name>   write a new migration from schema.prisma
 *   tsx scripts/schema-engine.ts check           exit 2 if migrations and schema.prisma differ
 */
import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { PrismaPg } from "@prisma/adapter-pg";
import { bindMigrationAwareSqlAdapterFactory, ColumnTypeEnum } from "@prisma/driver-adapter-utils";
import type * as EngineModule from "@prisma/schema-engine-wasm";
import type { MigrationList, SchemaEngine as SchemaEngineType } from "@prisma/schema-engine-wasm";

const here = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(here, "..");
const schemaPath = path.join(pkgRoot, "prisma", "schema.prisma");
const migrationsDir = path.join(pkgRoot, "prisma", "migrations");
const defaultUrl = "postgresql://carepath:carepath@127.0.0.1:54329/carepath";
const noFilter = { externalTables: [], externalEnums: [] };

// Minimal WebAssembly typing: the node tsconfig has no DOM lib, which declares the full API.
type WasmExports = Record<string, unknown>;
const Wasm = (
  globalThis as unknown as {
    WebAssembly: {
      instantiate(
        bytes: Uint8Array,
        imports: Record<string, Record<string, unknown>>,
      ): Promise<{ instance: { exports: WasmExports } }>;
    };
  }
).WebAssembly;

type Bg = typeof EngineModule & {
  __wbg_set_wasm(exports: WasmExports): void;
};

let loaded: Promise<Bg> | undefined;

/**
 * Instantiate the wasm module by hand so Node needs no --experimental-wasm-modules flag.
 * Instantiated once per process: the glue module caches views of the wasm memory.
 */
function loadEngineModule(): Promise<Bg> {
  loaded ??= instantiateEngine();
  return loaded;
}

async function instantiateEngine(): Promise<Bg> {
  // The wasm glue reports Rust panics through this global before throwing.
  const g = globalThis as { PRISMA_WASM_PANIC_REGISTRY?: { set_message(m: string): void } };
  g.PRISMA_WASM_PANIC_REGISTRY ??= {
    set_message: (message: string) => console.error(`schema engine panic: ${message}`),
  };
  const require = createRequire(import.meta.url);
  const entry = require.resolve("@prisma/schema-engine-wasm");
  const bg = (await import("@prisma/schema-engine-wasm/schema_engine_bg")) as unknown as Bg;
  const bytes = await readFile(path.join(path.dirname(entry), "schema_engine_bg.wasm"));
  const { instance } = await Wasm.instantiate(bytes, {
    "./schema_engine_bg.js": bg as unknown as Record<string, unknown>,
  });
  bg.__wbg_set_wasm(instance.exports);
  (instance.exports.__wbindgen_start as () => void)();
  return bg;
}

function databaseUrl(): string {
  return process.env.DATABASE_URL ?? defaultUrl;
}

async function loadMigrations(): Promise<MigrationList> {
  const dirs = existsSync(migrationsDir)
    ? (await readdir(migrationsDir, { withFileTypes: true }))
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
        .sort()
    : [];
  const lockPath = path.join(migrationsDir, "migration_lock.toml");
  return {
    baseDir: migrationsDir,
    lockfile: {
      path: "migration_lock.toml",
      content: existsSync(lockPath) ? await readFile(lockPath, "utf8") : null,
    },
    shadowDbInitScript: "",
    migrationDirectories: await Promise.all(
      dirs.map(async (name) => ({
        path: name,
        migrationFile: {
          path: "migration.sql",
          content: {
            tag: "ok" as const,
            value: await readFile(path.join(migrationsDir, name, "migration.sql"), "utf8"),
          },
        },
      })),
    ),
  };
}

type PgAdapter = Awaited<ReturnType<PrismaPg["connect"]>>;
type ScriptCapable = PgAdapter & {
  client: { query(sql: string): Promise<unknown> };
  onError(error: unknown): never;
};

/**
 * @prisma/adapter-pg 7.10.1 runs a migration script by splitting it on every ";", which breaks
 * PL/pgSQL bodies and any comment containing a semicolon. Send the script in one simple-query
 * round trip instead, the way the native schema engine does.
 */
function wholeScript(adapter: PgAdapter): PgAdapter {
  const a = adapter as ScriptCapable;
  // The adapter has no mapping for the internal "char" type (oid 18) that the engine reads
  // from pg_catalog (e.g. pg_constraint.contype) when describing a schema. Let the adapter
  // decode it as text, then label those columns as Character, which the engine expects.
  // The engine issues queries one at a time per connection, so a single slot is enough.
  let charColumns: number[] = [];
  const query = a.client.query.bind(a.client) as (...args: unknown[]) => Promise<unknown>;
  (a.client as { query: unknown }).query = async (...args: unknown[]) => {
    const result = (await query(...args)) as { fields?: Array<{ dataTypeID: number }> };
    charColumns = [];
    (result?.fields ?? []).forEach((field, i) => {
      if (field.dataTypeID === 18) {
        field.dataTypeID = 25;
        charColumns.push(i);
      }
    });
    return result;
  };
  const queryRaw = a.queryRaw.bind(a);
  a.queryRaw = async (q) => {
    const result = await queryRaw(q);
    for (const i of charColumns) result.columnTypes[i] = ColumnTypeEnum.Character;
    charColumns = [];
    return result;
  };
  a.executeScript = async (script: string) => {
    try {
      await a.client.query(script);
    } catch (error) {
      a.onError(error);
    }
  };
  return adapter;
}

/**
 * Migration-aware factory for the engine. The shadow database is created here because
 * PrismaPg.connectToShadowDb() spreads `database` into a config that also has a
 * connectionString, so its "shadow" pool would silently connect to the main database.
 */
function engineFactory(url: string) {
  const main = new PrismaPg({ connectionString: url });
  return {
    provider: "postgres" as const,
    adapterName: main.adapterName,
    connect: async () => wholeScript(await main.connect()),
    connectToShadowDb: async () => {
      const name = `carepath_shadow_${randomUUID().replace(/-/g, "")}`;
      const admin = await main.connect();
      await admin.executeScript(`CREATE DATABASE "${name}"`);
      const shadowUrl = new URL(url);
      shadowUrl.pathname = `/${name}`;
      const shadow = wholeScript(
        await new PrismaPg({ connectionString: shadowUrl.toString() }).connect(),
      );
      const dispose = shadow.dispose.bind(shadow);
      shadow.dispose = async () => {
        await dispose();
        await admin.executeScript(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
        await admin.dispose();
      };
      return shadow;
    },
  };
}

async function withEngine<T>(fn: (engine: SchemaEngineType) => Promise<T>): Promise<T> {
  const bg = await loadEngineModule();
  const schema = await readFile(schemaPath, "utf8");
  // connectToShadowDb() creates and drops a temporary database for `create` and `check`.
  const adapter = bindMigrationAwareSqlAdapterFactory(engineFactory(databaseUrl()));
  const logs: string[] = [];
  const engine = await bg.SchemaEngine.new(
    { datamodels: [["schema.prisma", schema]] },
    (line: string) => logs.push(line),
    adapter,
  );
  try {
    return await fn(engine);
  } finally {
    engine.free();
  }
}

async function schemaFiles() {
  return [{ path: "schema.prisma", content: await readFile(schemaPath, "utf8") }];
}

function timestamp(): string {
  return new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
}

async function main(): Promise<number> {
  const [command, arg] = process.argv.slice(2);
  switch (command) {
    case "deploy": {
      const migrationsList = await loadMigrations();
      const out = await withEngine((e) => e.applyMigrations({ migrationsList, filters: noFilter }));
      const names = out.appliedMigrationNames;
      console.log(
        names.length
          ? `applied: ${names.join(", ")}`
          : "no pending migrations (database up to date)",
      );
      return 0;
    }
    case "reset": {
      await withEngine((e) => e.reset({ filter: noFilter }));
      const migrationsList = await loadMigrations();
      const out = await withEngine((e) => e.applyMigrations({ migrationsList, filters: noFilter }));
      console.log(`reset; applied: ${out.appliedMigrationNames.join(", ")}`);
      return 0;
    }
    case "create": {
      if (!arg || !/^[a-z0-9_]+$/.test(arg)) {
        console.error("usage: create <snake_case_name>");
        return 2;
      }
      {
        const migrationsList = await loadMigrations();
        const from = migrationsList.migrationDirectories.length
          ? ({ tag: "migrations", ...migrationsList } as const)
          : ({ tag: "empty" } as const);
        const result = await withEngine(async (e) =>
          e.diff({
            from,
            to: { tag: "schemaDatamodel", files: await schemaFiles() },
            script: true,
            exitCode: null,
            filters: noFilter,
          }),
        );
        const sql = result.stdout ?? "";
        if (!sql.trim() || /This is an empty migration/.test(sql)) {
          console.log("schema.prisma matches the migration history; nothing to create");
          return 0;
        }
        const dir = path.join(migrationsDir, `${timestamp()}_${arg}`);
        await mkdir(dir, { recursive: true });
        await writeFile(path.join(dir, "migration.sql"), sql);
        const lock = path.join(migrationsDir, "migration_lock.toml");
        if (!existsSync(lock)) {
          await writeFile(
            lock,
            '# Please do not edit this file manually\n# It should be added in your version-control system (e.g., Git)\nprovider = "postgresql"\n',
          );
        }
        console.log(`created ${path.relative(pkgRoot, dir)}/migration.sql`);
        return 0;
      }
    }
    case "check": {
      {
        const migrationsList = await loadMigrations();
        const result = await withEngine(async (e) =>
          e.diff({
            from: { tag: "migrations", ...migrationsList },
            to: { tag: "schemaDatamodel", files: await schemaFiles() },
            script: true,
            exitCode: true,
            filters: noFilter,
          }),
        );
        if (result.exitCode === 2) {
          console.error("schema.prisma and prisma/migrations differ:\n" + (result.stdout ?? ""));
          return 2;
        }
        console.log("schema.prisma matches the migration history");
        return 0;
      }
    }
    default:
      console.error("usage: schema-engine.ts deploy|reset|create <name>|check");
      return 2;
  }
}

main().then(
  (code) => process.exit(code),
  (err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  },
);
