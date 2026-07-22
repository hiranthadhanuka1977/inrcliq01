/**
 * Migrate feed JSON creators + posts into Postgres.
 * Creators → "CreatorUser" (temp password: Think100%)
 * Posts → "FeedPost" linked by creatorId
 * JSON files remain as backup.
 *
 * Usage: npm run db:migrate-feed
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const TEMP_PASSWORD = "Think100%";
const ROOT = process.cwd();
const FEED_PATH = join(ROOT, "data", "my_feed.json");
const DATA_DIR = join(ROOT, "data");

function cuid() {
  return `c${randomBytes(12).toString("hex")}`;
}

function normalizeHandle(handle) {
  const trimmed = String(handle || "").trim();
  if (!trimmed) return "";
  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
}

function handleLocalPart(handle) {
  return normalizeHandle(handle)
    .replace(/^@/, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "");
}

function splitName(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return { firstName: null, lastName: null };
  if (parts.length === 1) return { firstName: parts[0], lastName: null };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function loadProfileExtras() {
  const byHandle = new Map();
  for (const file of readdirSync(DATA_DIR)) {
    if (!file.endsWith(".json") || file === "my_feed.json" || file.includes("collection")) continue;
    try {
      const profile = JSON.parse(readFileSync(join(DATA_DIR, file), "utf8"));
      if (!profile?.handle) continue;
      byHandle.set(normalizeHandle(profile.handle).toLowerCase(), profile);
    } catch {
      // ignore
    }
  }
  return byHandle;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  const client = new pg.Client({ connectionString });
  await client.connect();

  const feed = JSON.parse(readFileSync(FEED_PATH, "utf8"));
  const items = Array.isArray(feed.items) ? feed.items : [];
  if (items.length === 0) throw new Error("No feed items found in my_feed.json");

  const profiles = loadProfileExtras();
  const passwordHash = await bcrypt.hash(TEMP_PASSWORD, 10);

  const creatorsByHandle = new Map();
  for (const item of items) {
    const handle = normalizeHandle(item.author?.handle);
    if (!handle) continue;
    const key = handle.toLowerCase();
    if (!creatorsByHandle.has(key)) {
      creatorsByHandle.set(key, { ...item.author, handle });
    }
  }

  console.log(`Creators to upsert: ${creatorsByHandle.size}`);
  console.log(`Posts to upsert: ${items.length}`);

  await client.query("BEGIN");

  try {
    const creatorIds = new Map();
    let creatorsCreated = 0;
    let creatorsUpdated = 0;

    for (const [key, author] of creatorsByHandle) {
      const handle = normalizeHandle(author.handle);
      const local = handleLocalPart(handle) || `creator${creatorsByHandle.size}`;
      const email = `${local}@creators.inrcliq.local`;
      const profile = profiles.get(key);
      const { firstName, lastName } = splitName(author.name || profile?.name || local);
      const slug =
        profile?.slug ||
        local
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 64) ||
        null;

      const name = author.name || profile?.name || local;
      const avatarInitials = author.avatar_initials || profile?.avatar_initials || "??";
      const avatarColor = author.avatar_color || profile?.avatar_color || "#6b9fff";
      const avatarUrl = author.avatar_url ?? profile?.avatar_url ?? null;
      const verified = Boolean(author.verified ?? profile?.verified);
      const bio = profile?.bio ?? null;
      const coverUrl = profile?.cover_url ?? null;

      const existing = await client.query(`select id from "CreatorUser" where handle = $1`, [handle]);

      if (existing.rows[0]) {
        const id = existing.rows[0].id;
        await client.query(
          `update "CreatorUser" set
            email=$2, "passwordHash"=$3, name=$4, slug=$5, "firstName"=$6, "lastName"=$7,
            "avatarInitials"=$8, "avatarColor"=$9, "avatarUrl"=$10, verified=$11,
            bio=$12, "coverUrl"=$13, source='feed-json', "updatedAt"=now()
          where id=$1`,
          [
            id,
            email,
            passwordHash,
            name,
            slug,
            firstName,
            lastName,
            avatarInitials,
            avatarColor,
            avatarUrl,
            verified,
            bio,
            coverUrl,
          ],
        );
        creatorIds.set(key, id);
        creatorsUpdated++;
      } else {
        const id = cuid();
        await client.query(
          `insert into "CreatorUser" (
            id, email, "passwordHash", name, handle, slug, "firstName", "lastName",
            "avatarInitials", "avatarColor", "avatarUrl", verified, bio, "coverUrl",
            source, "createdAt", "updatedAt"
          ) values (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'feed-json',now(),now()
          )`,
          [
            id,
            email,
            passwordHash,
            name,
            handle,
            slug,
            firstName,
            lastName,
            avatarInitials,
            avatarColor,
            avatarUrl,
            verified,
            bio,
            coverUrl,
          ],
        );
        creatorIds.set(key, id);
        creatorsCreated++;
      }
    }

    console.log(`Creators created: ${creatorsCreated}, updated: ${creatorsUpdated}`);

    let postsUpserted = 0;
    let postsSkipped = 0;

    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      const handle = normalizeHandle(item.author?.handle).toLowerCase();
      const creatorId = creatorIds.get(handle);
      if (!creatorId) {
        postsSkipped++;
        console.warn(`Skipping post ${item.id}: missing creator ${item.author?.handle}`);
        continue;
      }

      const postedAt = item.posted_at ? new Date(item.posted_at) : new Date();
      const safePostedAt = Number.isNaN(postedAt.getTime()) ? new Date() : postedAt;
      const tags = Array.isArray(item.tags) ? item.tags : [];

      await client.query(
        `insert into "FeedPost" (
          id, category, text, tags, "mediaJson", "audioJson",
          likes, comments, shares, following, "membersOnly",
          "postedAt", "postedAgo", "sortOrder", "creatorId", "createdAt", "updatedAt"
        ) values (
          $1,$2,$3,$4::text[],$5::jsonb,$6::jsonb,
          $7,$8,$9,$10,$11,
          $12,$13,$14,$15,now(),now()
        )
        on conflict (id) do update set
          category=excluded.category,
          text=excluded.text,
          tags=excluded.tags,
          "mediaJson"=excluded."mediaJson",
          "audioJson"=excluded."audioJson",
          likes=excluded.likes,
          comments=excluded.comments,
          shares=excluded.shares,
          following=excluded.following,
          "membersOnly"=excluded."membersOnly",
          "postedAt"=excluded."postedAt",
          "postedAgo"=excluded."postedAgo",
          "sortOrder"=excluded."sortOrder",
          "creatorId"=excluded."creatorId",
          "updatedAt"=now()`,
        [
          String(item.id),
          item.category || "personal",
          item.text || "",
          tags,
          item.media ? JSON.stringify(item.media) : null,
          item.audio ? JSON.stringify(item.audio) : null,
          Number(item.engagement?.likes || 0),
          Number(item.engagement?.comments || 0),
          Number(item.engagement?.shares || 0),
          Boolean(item.relationship?.following),
          Boolean(item.members_only),
          safePostedAt.toISOString(),
          item.posted_ago ?? null,
          index,
          creatorId,
        ],
      );
      postsUpserted++;
    }

    await client.query("COMMIT");

    const creatorCount = (await client.query(`select count(*)::int as c from "CreatorUser"`)).rows[0].c;
    const postCount = (await client.query(`select count(*)::int as c from "FeedPost"`)).rows[0].c;
    const linked = (
      await client.query(
        `select count(*)::int as c from "FeedPost" p join "CreatorUser" c on c.id = p."creatorId"`,
      )
    ).rows[0].c;

    console.log(`Posts upserted: ${postsUpserted}, skipped: ${postsSkipped}`);
    console.log(`DB totals → CreatorUser: ${creatorCount}, FeedPost: ${postCount}, linked: ${linked}`);
    console.log(`Temp password for all creators: ${TEMP_PASSWORD}`);
    console.log("JSON backup retained at data/my_feed.json");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
