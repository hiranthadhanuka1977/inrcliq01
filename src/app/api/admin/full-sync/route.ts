import { createHash, timingSafeEqual } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { Pool } from "pg";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYNC_TOKEN = process.env.FULL_SYNC_SECRET || "inrcliq-full-sync-20260728";

const TABLE_ORDER = [
  "User",
  "Account",
  "Session",
  "LoginCode",
  "EmailVerificationToken",
  "ParentApprovalRequest",
  "CreatorUser",
  "FeedPost",
  "CreatorCollection",
  "CollectionProduct",
  "ChatThread",
  "ChatMessage",
  "CreatorSubscription",
  "CreatorFollow",
  "_prisma_migrations",
] as const;

type SyncBody =
  | { phase: "reset" }
  | { phase: "load"; table: (typeof TABLE_ORDER)[number]; rows: Record<string, unknown>[] }
  | { phase: "status" };

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function authorize(request: Request): boolean {
  const header = request.headers.get("x-full-sync-secret") || "";
  if (!header || !SYNC_TOKEN) return false;
  const a = createHash("sha256").update(header).digest();
  const b = createHash("sha256").update(SYNC_TOKEN).digest();
  return a.length === b.length && timingSafeEqual(a, b);
}

function getPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  return new Pool({
    connectionString,
    ssl: connectionString.includes("localhost") ? undefined : { rejectUnauthorized: false },
    max: 1,
  });
}

function migrationDirs(): string[] {
  const root = join(process.cwd(), "prisma", "migrations");
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

async function ensurePrismaMigrationsTable(client: { query: (sql: string) => Promise<unknown> }) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public."_prisma_migrations" (
      "id" VARCHAR(36) PRIMARY KEY,
      "checksum" VARCHAR(64) NOT NULL,
      "finished_at" TIMESTAMPTZ,
      "migration_name" VARCHAR(255) NOT NULL,
      "logs" TEXT,
      "rolled_back_at" TIMESTAMPTZ,
      "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0
    )
  `);
}

async function resetSchema(pool: Pool) {
  const client = await pool.connect();
  try {
    await client.query("DROP SCHEMA IF EXISTS public CASCADE");
    await client.query("CREATE SCHEMA public");
    await client.query("GRANT ALL ON SCHEMA public TO public");

    for (const dir of migrationDirs()) {
      const file = join(process.cwd(), "prisma", "migrations", dir, "migration.sql");
      const sql = readFileSync(file, "utf8");
      await client.query(sql);
    }

    await ensurePrismaMigrationsTable(client);
  } finally {
    client.release();
  }
}

async function loadTable(pool: Pool, table: string, rows: Record<string, unknown>[]) {
  if (!TABLE_ORDER.includes(table as (typeof TABLE_ORDER)[number])) {
    throw new Error(`Unsupported table: ${table}`);
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    return { inserted: 0 };
  }

  const client = await pool.connect();
  try {
    if (table === "_prisma_migrations") {
      await ensurePrismaMigrationsTable(client);
    }

    const columns = Object.keys(rows[0]);
    const colSql = columns.map((column) => `"${column}"`).join(", ");

    await client.query("BEGIN");
    let inserted = 0;
    for (const row of rows) {
      const values = columns.map((column) => row[column]);
      const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
      await client.query(
        `INSERT INTO public."${table}" (${colSql}) VALUES (${placeholders})`,
        values,
      );
      inserted += 1;
    }
    await client.query("COMMIT");
    return { inserted };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function status(pool: Pool) {
  const client = await pool.connect();
  try {
    const counts: Record<string, number> = {};
    for (const table of TABLE_ORDER) {
      try {
        const result = await client.query(`SELECT COUNT(*)::int AS count FROM public."${table}"`);
        counts[table] = result.rows[0]?.count ?? 0;
      } catch {
        counts[table] = -1;
      }
    }
    return counts;
  } finally {
    client.release();
  }
}

export async function POST(request: Request) {
  if (!authorize(request)) return unauthorized();

  let body: SyncBody;
  try {
    body = (await request.json()) as SyncBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const pool = getPool();
  try {
    if (body.phase === "status") {
      return NextResponse.json({ ok: true, counts: await status(pool) });
    }

    if (body.phase === "reset") {
      await resetSchema(pool);
      return NextResponse.json({ ok: true, phase: "reset" });
    }

    if (body.phase === "load") {
      if (!body.table || !Array.isArray(body.rows)) {
        return NextResponse.json({ error: "table and rows are required" }, { status: 400 });
      }
      const result = await loadTable(pool, body.table, body.rows);
      return NextResponse.json({ ok: true, phase: "load", table: body.table, ...result });
    }

    return NextResponse.json({ error: "Unknown phase" }, { status: 400 });
  } catch (error) {
    console.error("full-sync error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 },
    );
  } finally {
    await pool.end();
  }
}
