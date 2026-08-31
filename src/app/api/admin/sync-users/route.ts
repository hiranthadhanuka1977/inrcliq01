import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { Pool } from "pg";

export const runtime = "nodejs";
export const maxDuration = 60;

const SYNC_TOKEN = process.env.FULL_SYNC_SECRET?.trim() || "";

const TABLE_ORDER = [
  "User",
  "UserProfile",
  "CreatorUser",
  "SpecialRequestCatalog",
  "ParentApprovalRequest",
  "GuardianChildLink",
  "GuardianDmContactControl",
  "ChatThread",
  "ChatMessage",
  "SpecialRequest",
  "FeedPost",
  "CreatorCollection",
  "CollectionProduct",
  "CreatorSubscription",
  "CreatorFollow",
] as const;

type SyncUsersBody = {
  tables: Partial<Record<(typeof TABLE_ORDER)[number], Record<string, unknown>[]>>;
};

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

const JSON_COLUMNS: Partial<Record<(typeof TABLE_ORDER)[number], string[]>> = {
  UserProfile: ["popularPostsJson"],
  SpecialRequestCatalog: ["content"],
  FeedPost: ["mediaJson", "audioJson"],
  CollectionProduct: ["offerJson", "detailJson"],
  SpecialRequest: ["detailsJson"],
};

const CONFLICT_TARGETS: Partial<Record<(typeof TABLE_ORDER)[number], string[]>> = {
  UserProfile: ["userId"],
  CreatorUser: ["email"],
  SpecialRequestCatalog: ["userId"],
  CreatorCollection: ["slug"],
  CollectionProduct: ["collectionId", "productKey"],
  CreatorSubscription: ["userId", "creatorId"],
  CreatorFollow: ["userId", "creatorId"],
  GuardianChildLink: ["guardianUserId", "childUserId"],
  GuardianDmContactControl: ["childUserId", "childThreadId"],
  ChatThread: ["id"],
};

function serializeRow(table: string, row: Record<string, unknown>) {
  const jsonColumns = JSON_COLUMNS[table as (typeof TABLE_ORDER)[number]] ?? [];
  const next = { ...row };
  for (const column of jsonColumns) {
    const value = next[column];
    if (value !== null && value !== undefined && typeof value !== "string") {
      next[column] = JSON.stringify(value);
    }
  }
  return next;
}

async function upsertRows(pool: Pool, table: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return { upserted: 0 };

  const client = await pool.connect();
  try {
    if (table === "User") {
      const ids = rows.map((row) => String(row.id));
      const handles = rows.map((row) => row.handle).filter(Boolean);
      const emails = rows.map((row) => row.email).filter(Boolean);
      if (handles.length) {
        await client.query(
          `DELETE FROM public."User" WHERE handle = ANY($1::text[]) AND NOT (id = ANY($2::text[]))`,
          [handles, ids],
        );
      }
      if (emails.length) {
        await client.query(
          `DELETE FROM public."User" WHERE email = ANY($1::text[]) AND NOT (id = ANY($2::text[]))`,
          [emails, ids],
        );
      }
    }

    const columns = Object.keys(rows[0]);
    const colSql = columns.map((column) => `"${column}"`).join(", ");
    const conflictColumns = CONFLICT_TARGETS[table as (typeof TABLE_ORDER)[number]] ?? ["id"];
    const conflictSql = conflictColumns.map((column) => `"${column}"`).join(", ");
    const updateSql = columns
      .filter((column) => !conflictColumns.includes(column))
      .map((column) => `"${column}" = EXCLUDED."${column}"`)
      .join(", ");

    await client.query("BEGIN");
    let upserted = 0;
    for (const row of rows) {
      const normalized = serializeRow(table, row);
      const values = columns.map((column) => normalized[column]);
      const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
      const updateClause = updateSql ? ` DO UPDATE SET ${updateSql}` : " DO NOTHING";
      await client.query(
        `INSERT INTO public."${table}" (${colSql}) VALUES (${placeholders})
         ON CONFLICT (${conflictSql})${updateClause}`,
        values,
      );
      upserted += 1;
    }
    await client.query("COMMIT");
    return { upserted };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function POST(request: Request) {
  if (!authorize(request)) return unauthorized();

  let body: SyncUsersBody;
  try {
    body = (await request.json()) as SyncUsersBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.tables || typeof body.tables !== "object") {
    return NextResponse.json({ error: "tables object is required" }, { status: 400 });
  }

  const pool = getPool();
  const results: Record<string, { upserted: number }> = {};

  try {
    for (const table of TABLE_ORDER) {
      const rows = body.tables[table];
      if (!Array.isArray(rows) || rows.length === 0) {
        results[table] = { upserted: 0 };
        continue;
      }
      results[table] = await upsertRows(pool, table, rows);
    }

    return NextResponse.json({ ok: true, results });
  } catch (error) {
    console.error("sync-users error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed", results },
      { status: 500 },
    );
  } finally {
    await pool.end();
  }
}
