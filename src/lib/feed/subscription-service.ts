import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { hashPassword } from "@/lib/auth/credentials";
import { ensureCreatorLinkedToUser } from "@/lib/feed/creator-user-bridge";
import { prisma } from "@/lib/prisma";

const VALID_NOTIFY_LEVELS = new Set(["all", "personalized", "none"]);
const TEMP_CREATOR_PASSWORD = "Think100%";

const PROFILE_FILES: Record<string, string> = {
  "mia-chen": "mia-chen.json",
  "dev-weekly": "dev-weekly.json",
  hiran: "hiran.json",
  "planet-unfolded": "planet-unfolded.json",
  "good-guy-podcast": "good-guy-podcast.json",
  "bathiya-santhush": "bathiya-santhush.json",
};

type ProfileSeed = {
  slug: string;
  name: string;
  handle: string;
  avatar_initials?: string;
  avatar_color?: string;
  avatar_url?: string | null;
  verified?: boolean;
  bio?: string | null;
  cover_url?: string | null;
};

export function normalizeNotifyLevel(value: unknown): string {
  if (typeof value === "string" && VALID_NOTIFY_LEVELS.has(value)) return value;
  return "personalized";
}

function normalizeHandle(handle: string) {
  const trimmed = handle.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
}

function handleLocalPart(handle: string) {
  return normalizeHandle(handle)
    .replace(/^@/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 32);
}

function readProfileSeed(slug: string): ProfileSeed | null {
  const fileName = PROFILE_FILES[slug];
  if (!fileName) return null;
  const filePath = join(process.cwd(), "data", fileName);
  if (!existsSync(filePath)) return null;
  return JSON.parse(readFileSync(filePath, "utf-8")) as ProfileSeed;
}

/**
 * Resolve a creator for subscription APIs. If the production DB was migrated
 * but never seeded, create the CreatorUser row from the profile JSON so
 * subscribe/unsubscribe can work without a manual seed run.
 */
export async function resolveCreatorIdBySlug(slug: string) {
  const existing = await prisma.creatorUser.findFirst({
    where: { slug },
    select: { id: true, slug: true, name: true },
  });
  if (existing) {
    await ensureCreatorLinkedToUser(existing.id);
    return existing;
  }

  const profile = readProfileSeed(slug);
  if (!profile?.handle || !profile.name) return null;

  const handle = normalizeHandle(profile.handle);
  const local = handleLocalPart(handle) || `creator-${slug}`;
  const email = `${local}@creators.inrcliq.local`;
  const passwordHash = await hashPassword(TEMP_CREATOR_PASSWORD);
  const nameParts = profile.name.trim().split(/\s+/);
  const firstName = nameParts[0] || null;
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : null;

  const byHandle = await prisma.creatorUser.findFirst({
    where: { handle },
    select: { id: true, slug: true, name: true },
  });
  if (byHandle) {
    const resolved = !byHandle.slug
      ? await prisma.creatorUser.update({
          where: { id: byHandle.id },
          data: { slug },
          select: { id: true, slug: true, name: true },
        })
      : byHandle;
    await ensureCreatorLinkedToUser(resolved.id);
    return resolved;
  }

  try {
    const created = await prisma.creatorUser.create({
      data: {
        email,
        passwordHash,
        name: profile.name,
        handle,
        slug,
        firstName,
        lastName,
        avatarInitials: profile.avatar_initials || profile.name.slice(0, 2).toUpperCase(),
        avatarColor: profile.avatar_color || "#6b9fff",
        avatarUrl: profile.avatar_url ?? null,
        verified: Boolean(profile.verified),
        bio: profile.bio ?? null,
        coverUrl: profile.cover_url ?? null,
        source: "profile-json-auto",
      },
      select: { id: true, slug: true, name: true },
    });
    await ensureCreatorLinkedToUser(created.id);
    return created;
  } catch (error) {
    // Race: another request created the same creator.
    const raced = await prisma.creatorUser.findFirst({
      where: { OR: [{ slug }, { handle }, { email }] },
      select: { id: true, slug: true, name: true },
    });
    if (raced) {
      await ensureCreatorLinkedToUser(raced.id);
      return raced;
    }
    throw error;
  }
}

export async function listActiveSubscriptionsForUser(userId: string) {
  return prisma.creatorSubscription.findMany({
    where: { userId, status: "ACTIVE" },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          handle: true,
          slug: true,
          avatarInitials: true,
          avatarColor: true,
          avatarUrl: true,
          verified: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function countActiveSubscriptionsForUser(userId: string) {
  return prisma.creatorSubscription.count({
    where: { userId, status: "ACTIVE" },
  });
}

export async function getSubscriptionForUser(userId: string, creatorId: string) {
  return prisma.creatorSubscription.findUnique({
    where: {
      userId_creatorId: { userId, creatorId },
    },
  });
}

export async function countActiveSubscribers(creatorId: string) {
  return prisma.creatorSubscription.count({
    where: { creatorId, status: "ACTIVE" },
  });
}

export async function subscribeToCreator(
  userId: string,
  creatorId: string,
  notifyLevel?: string,
) {
  const level = normalizeNotifyLevel(notifyLevel);
  return prisma.creatorSubscription.upsert({
    where: {
      userId_creatorId: { userId, creatorId },
    },
    create: {
      userId,
      creatorId,
      status: "ACTIVE",
      notifyLevel: level,
      cancelledAt: null,
    },
    update: {
      status: "ACTIVE",
      notifyLevel: level,
      cancelledAt: null,
    },
  });
}

export async function unsubscribeFromCreator(userId: string, creatorId: string) {
  const existing = await getSubscriptionForUser(userId, creatorId);
  if (!existing) return null;

  return prisma.creatorSubscription.update({
    where: { id: existing.id },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
    },
  });
}

export async function updateSubscriptionNotifyLevel(
  userId: string,
  creatorId: string,
  notifyLevel: string,
) {
  const existing = await getSubscriptionForUser(userId, creatorId);
  if (!existing || existing.status !== "ACTIVE") return null;

  return prisma.creatorSubscription.update({
    where: { id: existing.id },
    data: { notifyLevel: normalizeNotifyLevel(notifyLevel) },
  });
}
