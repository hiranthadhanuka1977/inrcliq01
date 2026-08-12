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

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || "CR";
}

async function uniqueCreatorHandle(preferred: string) {
  let handle = bareHandle(preferred) || `creator-${randomBytes(3).toString("hex")}`;
  let suffix = 0;
  while (await prisma.creatorUser.findFirst({ where: { handle }, select: { id: true } })) {
    suffix += 1;
    handle = `${bareHandle(preferred).slice(0, 40) || "creator"}-${suffix}`;
  }
  return handle;
}

async function uniqueCreatorEmail(preferred: string) {
  let email = preferred.trim().toLowerCase();
  let suffix = 0;
  while (await prisma.creatorUser.findFirst({ where: { email }, select: { id: true } })) {
    suffix += 1;
    const [local, domain = "creators.inrcliq.local"] = preferred.split("@");
    email = `${local}+c${suffix}@${domain}`.toLowerCase();
  }
  return email;
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

/**
 * Ensure an auth seller has a linked CreatorUser (needed for Collection FK).
 * Creates one from UserProfile when missing. Safe to call repeatedly.
 */
export async function ensureCreatorUserForAuthUser(
  userId: string,
): Promise<{ id: string; slug: string | null; name: string } | null> {
  const existing = await prisma.creatorUser.findFirst({
    where: { userId },
    select: { id: true, slug: true, name: true },
  });
  if (existing) return existing;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      handle: true,
      firstName: true,
      lastName: true,
      passwordHash: true,
      profile: {
        select: {
          slug: true,
          displayName: true,
          handle: true,
          avatarInitials: true,
          avatarColor: true,
          avatarUrl: true,
          verified: true,
          bio: true,
          coverUrl: true,
        },
      },
    },
  });

  const profile = user?.profile;
  if (!user || !profile?.slug) return null;

  const bySlug = await prisma.creatorUser.findFirst({
    where: { slug: profile.slug },
    select: { id: true, slug: true, name: true, userId: true },
  });
  if (bySlug) {
    if (!bySlug.userId) {
      await prisma.creatorUser.update({
        where: { id: bySlug.id },
        data: { userId: user.id },
      });
    }
    return { id: bySlug.id, slug: bySlug.slug, name: bySlug.name };
  }

  const displayName =
    profile.displayName.trim() ||
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    profile.handle ||
    "Creator";
  const preferredHandle = bareHandle(profile.handle || user.handle || profile.slug) || profile.slug;
  const handle = await uniqueCreatorHandle(preferredHandle);
  const preferredEmail = user.email?.includes("@")
    ? user.email
    : `${preferredHandle}@creators.inrcliq.local`;
  const email = await uniqueCreatorEmail(preferredEmail);
  const passwordHash =
    user.passwordHash || `!seller-bridge:${randomBytes(24).toString("hex")}`;

  try {
    return await prisma.creatorUser.create({
      data: {
        email,
        passwordHash,
        name: displayName,
        handle,
        slug: profile.slug,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarInitials: profile.avatarInitials || initialsFromName(displayName),
        avatarColor: profile.avatarColor || "#6b9fff",
        avatarUrl: profile.avatarUrl,
        verified: profile.verified,
        bio: profile.bio || null,
        coverUrl: profile.coverUrl,
        source: "seller-tools-auto",
        userId: user.id,
      },
      select: { id: true, slug: true, name: true },
    });
  } catch {
    const raced = await prisma.creatorUser.findFirst({
      where: {
        OR: [{ userId: user.id }, { slug: profile.slug }, { handle }, { email }],
      },
      select: { id: true, slug: true, name: true, userId: true },
    });
    if (!raced) return null;
    if (!raced.userId) {
      await prisma.creatorUser.update({
        where: { id: raced.id },
        data: { userId: user.id },
      });
    }
    return { id: raced.id, slug: raced.slug, name: raced.name };
  }
}
