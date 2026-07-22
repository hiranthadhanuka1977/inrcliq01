/**
 * Seed / refresh Good Guy Podcast creator profile data in Postgres:
 * - Verify CreatorUser @goodguypod + set slug/bio/cover
 * - Upsert profile feed_posts (incl. members-only) onto FeedPost
 *
 * Usage: node scripts/seed-good-guy-podcast.mjs
 * Then: npm run db:migrate-collection
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const ROOT = process.cwd();
const PROFILE_PATH = join(ROOT, "data", "good-guy-podcast.json");

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  const profile = JSON.parse(readFileSync(PROFILE_PATH, "utf8"));
  const client = new pg.Client({ connectionString });
  await client.connect();
  await client.query("BEGIN");

  try {
    const existing = await client.query(
      `SELECT id, handle, slug, verified FROM "CreatorUser" WHERE handle = $1`,
      [profile.handle],
    );
    if (!existing.rows[0]) {
      throw new Error(`CreatorUser ${profile.handle} not found. Run db:migrate-feed first.`);
    }

    const creatorId = existing.rows[0].id;

    await client.query(
      `UPDATE "CreatorUser" SET
        name = $2,
        slug = $3,
        "avatarInitials" = $4,
        "avatarColor" = $5,
        "avatarUrl" = $6,
        verified = true,
        bio = $7,
        "coverUrl" = $8,
        source = 'profile-json',
        "updatedAt" = now()
       WHERE id = $1`,
      [
        creatorId,
        profile.name,
        profile.slug,
        profile.avatar_initials,
        profile.avatar_color,
        profile.avatar_url,
        profile.bio,
        profile.cover_url,
      ],
    );

    console.log(`Updated CreatorUser ${profile.handle} → slug=${profile.slug}, verified=true`);

    const posts = Array.isArray(profile.feed_posts) ? profile.feed_posts : [];
    let upserted = 0;

    for (let index = 0; index < posts.length; index += 1) {
      const item = posts[index];
      const postedAt = item.posted_at ? new Date(item.posted_at) : new Date();
      const safePostedAt = Number.isNaN(postedAt.getTime()) ? new Date() : postedAt;
      const tags = Array.isArray(item.tags) ? item.tags : [];

      await client.query(
        `INSERT INTO "FeedPost" (
          id, category, text, tags, "mediaJson", "audioJson",
          likes, comments, shares, following, "membersOnly",
          "postedAt", "postedAgo", "sortOrder", "creatorId", "createdAt", "updatedAt"
        ) VALUES (
          $1,$2,$3,$4::text[],$5::jsonb,$6::jsonb,
          $7,$8,$9,$10,$11,
          $12,$13,$14,$15,now(),now()
        )
        ON CONFLICT (id) DO UPDATE SET
          category = excluded.category,
          text = excluded.text,
          tags = excluded.tags,
          "mediaJson" = excluded."mediaJson",
          "audioJson" = excluded."audioJson",
          likes = excluded.likes,
          comments = excluded.comments,
          shares = excluded.shares,
          following = excluded.following,
          "membersOnly" = excluded."membersOnly",
          "postedAt" = excluded."postedAt",
          "postedAgo" = excluded."postedAgo",
          "sortOrder" = excluded."sortOrder",
          "creatorId" = excluded."creatorId",
          "updatedAt" = now()`,
        [
          String(item.id),
          item.category || "discovery",
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
      upserted += 1;
    }

    const exclusive = (
      await client.query(
        `SELECT COUNT(*)::int AS c FROM "FeedPost"
         WHERE "creatorId" = $1 AND "membersOnly" = true`,
        [creatorId],
      )
    ).rows[0].c;

    const total = (
      await client.query(`SELECT COUNT(*)::int AS c FROM "FeedPost" WHERE "creatorId" = $1`, [
        creatorId,
      ])
    ).rows[0].c;

    await client.query("COMMIT");

    console.log(`Feed posts upserted from profile: ${upserted}`);
    console.log(`Creator feed totals → posts: ${total}, members-only: ${exclusive}`);
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
