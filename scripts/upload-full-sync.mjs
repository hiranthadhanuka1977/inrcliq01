/**
 * Upload local DB JSON export to production full-sync API.
 *
 * Usage:
 *   $env:FULL_SYNC_URL="https://inrcliq01.vercel.app/api/admin/full-sync"
 *   $env:FULL_SYNC_SECRET="inrcliq-full-sync-20260728"
 *   node scripts/upload-full-sync.mjs
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const OUT_DIR = join(process.cwd(), "data", "db-export");
const URL = process.env.FULL_SYNC_URL || "https://inrcliq01.vercel.app/api/admin/full-sync";
const SECRET = process.env.FULL_SYNC_SECRET || "inrcliq-full-sync-20260728";

const TABLE_ORDER = [
  "User",
  "UserProfile",
  "SpecialRequestCatalog",
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

async function post(body) {
  const basic = Buffer.from("demo@inrcliq.com:demo@inrcliq.com").toString("base64");
  const response = await fetch(URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${basic}`,
      "x-full-sync-secret": SECRET,
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${response.status} ${JSON.stringify(data)}`);
  }
  return data;
}

async function main() {
  console.log(`Target: ${URL}`);
  console.log("Phase: reset (drop schema + apply migrations)");
  console.log(await post({ phase: "reset" }));

  for (const table of TABLE_ORDER) {
    const rows = JSON.parse(readFileSync(join(OUT_DIR, `${table}.json`), "utf8"));
    console.log(`Phase: load ${table} (${rows.length})`);
    const result = await post({ phase: "load", table, rows });
    console.log(result);
  }

  console.log("Phase: status");
  console.log(await post({ phase: "status" }));
  console.log("FULL SYNC COMPLETE");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
