import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

function bareHandle(handle: string) {
  return handle
    .trim()
    .replace(/^@/, "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "")
    .slice(0, 48);
}

function newId() {
  return `c${randomBytes(12).toString("hex")}`;
}

/**
 * Ensure a CreatorUser has a linked auth User, and that creator's FeedPosts
 * point at that User. Safe to call repeatedly.
 */
export async function ensureCreatorLinkedToUser(creatorId: string): Promise<string | null> {
  const creator = await prisma.creatorUser.findUnique({
    where: { id: creatorId },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      handle: true,
      firstName: true,
      lastName: true,
      userId: true,
    },
  });
  if (!creator) return null;
  if (creator.userId) {
    await prisma.feedPost.updateMany({
      where: {
        creatorId: creator.id,
        NOT: { userId: creator.userId },
      },
      data: { userId: creator.userId },
    });
    return creator.userId;
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: creator.email },
    select: { id: true },
  });

  let userId = existingUser?.id ?? null;

  if (!userId) {
    const preferred = bareHandle(creator.handle) || `creator-${creator.id.slice(-6)}`;
    let handle = preferred;
    let suffix = 0;
    while (await prisma.user.findFirst({ where: { handle }, select: { id: true } })) {
      suffix += 1;
      handle = `${preferred.slice(0, 40)}-${suffix}`;
    }

    let email = creator.email;
    suffix = 0;
    while (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
      suffix += 1;
      const [local, domain = "creators.inrcliq.local"] = creator.email.split("@");
      email = `${local}+c${suffix}@${domain}`;
    }

    const created = await prisma.user.create({
      data: {
        id: newId(),
        email,
        emailVerified: new Date(),
        firstName: creator.firstName,
        lastName: creator.lastName,
        handle,
        accountType: "ADULT",
        signupMethod: "feed-creator",
        onboardingStep: "complete",
        passwordHash: creator.passwordHash,
      },
      select: { id: true },
    });
    userId = created.id;
  }

  await prisma.creatorUser.update({
    where: { id: creator.id },
    data: { userId },
  });

  await prisma.feedPost.updateMany({
    where: { creatorId: creator.id },
    data: { userId },
  });

  return userId;
}
