/**
 * Export all public tables from local Postgres to data/db-export/*.json
 * Usage: node scripts/export-local-db-json.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const OUT_DIR = join(process.cwd(), "data", "db-export");

const TABLES = [
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
];

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  mkdirSync(OUT_DIR, { recursive: true });
  const client = new pg.Client({ connectionString });
  await client.connect();

  const manifest = { exportedAt: new Date().toISOString(), tables: {} };

  for (const table of TABLES) {
    const { rows } = await client.query(`SELECT * FROM public."${table}"`);
    const file = `${table}.json`;
    writeFileSync(join(OUT_DIR, file), JSON.stringify(rows, null, 2), "utf8");
    manifest.tables[table] = { file, count: rows.length };
    console.log(`Exported ${table}: ${rows.length}`);
  }

  writeFileSync(join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  await client.end();
  console.log(`Done → ${OUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
