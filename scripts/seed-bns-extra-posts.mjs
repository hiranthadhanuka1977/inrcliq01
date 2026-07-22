/**
 * Upsert BnS profile feed posts into FeedPost and place new ones in the main feed
 * right after bns-001 (4th).
 *
 * Usage: node scripts/seed-bns-extra-posts.mjs
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const PROFILE_PATH = join(process.cwd(), "data", "bathiya-santhush.json");

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  const profile = JSON.parse(readFileSync(PROFILE_PATH, "utf8"));
  const posts = Array.isArray(profile.feed_posts) ? profile.feed_posts : [];
  if (posts.length < 2) throw new Error("Expected multiple feed_posts in profile JSON");

  const client = new pg.Client({ connectionString });
  await client.connect();
  await client.query("BEGIN");

  try {
    const creator = await client.query(
      `SELECT id FROM "CreatorUser" WHERE handle = $1`,
      [profile.handle],
    );
    if (!creator.rows[0]) throw new Error(`Creator ${profile.handle} not found`);
    const creatorId = creator.rows[0].id;

    // Place new posts directly under bns-001 (-997): -996, -995, ...
    const existingNew = await client.query(
      `SELECT id FROM "FeedPost" WHERE id = ANY($1::text[])`,
      [posts.filter((p) => p.id !== "bns-001").map((p) => p.id)],
    );
    const alreadySeeded = existingNew.rows.length > 0;

    if (!alreadySeeded) {
      const extraCount = posts.filter((p) => p.id !== "bns-001").length;
      await client.query(
        `UPDATE "FeedPost"
         SET "sortOrder" = "sortOrder" + $1, "updatedAt" = now()
         WHERE "sortOrder" >= -996 AND "sortOrder" < 0`,
        [extraCount],
      );
    }

    for (let index = 0; index < posts.length; index += 1) {
      const item = posts[index];
      const postedAt = item.posted_at ? new Date(item.posted_at) : new Date();
      const tags = Array.isArray(item.tags) ? item.tags : [];
      const sortOrder = item.id === "bns-001" ? -997 : -997 + index;

      await client.query(
        `INSERT INTO "FeedPost" (
          id, category, text, tags, "mediaJson", "audioJson",
          likes, comments, shares, following, "membersOnly",
          "postedAt", "postedAgo", "sortOrder", "creatorId", "createdAt", "updatedAt"
        ) VALUES (
          $1,$2,$3,$4::text[],$5::jsonb,$6::jsonb,
          $7,$8,$9,true,false,
          $10,$11,$12,$13,now(),now()
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
          "sortOrder" = excluded."sortOrder",
          "creatorId" = excluded."creatorId",
          "updatedAt" = now()`,
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
          postedAt.toISOString(),
          item.posted_ago ?? null,
          sortOrder,
          creatorId,
        ],
      );
    }

    await client.query("COMMIT");

    const top = await client.query(
      `SELECT fp.id, fp."sortOrder", cu.handle, LEFT(fp.text, 55) AS text
       FROM "FeedPost" fp
       JOIN "CreatorUser" cu ON cu.id = fp."creatorId"
       ORDER BY fp."sortOrder" ASC, fp."postedAt" DESC
       LIMIT 10`,
    );
    const bns = await client.query(
      `SELECT id, "sortOrder", LEFT(text, 60) AS text
       FROM "FeedPost" WHERE "creatorId" = $1 ORDER BY "sortOrder" ASC`,
      [creatorId],
    );

    console.log("BnS posts", bns.rows);
    console.log("Main feed top 10", top.rows);
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
