/**
 * Upload exported user subgraph to production sync-users API.
 *
 * Usage:
 *   node scripts/export-users-subgraph.mjs
 *   node scripts/upload-user-sync.mjs
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const OUT_DIR = join(process.cwd(), "data", "user-sync-export");
const URL =
  process.env.USER_SYNC_URL || "https://inrcliq01.vercel.app/api/admin/sync-users";
const SECRET = process.env.FULL_SYNC_SECRET || "inrcliq-full-sync-20260728";

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
];

async function post(tables) {
  const basic = Buffer.from("demo@inrcliq.com:demo@inrcliq.com").toString("base64");
  const response = await fetch(URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${basic}`,
      "x-full-sync-secret": SECRET,
    },
    body: JSON.stringify({ tables }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${response.status} ${JSON.stringify(data)}`);
  }
  return data;
}

async function main() {
  const manifest = JSON.parse(readFileSync(join(OUT_DIR, "manifest.json"), "utf8"));
  console.log(`Uploading export from ${manifest.exportedAt}`);
  console.log(`Users: ${manifest.userIds.length}, threads: ${manifest.threadIds.length}`);

  const tables = {};
  for (const table of TABLE_ORDER) {
    tables[table] = JSON.parse(readFileSync(join(OUT_DIR, `${table}.json`), "utf8"));
    console.log(`Prepared ${table}: ${tables[table].length}`);
  }

  console.log(`Target: ${URL}`);
  const result = await post(tables);
  console.log(JSON.stringify(result, null, 2));
  console.log("USER SYNC COMPLETE");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
