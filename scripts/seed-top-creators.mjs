/**
 * Seed verified Top Creators profiles (User + UserProfile + CreatorUser).
 * No collections, no service-request catalogs, no feed posts — they can add those later.
 *
 * Usage: node scripts/seed-top-creators.mjs
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: ".env.local" });
dotenv.config();

const TEMP_PASSWORD = "Think100%";
const SOURCE = "profile-json";
const DATA_DIR = join(process.cwd(), "data");

const CREATORS = [
  {
    file: "billie-eilish.json",
    email: "billieeilish@creators.inrcliq.local",
    firstName: "Billie",
    lastName: "Eilish",
  },
  {
    file: "hard-fork.json",
    email: "hardfork@creators.inrcliq.local",
    firstName: "Hard",
    lastName: "Fork",
  },
  {
    file: "james-clear.json",
    email: "jamesclear@creators.inrcliq.local",
    firstName: "James",
    lastName: "Clear",
  },
  {
    file: "taylor-swift.json",
    email: "taylorswift@creators.inrcliq.local",
    firstName: "Taylor",
    lastName: "Swift",
  },
  {
    file: "inrcliq-originals.json",
    email: "inrcliqoriginals@creators.inrcliq.local",
    firstName: "INRCLIQ",
    lastName: "Originals",
  },
];

function cuid() {
  return `c${randomBytes(12).toString("hex")}`;
}

function bareHandle(handle) {
  return String(handle || "")
    .trim()
    .replace(/^@/, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "")
    .slice(0, 48);
}

function normalizeHandle(handle) {
  const trimmed = String(handle || "").trim();
  if (!trimmed) return "";
  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  const passwordHash = await bcrypt.hash(TEMP_PASSWORD, 10);
  const client = new pg.Client({ connectionString });
  await client.connect();
  await client.query("BEGIN");

  const results = [];

  try {
    for (const spec of CREATORS) {
      const profile = JSON.parse(readFileSync(join(DATA_DIR, spec.file), "utf8"));
      const handle = normalizeHandle(profile.handle);
      const slug = String(profile.slug || "").trim();
      const userHandle = bareHandle(handle);
      const displayName = profile.name;
      const followersLabel =
        profile.stats?.followers != null ? String(profile.stats.followers) : null;

      if (!handle || !slug) {
        throw new Error(`${spec.file} is missing handle or slug`);
      }

      const creatorMatch = await client.query(
        `SELECT id, "userId" FROM "CreatorUser"
         WHERE lower(handle) = lower($1) OR slug = $2
         LIMIT 1`,
        [handle, slug],
      );
      let creatorId = creatorMatch.rows[0]?.id ?? null;
      let userId = creatorMatch.rows[0]?.userId ?? null;

      if (!userId) {
        const userMatch = await client.query(
          `SELECT id FROM "User"
           WHERE lower(email) = lower($1) OR lower(handle) = lower($2)
           LIMIT 1`,
          [spec.email, userHandle],
        );
        userId = userMatch.rows[0]?.id ?? null;
      }

      if (!userId) {
        const profileMatch = await client.query(
          `SELECT "userId" FROM "UserProfile"
           WHERE slug = $1 OR lower(handle) = lower($2)
           LIMIT 1`,
          [slug, handle],
        );
        userId = profileMatch.rows[0]?.userId ?? null;
      }

      if (!userId) {
        userId = cuid();
        await client.query(
          `INSERT INTO "User" (
            id, email, "emailVerified", "firstName", "lastName", handle,
            "accountType", "signupMethod", "onboardingStep", "passwordHash",
            "createdAt", "updatedAt"
          ) VALUES (
            $1, $2, now(), $3, $4, $5,
            'ADULT', 'feed-creator', 'complete', $6,
            now(), now()
          )`,
          [userId, spec.email, spec.firstName, spec.lastName, userHandle, passwordHash],
        );
      } else {
        await client.query(
          `UPDATE "User" SET
            email = $2,
            "emailVerified" = coalesce("emailVerified", now()),
            "firstName" = $3,
            "lastName" = $4,
            handle = $5,
            "passwordHash" = $6,
            "accountType" = 'ADULT',
            "onboardingStep" = 'complete',
            "updatedAt" = now()
           WHERE id = $1`,
          [userId, spec.email, spec.firstName, spec.lastName, userHandle, passwordHash],
        );
      }

      if (!creatorId) {
        creatorId = cuid();
        await client.query(
          `INSERT INTO "CreatorUser" (
            id, email, "passwordHash", name, handle, slug,
            "firstName", "lastName", "avatarInitials", "avatarColor", "avatarUrl",
            verified, bio, "coverUrl", source, "userId", "createdAt", "updatedAt"
          ) VALUES (
            $1,$2,$3,$4,$5,$6,
            $7,$8,$9,$10,$11,
            true,$12,$13,$14,$15,now(),now()
          )`,
          [
            creatorId,
            spec.email,
            passwordHash,
            displayName,
            handle,
            slug,
            spec.firstName,
            spec.lastName,
            profile.avatar_initials,
            profile.avatar_color,
            profile.avatar_url ?? null,
            profile.bio ?? "",
            profile.cover_url ?? null,
            SOURCE,
            userId,
          ],
        );
      } else {
        await client.query(
          `UPDATE "CreatorUser" SET
            email = $2,
            "passwordHash" = $3,
            name = $4,
            handle = $5,
            slug = $6,
            "firstName" = $7,
            "lastName" = $8,
            "avatarInitials" = $9,
            "avatarColor" = $10,
            "avatarUrl" = $11,
            verified = true,
            bio = $12,
            "coverUrl" = $13,
            source = $14,
            "userId" = $15,
            "updatedAt" = now()
           WHERE id = $1`,
          [
            creatorId,
            spec.email,
            passwordHash,
            displayName,
            handle,
            slug,
            spec.firstName,
            spec.lastName,
            profile.avatar_initials,
            profile.avatar_color,
            profile.avatar_url ?? null,
            profile.bio ?? "",
            profile.cover_url ?? null,
            SOURCE,
            userId,
          ],
        );
      }

      const existingProfile = await client.query(
        `SELECT id FROM "UserProfile" WHERE "userId" = $1`,
        [userId],
      );

      if (existingProfile.rows[0]) {
        await client.query(
          `UPDATE "UserProfile" SET
            slug = $2,
            "displayName" = $3,
            handle = $4,
            "avatarInitials" = $5,
            "avatarColor" = $6,
            "avatarUrl" = $7,
            "coverUrl" = $8,
            bio = $9,
            verified = true,
            "specialRequests" = false,
            "subscriptionPriceLabel" = null,
            "followersLabel" = $10,
            "followingCount" = 0,
            "subscribersCount" = 0,
            "postsCountLabel" = 0,
            "popularPostsJson" = null,
            "pinnedFeedPostIds" = '{}'::text[],
            source = $11,
            "updatedAt" = now()
           WHERE "userId" = $1`,
          [
            userId,
            slug,
            displayName,
            handle,
            profile.avatar_initials,
            profile.avatar_color,
            profile.avatar_url ?? null,
            profile.cover_url ?? null,
            profile.bio ?? "",
            followersLabel,
            SOURCE,
          ],
        );
      } else {
        await client.query(
          `INSERT INTO "UserProfile" (
            id, "userId", slug, "displayName", handle, "avatarInitials", "avatarColor",
            "avatarUrl", "coverUrl", bio, verified, "specialRequests",
            "subscriptionPriceLabel", "followersLabel", "followingCount", "subscribersCount",
            "postsCountLabel", "popularPostsJson", "pinnedFeedPostIds", source,
            "createdAt", "updatedAt"
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,
            $8,$9,$10,true,false,
            null,$11,0,0,
            0,null,'{}'::text[],$12,
            now(), now()
          )`,
          [
            cuid(),
            userId,
            slug,
            displayName,
            handle,
            profile.avatar_initials,
            profile.avatar_color,
            profile.avatar_url ?? null,
            profile.cover_url ?? null,
            profile.bio ?? "",
            followersLabel,
            SOURCE,
          ],
        );
      }

      const extras = await client.query(
        `SELECT
           (SELECT count(*)::int FROM "CreatorCollection" WHERE slug = $1) AS collections,
           (SELECT count(*)::int FROM "SpecialRequestCatalog" WHERE "userId" = $2) AS catalogs`,
        [slug, userId],
      );

      results.push({
        name: displayName,
        handle,
        slug,
        userId,
        creatorId,
        collections: extras.rows[0].collections,
        catalogs: extras.rows[0].catalogs,
      });
    }

    await client.query("COMMIT");
    console.log(`Seeded ${results.length} verified Top Creators (no collections, no service requests).`);
    console.log(`Temp password: ${TEMP_PASSWORD}`);
    console.log(JSON.stringify(results, null, 2));
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
