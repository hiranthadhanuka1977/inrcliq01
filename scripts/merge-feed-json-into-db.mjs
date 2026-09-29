/**
 * Merge feed posts that still live only in JSON into Postgres, so "FeedPost"
 * is the single source for the home feed and profile feeds.
 *
 * Sources:
 * - data/my_feed.json items (creator resolved by author handle)
 * - data/<profile>.json feed_posts (creator resolved by profile slug, then handle)
 *
 * Existing FeedPost rows are never modified (the database wins). Missing posts are
 * inserted after the current feed order, linked to the creator and its auth user,
 * and profile posts are added to that profile's pinnedFeedPostIds if absent.
 *
 * Usage: npm run db:merge-feed-json [-- --dry-run]
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const DRY_RUN = process.argv.includes("--dry-run");
const DATA_DIR = join(process.cwd(), "data");
const FEED_FILE = "my_feed.json";

function bareHandle(handle) {
  return String(handle || "")
    .trim()
    .replace(/^@/, "")
    .toLowerCase();
}

function readJson(file) {
  return JSON.parse(readFileSync(join(DATA_DIR, file), "utf8"));
}

function loadSources() {
  const sources = [];
  const feed = readJson(FEED_FILE);
  for (const item of Array.isArray(feed.items) ? feed.items : []) {
    sources.push({ file: FEED_FILE, item, profileSlug: null });
  }

  for (const file of readdirSync(DATA_DIR)) {
    if (!file.endsWith(".json") || file === FEED_FILE || file.includes("collection")) continue;
    let profile;
    try {
      profile = readJson(file);
    } catch {
      continue;
    }
    if (!profile?.slug || !Array.isArray(profile.feed_posts)) continue;
    for (const item of profile.feed_posts) {
      sources.push({ file, item, profileSlug: String(profile.slug).toLowerCase(), profileHandle: profile.handle });
    }
  }
  return sources;
}

async function main() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED?.trim() || process.env.DATABASE_URL?.trim();
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  console.log(`Target database host: ${new URL(connectionString).hostname}${DRY_RUN ? " (dry run)" : ""}`);

  const sources = loadSources();
  const client = new pg.Client({ connectionString });
  await client.connect();

  try {
    const creators = (await client.query(`SELECT id, handle, slug, "userId" FROM "CreatorUser"`)).rows;
    const creatorBySlug = new Map(creators.filter((c) => c.slug).map((c) => [c.slug.toLowerCase(), c]));
    const creatorByHandle = new Map(creators.map((c) => [bareHandle(c.handle), c]));
    const existingIds = new Set((await client.query(`SELECT id FROM "FeedPost"`)).rows.map((r) => r.id));
    let sortOrder = (await client.query(`SELECT COALESCE(MAX("sortOrder"), 0)::int AS m FROM "FeedPost"`)).rows[0].m;

    const toInsert = [];
    const skippedNoCreator = [];
    const pinsBySlug = new Map();
    const seen = new Set();

    for (const { file, item, profileSlug, profileHandle } of sources) {
      const id = String(item?.id || "").trim();
      if (!id || seen.has(id)) continue;
      seen.add(id);

      if (profileSlug) {
        if (!pinsBySlug.has(profileSlug)) pinsBySlug.set(profileSlug, []);
        pinsBySlug.get(profileSlug).push(id);
      }
      if (existingIds.has(id)) continue;

      const creator =
        (profileSlug && creatorBySlug.get(profileSlug)) ||
        creatorByHandle.get(bareHandle(profileHandle)) ||
        creatorByHandle.get(bareHandle(item.author?.handle));
      if (!creator) {
        skippedNoCreator.push(`${id} (${file}, ${item.author?.handle ?? "no handle"})`);
        continue;
      }
      toInsert.push({ id, item, creator, file });
    }

    console.log(`JSON posts found: ${seen.size}`);
    console.log(`Already in database: ${seen.size - toInsert.length - skippedNoCreator.length}`);
    console.log(`To insert: ${toInsert.length}`);
    for (const row of toInsert) console.log(`  + ${row.id} -> ${row.creator.handle} (${row.file})`);
    if (skippedNoCreator.length) {
      console.warn(`Skipped (no matching CreatorUser): ${skippedNoCreator.length}`);
      for (const line of skippedNoCreator) console.warn(`  ! ${line}`);
    }

    if (DRY_RUN) {
      console.log("Dry run: no changes written.");
      return;
    }

    await client.query("BEGIN");
    for (const { id, item, creator } of toInsert) {
      const postedAt = item.posted_at ? new Date(item.posted_at) : new Date();
      sortOrder += 1;
      await client.query(
        `INSERT INTO "FeedPost" (
          id, category, text, tags, "mediaJson", "audioJson",
          likes, comments, shares, following, "membersOnly",
          "postedAt", "postedAgo", "sortOrder", "creatorId", "userId", "createdAt", "updatedAt"
        ) VALUES (
          $1,$2,$3,$4::text[],$5::jsonb,$6::jsonb,
          $7,$8,$9,$10,$11,
          $12,$13,$14,$15,$16,now(),now()
        )
        ON CONFLICT (id) DO NOTHING`,
        [
          id,
          item.category || "personal",
          item.text || "",
          Array.isArray(item.tags) ? item.tags : [],
          item.media ? JSON.stringify(item.media) : null,
          item.audio ? JSON.stringify(item.audio) : null,
          Number(item.engagement?.likes || 0),
          Number(item.engagement?.comments || 0),
          Number(item.engagement?.shares || 0),
          Boolean(item.relationship?.following),
          Boolean(item.members_only),
          (Number.isNaN(postedAt.getTime()) ? new Date() : postedAt).toISOString(),
          item.posted_ago ?? null,
          sortOrder,
          creator.id,
          creator.userId ?? null,
        ],
      );
    }

    let pinsAdded = 0;
    for (const [slug, ids] of pinsBySlug) {
      const profile = (
        await client.query(`SELECT "userId", "pinnedFeedPostIds" FROM "UserProfile" WHERE lower(slug) = $1`, [slug])
      ).rows[0];
      if (!profile) continue;
      const pinned = profile.pinnedFeedPostIds ?? [];
      const missing = ids.filter((id) => !pinned.includes(id));
      if (!missing.length) continue;
      await client.query(`UPDATE "UserProfile" SET "pinnedFeedPostIds" = $2, "updatedAt" = now() WHERE "userId" = $1`, [
        profile.userId,
        [...pinned, ...missing],
      ]);
      pinsAdded += missing.length;
    }
    await client.query("COMMIT");

    const total = (await client.query(`SELECT COUNT(*)::int AS c FROM "FeedPost"`)).rows[0].c;
    console.log(`Inserted: ${toInsert.length}, profile pins added: ${pinsAdded}, FeedPost total: ${total}`);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
