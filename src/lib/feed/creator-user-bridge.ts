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

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^@/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

async function uniquePublicSlug(preferred: string) {
  let slug = slugify(preferred) || `user-${randomBytes(3).toString("hex")}`;
  const base = slug;
  let suffix = 0;
  while (
    (await prisma.userProfile.findFirst({ where: { slug }, select: { id: true } })) ||
    (await prisma.creatorUser.findFirst({ where: { slug }, select: { id: true } }))
  ) {
    suffix += 1;
    slug = `${base.slice(0, 56)}-${suffix}`;
  }
  return slug;
}

async function uniqueProfileHandle(preferred: string) {
  const bare = bareHandle(preferred) || `user-${randomBytes(3).toString("hex")}`;
  let handle = `@${bare}`;
  let suffix = 0;
  while (await prisma.userProfile.findFirst({ where: { handle }, select: { id: true } })) {
    suffix += 1;
    handle = `@${bare.slice(0, 40)}-${suffix}`;
  }
  return handle;
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
 * Ensure an auth user has a linked CreatorUser (needed for FeedPost / Collection FK).
 * Creates a stub UserProfile + CreatorUser when missing so first posts can publish.
 * Safe to call repeatedly.
 */
export async function ensureCreatorUserForAuthUser(
  userId: string,
): Promise<{ id: string; slug: string | null; name: string; verified: boolean } | null> {
  const existing = await prisma.creatorUser.findFirst({
    where: { userId },
    select: { id: true, slug: true, name: true, verified: true },
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
  if (!user) return null;

  const fallbackName =
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    user.handle?.replace(/^@/, "") ||
    user.email.split("@")[0] ||
    "Creator";
  const preferredSlugSource =
    user.profile?.slug?.trim() ||
    user.profile?.handle ||
    user.handle ||
    user.email.split("@")[0] ||
    `user-${user.id.slice(-6)}`;
  const slug = user.profile?.slug?.trim() || (await uniquePublicSlug(preferredSlugSource));

  if (!user.profile) {
    const handle = await uniqueProfileHandle(user.handle || user.email.split("@")[0] || slug);
    await prisma.userProfile.create({
      data: {
        userId: user.id,
        slug,
        displayName: fallbackName,
        handle,
        avatarInitials: initialsFromName(fallbackName),
        avatarColor: "#6b9fff",
        source: "stub",
      },
    });
  } else if (!user.profile.slug?.trim()) {
    await prisma.userProfile.update({
      where: { userId: user.id },
      data: { slug },
    });
  }

  const profile = user.profile
    ? { ...user.profile, slug: user.profile.slug?.trim() || slug }
    : {
        slug,
        displayName: fallbackName,
        handle: user.handle,
        avatarInitials: initialsFromName(fallbackName),
        avatarColor: "#6b9fff",
        avatarUrl: null,
        verified: false,
        bio: "",
        coverUrl: null,
      };

  const bySlug = await prisma.creatorUser.findFirst({
    where: { slug: profile.slug! },
    select: { id: true, slug: true, name: true, userId: true, verified: true },
  });
  if (bySlug) {
    if (!bySlug.userId || bySlug.userId === user.id) {
      if (!bySlug.userId) {
        await prisma.creatorUser.update({
          where: { id: bySlug.id },
          data: { userId: user.id },
        });
      }
      return { id: bySlug.id, slug: bySlug.slug, name: bySlug.name, verified: Boolean(bySlug.verified) };
    }
    const nextSlug = await uniquePublicSlug(`${profile.slug}-user`);
    profile.slug = nextSlug;
    await prisma.userProfile.update({
      where: { userId: user.id },
      data: { slug: nextSlug },
    });
  }

  const displayName =
    profile.displayName?.trim() ||
    fallbackName;
  const preferredHandle = bareHandle(profile.handle || user.handle || profile.slug || "") || profile.slug!;
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
        verified: Boolean(profile.verified),
        bio: profile.bio || null,
        coverUrl: profile.coverUrl,
        source: user.profile ? "seller-tools-auto" : "first-post-auto",
        userId: user.id,
      },
      select: { id: true, slug: true, name: true, verified: true },
    });
  } catch {
    const raced = await prisma.creatorUser.findFirst({
      where: {
        OR: [{ userId: user.id }, { slug: profile.slug! }, { handle }, { email }],
      },
      select: { id: true, slug: true, name: true, userId: true, verified: true },
    });
    if (!raced) return null;
    if (!raced.userId) {
      await prisma.creatorUser.update({
        where: { id: raced.id },
        data: { userId: user.id },
      });
    }
    return { id: raced.id, slug: raced.slug, name: raced.name, verified: Boolean(raced.verified) };
  }
}
