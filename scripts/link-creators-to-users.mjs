/**
 * Backfill: create auth `User` rows for every `CreatorUser`, link CreatorUser.userId,
 * and set FeedPost.userId so feed items point at the same User.
 *
 * Usage: npm run db:link-creators
 */
import { randomBytes } from "node:crypto";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: ".env.local" });
dotenv.config();

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

async function ensureUniqueHandle(client, preferred) {
  let candidate = preferred || `creator-${randomBytes(4).toString("hex")}`;
  let suffix = 0;
  while (true) {
    const check = await client.query(`select id from "User" where lower(handle) = lower($1)`, [
      candidate,
    ]);
    if (check.rows.length === 0) return candidate;
    suffix += 1;
    candidate = `${preferred.slice(0, 40)}-${suffix}`;
  }
}

async function ensureUniqueEmail(client, preferred) {
  let candidate = preferred;
  let suffix = 0;
  while (true) {
    const check = await client.query(`select id from "User" where lower(email) = lower($1)`, [
      candidate,
    ]);
    if (check.rows.length === 0) return candidate;
    suffix += 1;
    const [local, domain = "creators.inrcliq.local"] = preferred.split("@");
    candidate = `${local}+c${suffix}@${domain}`;
  }
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  const client = new pg.Client({ connectionString });
  await client.connect();

  try {
    await client.query("BEGIN");

    const creators = await client.query(
      `select id, email, "passwordHash", handle, "firstName", "lastName", "userId"
       from "CreatorUser"
       order by "createdAt" asc`,
    );

    let usersCreated = 0;
    let usersLinked = 0;
    let postsLinked = 0;

    for (const creator of creators.rows) {
      let userId = creator.userId;

      if (!userId) {
        const existingByEmail = await client.query(
          `select id from "User" where lower(email) = lower($1)`,
          [creator.email],
        );

        if (existingByEmail.rows[0]) {
          userId = existingByEmail.rows[0].id;
        } else {
          const preferredHandle = bareHandle(creator.handle);
          const handle = await ensureUniqueHandle(client, preferredHandle);
          const email = await ensureUniqueEmail(client, creator.email);
          userId = cuid();

          await client.query(
            `insert into "User" (
              id, email, "emailVerified", "firstName", "lastName", handle,
              "accountType", "signupMethod", "onboardingStep", "passwordHash",
              "createdAt", "updatedAt"
            ) values (
              $1, $2, now(), $3, $4, $5,
              'ADULT', 'feed-creator', 'complete', $6,
              now(), now()
            )`,
            [
              userId,
              email,
              creator.firstName,
              creator.lastName,
              handle,
              creator.passwordHash,
            ],
          );
          usersCreated += 1;
        }

        await client.query(
          `update "CreatorUser" set "userId" = $2, "updatedAt" = now() where id = $1`,
          [creator.id, userId],
        );
        usersLinked += 1;
      }

      const linkedPosts = await client.query(
        `update "FeedPost"
         set "userId" = $2, "updatedAt" = now()
         where "creatorId" = $1 and ("userId" is distinct from $2)`,
        [creator.id, userId],
      );
      postsLinked += linkedPosts.rowCount || 0;
    }

    await client.query("COMMIT");

    const totals = await client.query(`
      select
        (select count(*)::int from "CreatorUser") as creators,
        (select count(*)::int from "CreatorUser" where "userId" is not null) as creators_linked,
        (select count(*)::int from "FeedPost") as posts,
        (select count(*)::int from "FeedPost" where "userId" is not null) as posts_linked,
        (select count(*)::int from "User" where "signupMethod" = 'feed-creator') as feed_users
    `);

    console.log(
      JSON.stringify(
        {
          usersCreated,
          usersLinked,
          postsLinked,
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
