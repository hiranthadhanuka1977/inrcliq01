/**
 * One-time fill for the dummy video posts created with no like count.
 * Most liked only renders videos whose stored likes are above zero.
 */
import pg from "pg";

const LIKES = [
  210, 186, 164, 151, 138, 121, 109, 97, 86, 74, 68, 61, 53, 48, 41, 36, 33, 27, 22, 19, 15, 12, 11, 9, 8, 7, 6, 5, 4,
  4, 3, 3, 2, 2, 2, 1, 1, 1, 1, 1,
];

function databaseUrl() {
  return (
    process.env.DATABASE_URL_UNPOOLED?.trim() ||
    process.env.POSTGRES_URL_NON_POOLING?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    ""
  );
}

async function main() {
  const connectionString = databaseUrl();
  if (!connectionString) {
    console.log("[sample-likes] skipped, no database url");
    return;
  }

  const client = new pg.Client({ connectionString, ssl: connectionString.includes("localhost") ? undefined : { rejectUnauthorized: false } });
  await client.connect();
  try {
    const posts = await client.query(
      `SELECT id FROM "FeedPost" WHERE text LIKE '%#sampleclip%' ORDER BY id ASC`,
    );
    if (!posts.rows.length) {
      console.log("[sample-likes] no sample videos");
      return;
    }
    await client.query("BEGIN");
    for (let index = 0; index < posts.rows.length; index += 1) {
      await client.query(`UPDATE "FeedPost" SET likes = $2, "updatedAt" = now() WHERE id = $1`, [
        posts.rows[index].id,
        LIKES[index % LIKES.length],
      ]);
    }
    await client.query("COMMIT");
    console.log(`[sample-likes] updated ${posts.rows.length}`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("[sample-likes] failed");
  console.error(error instanceof Error ? error.message.replace(/postgres(?:ql)?:\/\/\S+/gi, "[redacted]") : "unknown");
  process.exit(1);
});
