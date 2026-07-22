import { prisma } from "@/lib/prisma";

const VALID_NOTIFY_LEVELS = new Set(["all", "personalized", "none"]);

export function normalizeNotifyLevel(value: unknown): string {
  if (typeof value === "string" && VALID_NOTIFY_LEVELS.has(value)) return value;
  return "personalized";
}

export async function resolveCreatorIdBySlug(slug: string) {
  const creator = await prisma.creatorUser.findFirst({
    where: { slug },
    select: { id: true, slug: true, name: true },
  });
  return creator;
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
