/**
 * Seed the default chat inbox for every onboarded user.
 * Each user gets their own copy of data/chat-inbox-seed.json.
 *
 * Usage: npm run db:seed-chat
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const ROOT = process.cwd();
const SEED_PATH = join(ROOT, "data", "chat-inbox-seed.json");
const CONVERSATIONS = JSON.parse(readFileSync(SEED_PATH, "utf8"));

function cuid() {
  return `c${randomBytes(12).toString("hex")}`;
}

function hoursAgo(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

function daysAgo(days) {
  return hoursAgo(days * 24);
}

function seedCreatedAt(time, index, total) {
  const lower = String(time).toLowerCase();
  if (lower.includes("just now") || lower.includes("2m")) return hoursAgo(0.03);
  if (lower.includes("1h")) return hoursAgo(1);
  if (lower.includes("yesterday")) return hoursAgo(20 - index);
  if (lower.includes("last week")) return daysAgo(7);
  if (lower.includes("tue")) return daysAgo(3);
  if (lower.includes("mon")) return daysAgo(4);
  if (lower.includes("mar")) return daysAgo(30);
  return hoursAgo(total - index);
}

function personalizeSeedBody(body, firstName) {
  return String(body).replace(/\bDhanuka\b/g, firstName);
}

async function findCreator(client, conversation) {
  const slug = conversation.participant.slug;
  const handle = conversation.participant.handle;
  if (!slug && !handle) return null;

  const { rows } = await client.query(
  `SELECT id, name, handle, "avatarInitials", "avatarColor", "avatarUrl", slug
   FROM "CreatorUser"
   WHERE slug = $1 OR handle = $2
   LIMIT 1`,
    [slug ?? "", handle],
  );
  return rows[0] ?? null;
}

async function adoptLegacyThread(client, userId, seedKey, conversation) {
  const slug = conversation.participant.slug;
  const handle = conversation.participant.handle;
  const params = [userId];
  let where = `"userId" = $1 AND "seedKey" IS NULL AND (`;
  const parts = [];
  if (slug) {
    params.push(slug);
    parts.push(`"peerSlug" = $${params.length}`);
  }
  if (handle) {
    params.push(handle);
    parts.push(`"peerHandle" = $${params.length}`);
  }
  if (parts.length === 0) return false;
  where += `${parts.join(" OR ")})`;

  const { rows } = await client.query(
    `SELECT id FROM "ChatThread" WHERE ${where} LIMIT 1`,
    params,
  );
  if (!rows[0]) return false;

  await client.query(`UPDATE "ChatThread" SET "seedKey" = $1, "updatedAt" = NOW() WHERE id = $2`, [
    seedKey,
    rows[0].id,
  ]);
  return true;
}

async function seedUserInbox(client, user) {
  const firstName = user.firstName?.trim() || "there";
  let created = 0;

  for (const conversation of CONVERSATIONS) {
    const { rows: existing } = await client.query(
      `SELECT id FROM "ChatThread" WHERE "userId" = $1 AND "seedKey" = $2 LIMIT 1`,
      [user.id, conversation.id],
    );
    if (existing[0]) continue;

    if (await adoptLegacyThread(client, user.id, conversation.id, conversation)) {
      continue;
    }

    const creator = await findCreator(client, conversation);
    const messages = conversation.messages.map((message, index) => ({
      body: personalizeSeedBody(message.body, firstName),
      fromMe: message.sender === "me",
      createdAt: seedCreatedAt(message.time, index, conversation.messages.length),
    }));
    const last = messages[messages.length - 1];
    const threadId = cuid();
    const now = new Date();

    await client.query(
      `INSERT INTO "ChatThread" (
        id, "userId", "seedKey", "peerCreatorId", "peerName", "peerHandle", "peerInitials",
        "peerAvatarColor", "peerAvatarUrl", "peerSlug", "peerOnline", preview, "lastMessageAt",
        "unreadCount", "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13,
        $14, $15, $16
      )`,
      [
        threadId,
        user.id,
        conversation.id,
        creator?.id ?? null,
        creator?.name ?? conversation.participant.name,
        creator?.handle ?? conversation.participant.handle,
        creator?.avatarInitials ?? conversation.participant.initials,
        creator?.avatarColor ?? conversation.participant.avatarColor,
        creator?.avatarUrl ?? conversation.participant.avatarUrl,
        creator?.slug ?? conversation.participant.slug ?? null,
        Boolean(conversation.participant.online),
        last ? personalizeSeedBody(last.body, firstName) : conversation.preview,
        last?.createdAt ?? now,
        conversation.unread,
        now,
        now,
      ],
    );

    for (const message of messages) {
      await client.query(
        `INSERT INTO "ChatMessage" (id, "threadId", body, "fromMe", "createdAt")
         VALUES ($1, $2, $3, $4, $5)`,
        [cuid(), threadId, message.body, message.fromMe, message.createdAt],
      );
    }

    created += 1;
  }

  return created;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const client = new pg.Client({ connectionString });
  await client.connect();

  try {
    const { rows: users } = await client.query(
      `SELECT id, email, "firstName"
       FROM "User"
       WHERE "onboardingStep" = 'complete'
       ORDER BY "createdAt" ASC`,
    );

    console.log(`Seeding chat inboxes for ${users.length} onboarded user(s)...`);

    for (const user of users) {
      const created = await seedUserInbox(client, user);
      console.log(`  ${user.email}: ${created} new thread(s)`);
    }

    console.log("Done.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
