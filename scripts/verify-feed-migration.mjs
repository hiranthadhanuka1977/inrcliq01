import { config } from "dotenv";
import { Client } from "pg";

config({ path: ".env" });

const client = new Client({ connectionString: process.env.DATABASE_URL });

await client.connect();

const counts = await client.query(`
  SELECT
    (SELECT COUNT(*)::int FROM "CreatorUser") AS creators,
    (SELECT COUNT(*)::int FROM "FeedPost") AS posts,
    (SELECT COUNT(*)::int FROM "FeedPost" WHERE "creatorId" IS NOT NULL) AS linked,
    (SELECT COUNT(*)::int FROM "FeedPost" fp
      LEFT JOIN "CreatorUser" cu ON cu.id = fp."creatorId"
      WHERE cu.id IS NULL) AS orphan_posts
`);

const sample = await client.query(`
  SELECT handle, name, email, slug
  FROM "CreatorUser"
  ORDER BY handle
  LIMIT 5
`);

const linkedSample = await client.query(`
  SELECT fp.id AS post_id, cu.handle, cu.name, fp.category
  FROM "FeedPost" fp
  JOIN "CreatorUser" cu ON cu.id = fp."creatorId"
  ORDER BY fp."sortOrder"
  LIMIT 5
`);

console.log("counts", counts.rows[0]);
console.log("creators sample", sample.rows);
console.log("linked posts sample", linkedSample.rows);

await client.end();
