import { config } from "dotenv";
import { Client } from "pg";

config({ path: ".env" });

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const summary = await client.query(`
  SELECT
    cc.slug,
    cu.handle,
    cu.name,
    cc.title,
    COUNT(cp.id)::int AS products
  FROM "CreatorCollection" cc
  JOIN "CreatorUser" cu ON cu.id = cc."creatorId"
  LEFT JOIN "CollectionProduct" cp ON cp."collectionId" = cc.id
  GROUP BY cc.slug, cu.handle, cu.name, cc.title
  ORDER BY cc.slug
`);

const sample = await client.query(`
  SELECT cp."productKey", cp.name, cp.kind, cp.price,
         (cp."detailJson" IS NOT NULL) AS has_detail
  FROM "CollectionProduct" cp
  JOIN "CreatorCollection" cc ON cc.id = cp."collectionId"
  WHERE cc.slug = 'mia-chen'
  ORDER BY cp."sortOrder"
  LIMIT 5
`);

console.log("collections", summary.rows);
console.log("sample products", sample.rows);

await client.end();
