/**
 * Migrate creator collection JSON into Postgres.
 * Collections → "CreatorCollection" linked to "CreatorUser" by slug
 * Products → "CollectionProduct" linked to collection
 * JSON files remain as backup.
 *
 * Usage: npm run db:migrate-collection
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const ROOT = process.cwd();
const DATA_DIR = join(ROOT, "data");

function cuid() {
  return `c${randomBytes(12).toString("hex")}`;
}

function loadCollectionFiles() {
  return readdirSync(DATA_DIR)
    .filter((file) => file.endsWith("-collection.json"))
    .map((file) => {
      const data = JSON.parse(readFileSync(join(DATA_DIR, file), "utf8"));
      return { file, data };
    });
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  const files = loadCollectionFiles();
  if (files.length === 0) throw new Error("No *-collection.json files found in data/");

  const client = new pg.Client({ connectionString });
  await client.connect();
  await client.query("BEGIN");

  try {
    let collectionsUpserted = 0;
    let productsUpserted = 0;
    let productsSkipped = 0;

    for (const { file, data } of files) {
      const slug = String(data.slug || "").trim();
      if (!slug) throw new Error(`Missing slug in ${file}`);

      const creator = await client.query(
        `SELECT id, handle, name FROM "CreatorUser" WHERE slug = $1`,
        [slug],
      );
      if (!creator.rows[0]) {
        throw new Error(
          `No CreatorUser with slug="${slug}" for ${file}. Migrate feed creators first.`,
        );
      }

      const creatorId = creator.rows[0].id;
      const title = String(data.title || `${creator.rows[0].name} Collection`);
      const subtitle = String(data.subtitle || "");
      const products = Array.isArray(data.products) ? data.products : [];

      console.log(
        `Collection ${slug} → creator ${creator.rows[0].handle} (${products.length} products)`,
      );

      const existing = await client.query(
        `SELECT id FROM "CreatorCollection" WHERE slug = $1`,
        [slug],
      );

      let collectionId;
      if (existing.rows[0]) {
        collectionId = existing.rows[0].id;
        await client.query(
          `UPDATE "CreatorCollection"
           SET title = $2, subtitle = $3, "creatorId" = $4, source = 'collection-json', "updatedAt" = now()
           WHERE id = $1`,
          [collectionId, title, subtitle, creatorId],
        );
      } else {
        collectionId = cuid();
        await client.query(
          `INSERT INTO "CreatorCollection"
            (id, slug, title, subtitle, source, "creatorId", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, 'collection-json', $5, now(), now())`,
          [collectionId, slug, title, subtitle, creatorId],
        );
      }
      collectionsUpserted += 1;

      const seenKeys = new Set();

      for (let index = 0; index < products.length; index += 1) {
        const product = products[index];
        const productKey = String(product?.id || "").trim();
        if (!productKey) {
          productsSkipped += 1;
          console.warn(`  skip product without id at index ${index}`);
          continue;
        }
        if (seenKeys.has(productKey)) {
          productsSkipped += 1;
          console.warn(`  skip duplicate productKey ${productKey}`);
          continue;
        }
        seenKeys.add(productKey);

        const kind = product.kind === "digital" ? "digital" : "physical";
        const name = String(product.name || productKey);
        const price = String(product.price || "");
        const compareAtPrice = product.compareAtPrice ? String(product.compareAtPrice) : null;
        const description = String(product.description || "");
        const image = String(product.image || "");
        const imageAlt = String(product.image_alt || product.name || "");
        const rating = Number(product.rating) || 0;
        const soldLabel = String(product.soldLabel || "");
        const ctaLabel = product.ctaLabel ? String(product.ctaLabel) : null;
        const offerJson = product.offer ? JSON.stringify(product.offer) : null;
        const detailJson = product.detail ? JSON.stringify(product.detail) : null;

        const existingProduct = await client.query(
          `SELECT id FROM "CollectionProduct"
           WHERE "collectionId" = $1 AND "productKey" = $2`,
          [collectionId, productKey],
        );

        if (existingProduct.rows[0]) {
          await client.query(
            `UPDATE "CollectionProduct" SET
              kind = $2, name = $3, price = $4, "compareAtPrice" = $5, description = $6,
              image = $7, "imageAlt" = $8, rating = $9, "soldLabel" = $10,
              "offerJson" = $11::jsonb, "ctaLabel" = $12, "detailJson" = $13::jsonb,
              "sortOrder" = $14, "updatedAt" = now()
             WHERE id = $1`,
            [
              existingProduct.rows[0].id,
              kind,
              name,
              price,
              compareAtPrice,
              description,
              image,
              imageAlt,
              rating,
              soldLabel,
              offerJson,
              ctaLabel,
              detailJson,
              index,
            ],
          );
        } else {
          await client.query(
            `INSERT INTO "CollectionProduct"
              (id, "productKey", kind, name, price, "compareAtPrice", description,
               image, "imageAlt", rating, "soldLabel", "offerJson", "ctaLabel", "detailJson",
               "sortOrder", "collectionId", "createdAt", "updatedAt")
             VALUES
              ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13, $14::jsonb,
               $15, $16, now(), now())`,
            [
              cuid(),
              productKey,
              kind,
              name,
              price,
              compareAtPrice,
              description,
              image,
              imageAlt,
              rating,
              soldLabel,
              offerJson,
              ctaLabel,
              detailJson,
              index,
              collectionId,
            ],
          );
        }
        productsUpserted += 1;
      }

      // Remove DB products that are no longer in JSON (keeps sync clean)
      if (seenKeys.size > 0) {
        const keys = [...seenKeys];
        await client.query(
          `DELETE FROM "CollectionProduct"
           WHERE "collectionId" = $1
             AND NOT ("productKey" = ANY($2::text[]))`,
          [collectionId, keys],
        );
      }
    }

    const totals = await client.query(`
      SELECT
        (SELECT COUNT(*)::int FROM "CreatorCollection") AS collections,
        (SELECT COUNT(*)::int FROM "CollectionProduct") AS products,
        (SELECT COUNT(*)::int FROM "CollectionProduct" cp
          JOIN "CreatorCollection" cc ON cc.id = cp."collectionId"
          JOIN "CreatorUser" cu ON cu.id = cc."creatorId") AS linked
    `);

    await client.query("COMMIT");

    console.log(`Collections upserted: ${collectionsUpserted}`);
    console.log(`Products upserted: ${productsUpserted}, skipped: ${productsSkipped}`);
    console.log("DB totals →", totals.rows[0]);
    console.log("JSON backup retained under data/*-collection.json");
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
