/**
 * Migrate profile JSON onto UserProfile for the known creators, then create
 * unverified stub profiles (no posts / no popular content) for every other User.
 *
 * Usage: npm run db:migrate-profiles
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: ".env.local" });
dotenv.config();

const ROOT = process.cwd();
const DATA_DIR = join(ROOT, "data");

const RICH_PROFILES = {
  "mia-chen": "mia-chen.json",
  "dev-weekly": "dev-weekly.json",
  hiran: "hiran.json",
  "planet-unfolded": "planet-unfolded.json",
  "good-guy-podcast": "good-guy-podcast.json",
  "bathiya-santhush": "bathiya-santhush.json",
};

function cuid() {
  return `c${randomBytes(12).toString("hex")}`;
}

function normalizeHandle(handle) {
  const trimmed = String(handle || "").trim();
  if (!trimmed) return "";
  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
}

function initialsFrom(name, handle) {
  const fromName = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
  if (fromName) return fromName.slice(0, 2);
  const local = normalizeHandle(handle).replace(/^@/, "");
  return (local.slice(0, 2) || "??").toUpperCase();
}

function loadJsonProfile(fileName) {
  const filePath = join(DATA_DIR, fileName);
  if (!existsSync(filePath)) return null;
  return JSON.parse(readFileSync(filePath, "utf8"));
}

async function ensureUniqueProfileHandle(client, preferred, excludeUserId) {
  let candidate = normalizeHandle(preferred) || `@user-${randomBytes(3).toString("hex")}`;
  let suffix = 0;
  while (true) {
    const check = await client.query(
      `select id from "UserProfile" where lower(handle) = lower($1) and "userId" <> $2`,
      [candidate, excludeUserId],
    );
    if (check.rows.length === 0) return candidate;
    suffix += 1;
    const bare = candidate.replace(/^@/, "").slice(0, 40);
    candidate = `@${bare}-${suffix}`;
  }
}

async function ensureUniqueSlug(client, preferred, excludeUserId) {
  if (!preferred) return null;
  let candidate = String(preferred)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  if (!candidate) return null;
  let suffix = 0;
  while (true) {
    const check = await client.query(
      `select id from "UserProfile" where slug = $1 and "userId" <> $2`,
      [candidate, excludeUserId],
    );
    if (check.rows.length === 0) return candidate;
    suffix += 1;
    candidate = `${candidate.slice(0, 56)}-${suffix}`;
  }
}

async function upsertProfile(client, row) {
  const existing = await client.query(`select id from "UserProfile" where "userId" = $1`, [
    row.userId,
  ]);

  if (existing.rows[0]) {
    await client.query(
      `update "UserProfile" set
        slug=$2, "displayName"=$3, handle=$4, "avatarInitials"=$5, "avatarColor"=$6,
        "avatarUrl"=$7, "coverUrl"=$8, bio=$9, verified=$10, "specialRequests"=$11,
        "subscriptionPriceLabel"=$12, "followersLabel"=$13, "followingCount"=$14,
        "subscribersCount"=$15, "postsCountLabel"=$16, "popularPostsJson"=$17::jsonb,
        "pinnedFeedPostIds"=$18::text[], source=$19, "updatedAt"=now()
      where "userId"=$1`,
      [
        row.userId,
        row.slug,
        row.displayName,
        row.handle,
        row.avatarInitials,
        row.avatarColor,
        row.avatarUrl,
        row.coverUrl,
        row.bio,
        row.verified,
        row.specialRequests,
        row.subscriptionPriceLabel,
        row.followersLabel,
        row.followingCount,
        row.subscribersCount,
        row.postsCountLabel,
        row.popularPostsJson ? JSON.stringify(row.popularPostsJson) : null,
        row.pinnedFeedPostIds,
        row.source,
      ],
    );
    return "updated";
  }

  await client.query(
    `insert into "UserProfile" (
      id, "userId", slug, "displayName", handle, "avatarInitials", "avatarColor",
      "avatarUrl", "coverUrl", bio, verified, "specialRequests",
      "subscriptionPriceLabel", "followersLabel", "followingCount", "subscribersCount",
      "postsCountLabel", "popularPostsJson", "pinnedFeedPostIds", source,
      "createdAt", "updatedAt"
    ) values (
      $1,$2,$3,$4,$5,$6,$7,
      $8,$9,$10,$11,$12,
      $13,$14,$15,$16,
      $17,$18::jsonb,$19::text[],$20,
      now(), now()
    )`,
    [
      cuid(),
      row.userId,
      row.slug,
      row.displayName,
      row.handle,
      row.avatarInitials,
      row.avatarColor,
      row.avatarUrl,
      row.coverUrl,
      row.bio,
      row.verified,
      row.specialRequests,
      row.subscriptionPriceLabel,
      row.followersLabel,
      row.followingCount,
      row.subscribersCount,
      row.postsCountLabel,
      row.popularPostsJson ? JSON.stringify(row.popularPostsJson) : null,
      row.pinnedFeedPostIds,
      row.source,
    ],
  );
  return "created";
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  const client = new pg.Client({ connectionString });
  await client.connect();

  let richCreated = 0;
  let richUpdated = 0;
  let stubsCreated = 0;
  let stubsUpdated = 0;
  let creatorsSynced = 0;

  try {
    await client.query("BEGIN");

    const richUserIds = new Set();

    for (const [slug, fileName] of Object.entries(RICH_PROFILES)) {
      const json = loadJsonProfile(fileName);
      if (!json) {
        console.warn(`Missing profile JSON: ${fileName}`);
        continue;
      }

      const creator = await client.query(
        `select id, "userId", handle from "CreatorUser" where slug = $1`,
        [slug],
      );
      if (!creator.rows[0]?.userId) {
        console.warn(`No linked CreatorUser/User for slug ${slug}`);
        continue;
      }

      const userId = creator.rows[0].userId;
      richUserIds.add(userId);

      const handle = await ensureUniqueProfileHandle(
        client,
        json.handle || creator.rows[0].handle,
        userId,
      );
      const profileSlug = await ensureUniqueSlug(client, json.slug || slug, userId);
      const pinned = Array.isArray(json.feed_posts)
        ? json.feed_posts.map((post) => String(post.id)).filter(Boolean)
        : [];

      const result = await upsertProfile(client, {
        userId,
        slug: profileSlug,
        displayName: json.name || profileSlug,
        handle,
        avatarInitials: json.avatar_initials || initialsFrom(json.name, handle),
        avatarColor: json.avatar_color || "#6b9fff",
        avatarUrl: json.avatar_url ?? null,
        coverUrl: json.cover_url ?? null,
        bio: json.bio ?? "",
        verified: Boolean(json.verified),
        specialRequests: Boolean(json.special_requests),
        subscriptionPriceLabel: json.subscription?.price_label ?? null,
        followersLabel: json.stats?.followers != null ? String(json.stats.followers) : null,
        followingCount: Number(json.stats?.following || 0),
        subscribersCount: Number(json.stats?.subscribers || 0),
        postsCountLabel:
          json.stats?.posts != null && Number.isFinite(Number(json.stats.posts))
            ? Number(json.stats.posts)
            : null,
        popularPostsJson: Array.isArray(json.popular_posts) ? json.popular_posts : null,
        pinnedFeedPostIds: pinned,
        source: "profile-json",
      });

      if (result === "created") richCreated += 1;
      else richUpdated += 1;

      await client.query(
        `update "CreatorUser" set
          name=$2, handle=$3, slug=$4, "avatarInitials"=$5, "avatarColor"=$6,
          "avatarUrl"=$7, "coverUrl"=$8, bio=$9, verified=$10, "updatedAt"=now()
        where id=$1`,
        [
          creator.rows[0].id,
          json.name || profileSlug,
          handle,
          profileSlug,
          json.avatar_initials || initialsFrom(json.name, handle),
          json.avatar_color || "#6b9fff",
          json.avatar_url ?? null,
          json.cover_url ?? null,
          json.bio ?? null,
          Boolean(json.verified),
        ],
      );
      creatorsSynced += 1;
    }

    const users = await client.query(`
      select
        u.id,
        u.email,
        u.handle as user_handle,
        u."firstName",
        u."lastName",
        c.id as creator_id,
        c.handle as creator_handle,
        c.slug as creator_slug,
        c.name as creator_name,
        c."avatarInitials",
        c."avatarColor",
        c."avatarUrl",
        c."coverUrl",
        c.bio,
        (select count(*)::int from "FeedPost" p where p."userId" = u.id) as post_count
      from "User" u
      left join "CreatorUser" c on c."userId" = u.id
      order by u."createdAt" asc
    `);

    for (const user of users.rows) {
      if (richUserIds.has(user.id)) continue;

      const displayName =
        user.creator_name ||
        [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
        user.user_handle ||
        user.email.split("@")[0];

      const preferredHandle =
        user.creator_handle ||
        (user.user_handle ? `@${String(user.user_handle).replace(/^@/, "")}` : null) ||
        `@${String(user.email.split("@")[0] || "user").replace(/[^a-z0-9._-]/gi, "")}`;

      const handle = await ensureUniqueProfileHandle(client, preferredHandle, user.id);
      const preferredSlug =
        user.creator_slug ||
        String(handle)
          .replace(/^@/, "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 64);
      const slug = await ensureUniqueSlug(client, preferredSlug, user.id);

      const result = await upsertProfile(client, {
        userId: user.id,
        slug,
        displayName,
        handle,
        avatarInitials: user.avatarInitials || initialsFrom(displayName, handle),
        avatarColor: user.avatarColor || "#6b9fff",
        avatarUrl: user.avatarUrl ?? null,
        coverUrl: user.coverUrl ?? null,
        bio: user.bio ?? "",
        verified: false,
        specialRequests: false,
        subscriptionPriceLabel: null,
        followersLabel: null,
        followingCount: 0,
        subscribersCount: 0,
        postsCountLabel: 0,
        popularPostsJson: null,
        pinnedFeedPostIds: [],
        source: "stub",
      });

      if (result === "created") stubsCreated += 1;
      else stubsUpdated += 1;

      if (user.creator_id) {
        await client.query(
          `update "CreatorUser" set
            verified=false,
            slug=coalesce(slug, $2),
            "updatedAt"=now()
          where id=$1`,
          [user.creator_id, slug],
        );
        creatorsSynced += 1;
      }
    }

    await client.query("COMMIT");

    const totals = await client.query(`
      select
        (select count(*)::int from "UserProfile") as profiles,
        (select count(*)::int from "UserProfile" where source = 'profile-json') as rich,
        (select count(*)::int from "UserProfile" where source = 'stub') as stubs,
        (select count(*)::int from "UserProfile" where verified = true) as verified,
        (select count(*)::int from "UserProfile" where verified = false) as unverified,
        (select count(*)::int from "User" u left join "UserProfile" p on p."userId" = u.id where p.id is null) as users_missing_profile
    `);

    console.log(
      JSON.stringify(
        {
          richCreated,
          richUpdated,
          stubsCreated,
          stubsUpdated,
          creatorsSynced,
          totals: totals.rows[0],
        },
        null,
        2,
      ),
    );
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
