/**
 * Export Dahamdie + Hiranthadhanuka and all related rows from local Postgres.
 *
 * Usage:
 *   node scripts/export-users-subgraph.mjs
 *
 * Output: data/user-sync-export/manifest.json + per-table JSON files
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: ".env.local" });
dotenv.config();

const HANDLES = (process.env.USER_SYNC_HANDLES || "dahamdied26,extreme1977")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const OUT_DIR = join(process.cwd(), "data", "user-sync-export");

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

async function queryRows(client, table, ids, column = "id") {
  if (!ids.length) return [];
  const { rows } = await client.query(
    `SELECT * FROM public."${table}" WHERE "${column}" = ANY($1::text[])`,
    [ids],
  );
  return rows;
}

async function queryRowsWhere(client, table, sql, params) {
  const { rows } = await client.query(`SELECT * FROM public."${table}" WHERE ${sql}`, params);
  return rows;
}

async function main() {
  const sourceUrl = process.env.SOURCE_DATABASE_URL || process.env.DATABASE_URL;
  if (!sourceUrl) throw new Error("SOURCE_DATABASE_URL or DATABASE_URL is not set");

  mkdirSync(OUT_DIR, { recursive: true });
  const client = new pg.Client({ connectionString: sourceUrl });
  await client.connect();

  const seedUsers = await queryRowsWhere(
    client,
    "User",
    `handle = ANY($1::text[])`,
    [HANDLES],
  );
  if (seedUsers.length === 0) {
    throw new Error(`No users found for handles: ${HANDLES.join(", ")}`);
  }

  const userIds = new Set(seedUsers.map((row) => row.id));
  const creatorIds = new Set();
  const threadIds = new Set();
  const collectionIds = new Set();

  let expanded = true;
  while (expanded) {
    expanded = false;

    const creatorsForUsers = await queryRows(client, "CreatorUser", [...userIds], "userId");
    for (const row of creatorsForUsers) {
      if (!creatorIds.has(row.id)) {
        creatorIds.add(row.id);
        expanded = true;
      }
    }

    const links = await queryRowsWhere(
      client,
      "GuardianChildLink",
      `"guardianUserId" = ANY($1::text[]) OR "childUserId" = ANY($1::text[])`,
      [[...userIds]],
    );
    for (const row of links) {
      if (!userIds.has(row.guardianUserId)) {
        userIds.add(row.guardianUserId);
        expanded = true;
      }
      if (!userIds.has(row.childUserId)) {
        userIds.add(row.childUserId);
        expanded = true;
      }
    }

    const approvals = await queryRowsWhere(
      client,
      "ParentApprovalRequest",
      `"childUserId" = ANY($1::text[]) OR "guardianUserId" = ANY($1::text[])`,
      [[...userIds]],
    );
    for (const row of approvals) {
      for (const key of ["childUserId", "guardianUserId"]) {
        if (row[key] && !userIds.has(row[key])) {
          userIds.add(row[key]);
          expanded = true;
        }
      }
    }

    const dmControls = await queryRowsWhere(
      client,
      "GuardianDmContactControl",
      `"childUserId" = ANY($1::text[]) OR "peerUserId" = ANY($1::text[])`,
      [[...userIds]],
    );
    for (const row of dmControls) {
      if (row.peerUserId && !userIds.has(row.peerUserId)) {
        userIds.add(row.peerUserId);
        expanded = true;
      }
    }

    const threads = await queryRows(client, "ChatThread", [...userIds], "userId");
    for (const row of threads) {
      threadIds.add(row.id);
      if (row.peerCreatorId && !creatorIds.has(row.peerCreatorId)) {
        creatorIds.add(row.peerCreatorId);
        expanded = true;
      }
    }

    if (creatorIds.size > 0) {
      const peerCreators = await queryRows(client, "CreatorUser", [...creatorIds], "id");
      for (const row of peerCreators) {
        if (row.userId && !userIds.has(row.userId)) {
          userIds.add(row.userId);
          expanded = true;
        }
      }
    }
  }

  const users = await queryRows(client, "User", [...userIds], "id");
  const profiles = await queryRows(client, "UserProfile", [...userIds], "userId");
  const creators = await queryRows(client, "CreatorUser", [...creatorIds], "id");
  const creatorUsersByUser = await queryRows(client, "CreatorUser", [...userIds], "userId");
  for (const row of creatorUsersByUser) {
    if (!creators.some((item) => item.id === row.id)) creators.push(row);
    creatorIds.add(row.id);
  }

  const catalogs = await queryRows(client, "SpecialRequestCatalog", [...userIds], "userId");
  const approvals = await queryRowsWhere(
    client,
    "ParentApprovalRequest",
    `"childUserId" = ANY($1::text[]) OR "guardianUserId" = ANY($1::text[])`,
    [[...userIds]],
  );
  const links = await queryRowsWhere(
    client,
    "GuardianChildLink",
    `"guardianUserId" = ANY($1::text[]) OR "childUserId" = ANY($1::text[])`,
    [[...userIds]],
  );
  const dmControls = await queryRowsWhere(
    client,
    "GuardianDmContactControl",
    `"childUserId" = ANY($1::text[]) OR "peerUserId" = ANY($1::text[])`,
    [[...userIds]],
  );
  const threads = await queryRows(client, "ChatThread", [...userIds], "userId");
  for (const row of threads) threadIds.add(row.id);
  const messages = await queryRows(client, "ChatMessage", [...threadIds], "threadId");

  const specialRequests = await queryRowsWhere(
    client,
    "SpecialRequest",
    `"userId" = ANY($1::text[]) OR "creatorId" = ANY($2::text[])`,
    [[...userIds], [...creatorIds]],
  );
  const feedPosts = await queryRows(client, "FeedPost", [...userIds], "userId");
  const collections = await queryRows(client, "CreatorCollection", [...creatorIds], "creatorId");
  for (const row of collections) collectionIds.add(row.id);
  const products = await queryRows(client, "CollectionProduct", [...collectionIds], "collectionId");
  const subscriptions = await queryRowsWhere(
    client,
    "CreatorSubscription",
    `"userId" = ANY($1::text[]) OR "creatorId" = ANY($2::text[])`,
    [[...userIds], [...creatorIds]],
  );
  const follows = await queryRowsWhere(
    client,
    "CreatorFollow",
    `"userId" = ANY($1::text[]) OR "creatorId" = ANY($2::text[])`,
    [[...userIds], [...creatorIds]],
  );

  const payload = {
    User: users,
    UserProfile: profiles,
    CreatorUser: creators,
    SpecialRequestCatalog: catalogs,
    ParentApprovalRequest: approvals,
    GuardianChildLink: links,
    GuardianDmContactControl: dmControls,
    ChatThread: threads,
    ChatMessage: messages,
    SpecialRequest: specialRequests,
    FeedPost: feedPosts,
    CreatorCollection: collections,
    CollectionProduct: products,
    CreatorSubscription: subscriptions,
    CreatorFollow: follows,
  };

  const manifest = {
    exportedAt: new Date().toISOString(),
    handles: HANDLES,
    userIds: [...userIds],
    creatorIds: [...creatorIds],
    threadIds: [...threadIds],
    tables: {},
  };

  for (const table of TABLE_ORDER) {
    const rows = payload[table] ?? [];
    const file = `${table}.json`;
    writeFileSync(join(OUT_DIR, file), JSON.stringify(rows, null, 2), "utf8");
    manifest.tables[table] = { file, count: rows.length };
    console.log(`Exported ${table}: ${rows.length}`);
  }

  writeFileSync(join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  console.log(`Done → ${OUT_DIR}`);
  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
