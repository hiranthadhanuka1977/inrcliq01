import { prisma } from "@/lib/prisma";
import { resolveCreatorIdBySlug } from "@/lib/feed/subscription-service";

export async function isFollowingCreator(userId: string, creatorId: string) {
  if (typeof prisma.creatorFollow?.findUnique !== "function") {
    return false;
  }

  const row = await prisma.creatorFollow.findUnique({
    where: {
      userId_creatorId: { userId, creatorId },
    },
    select: { id: true },
  });
  return Boolean(row);
}

export async function followCreator(userId: string, creatorId: string) {
  if (typeof prisma.creatorFollow?.upsert !== "function") {
    throw new Error("CreatorFollow model is not available.");
  }

  return prisma.creatorFollow.upsert({
    where: {
      userId_creatorId: { userId, creatorId },
    },
    create: { userId, creatorId },
    update: {},
  });
}

export async function unfollowCreator(userId: string, creatorId: string) {
  if (typeof prisma.creatorFollow?.deleteMany !== "function") {
    return;
  }

  await prisma.creatorFollow.deleteMany({
    where: { userId, creatorId },
  });
}

export async function listFollowedCreatorsForUser(userId: string) {
  return prisma.creatorFollow.findMany({
    where: { userId },
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
    orderBy: { createdAt: "desc" },
  });
}

export async function countFollowedCreatorsForUser(userId: string) {
  return prisma.creatorFollow.count({ where: { userId } });
}

export async function getFollowedCreatorIdsForUser(userId: string) {
  if (typeof prisma.creatorFollow?.findMany !== "function") {
    return new Set<string>();
  }

  const rows = await prisma.creatorFollow.findMany({
    where: { userId },
    select: { creatorId: true },
  });
  return new Set(rows.map((row) => row.creatorId));
}

export async function resolveFollowTargetBySlug(identifier: string) {
  const trimmed = identifier.trim();
  if (!trimmed) return null;

  const fromSlug = await resolveCreatorIdBySlug(trimmed);
  if (fromSlug) return fromSlug;

  const handle = trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
  const byHandle = await prisma.creatorUser.findFirst({
    where: {
      OR: [{ handle }, { handle: trimmed }],
    },
    select: { id: true, slug: true, name: true },
  });

  return byHandle;
}
