/**
 * Create Bathiya and Santhush (BnS) creator + pin their first post as 4th in feed.
 * Verified, no collection, no members-only content.
 *
 * Usage: node scripts/seed-bathiya-santhush.mjs
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const TEMP_PASSWORD = "Think100%";
const PROFILE_PATH = join(process.cwd(), "data", "bathiya-santhush.json");
const FOURTH_SORT = -997;

function cuid() {
  return `c${randomBytes(12).toString("hex")}`;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  const profile = JSON.parse(readFileSync(PROFILE_PATH, "utf8"));
  const post = profile.feed_posts?.[0];
  if (!post) throw new Error("Profile is missing feed_posts[0]");

  const client = new pg.Client({ connectionString });
  await client.connect();
  await client.query("BEGIN");

  try {
    const passwordHash = await bcrypt.hash(TEMP_PASSWORD, 10);
    const email = "bnsofficial@creators.inrcliq.local";

    const existing = await client.query(
      `SELECT id FROM "CreatorUser" WHERE handle = $1 OR slug = $2`,
      [profile.handle, profile.slug],
    );

    let creatorId;
    if (existing.rows[0]) {
      creatorId = existing.rows[0].id;
      await client.query(
        `UPDATE "CreatorUser" SET
          email = $2,
          "passwordHash" = $3,
          name = $4,
          handle = $5,
          slug = $6,
          "firstName" = 'Bathiya',
          "lastName" = 'and Santhush',
          "avatarInitials" = $7,
          "avatarColor" = $8,
          "avatarUrl" = $9,
          verified = true,
          bio = $10,
          "coverUrl" = $11,
          source = 'profile-json',
          "updatedAt" = now()
         WHERE id = $1`,
        [
          creatorId,
          email,
          passwordHash,
          profile.name,
          profile.handle,
          profile.slug,
          profile.avatar_initials,
          profile.avatar_color,
          profile.avatar_url,
          profile.bio,
          profile.cover_url,
        ],
      );
    } else {
      creatorId = cuid();
      await client.query(
        `INSERT INTO "CreatorUser" (
          id, email, "passwordHash", name, handle, slug,
          "firstName", "lastName", "avatarInitials", "avatarColor", "avatarUrl",
          verified, bio, "coverUrl", source, "createdAt", "updatedAt"
        ) VALUES (
          $1,$2,$3,$4,$5,$6,
          'Bathiya','and Santhush',$7,$8,$9,
          true,$10,$11,'profile-json',now(),now()
        )`,
        [
          creatorId,
          email,
          passwordHash,
          profile.name,
          profile.handle,
          profile.slug,
          profile.avatar_initials,
          profile.avatar_color,
          profile.avatar_url,
          profile.bio,
          profile.cover_url,
        ],
      );
    }

    // Shift current 4th+ pinned posts down one slot.
    await client.query(
      `UPDATE "FeedPost"
       SET "sortOrder" = "sortOrder" + 1, "updatedAt" = now()
       WHERE "sortOrder" >= $1 AND "sortOrder" < 0`,
      [FOURTH_SORT],
    );

    const postedAt = post.posted_at ? new Date(post.posted_at) : new Date();
    const tags = Array.isArray(post.tags) ? post.tags : [];

    await client.query(
      `INSERT INTO "FeedPost" (
        id, category, text, tags, "mediaJson", "audioJson",
        likes, comments, shares, following, "membersOnly",
        "postedAt", "postedAgo", "sortOrder", "creatorId", "createdAt", "updatedAt"
      ) VALUES (
        $1,$2,$3,$4::text[],$5::jsonb,$6::jsonb,
        $7,$8,$9,$10,false,
        $11,$12,$13,$14,now(),now()
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
        following = true,
        "membersOnly" = false,
        "postedAt" = excluded."postedAt",
        "postedAgo" = excluded."postedAgo",
        "sortOrder" = $13,
        "creatorId" = excluded."creatorId",
        "updatedAt" = now()`,
      [
        String(post.id),
        post.category || "personal",
        post.text || "",
        tags,
        post.media ? JSON.stringify(post.media) : null,
        post.audio ? JSON.stringify(post.audio) : null,
        Number(post.engagement?.likes || 0),
        Number(post.engagement?.comments || 0),
        Number(post.engagement?.shares || 0),
        true,
        postedAt.toISOString(),
        post.posted_ago ?? "2h",
        FOURTH_SORT,
        creatorId,
      ],
    );

    await client.query("COMMIT");

    const top = await client.query(
      `SELECT fp.id, fp."sortOrder", cu.name, cu.verified, LEFT(fp.text, 60) AS text
       FROM "FeedPost" fp
       JOIN "CreatorUser" cu ON cu.id = fp."creatorId"
       ORDER BY fp."sortOrder" ASC, fp."postedAt" DESC
       LIMIT 6`,
    );

    console.log(`Creator ready: ${profile.name} (${profile.handle}) verified=true`);
    console.log(`Post pinned 4th: ${post.id}`);
    console.log(`Temp password: ${TEMP_PASSWORD}`);
    console.log("feed top 6", top.rows);
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
