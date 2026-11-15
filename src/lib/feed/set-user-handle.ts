import { randomBytes } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { parseHandle } from "@/lib/validation";

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^@/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export async function uniquePublicSlug(preferred: string, excludeUserId: string) {
  let slug = slugify(preferred) || `user-${randomBytes(3).toString("hex")}`;
  const base = slug;
  let suffix = 0;

  while (true) {
    const [profileConflict, creatorConflict] = await Promise.all([
      prisma.userProfile.findFirst({
        where: {
          slug,
          NOT: { userId: excludeUserId },
        },
        select: { id: true },
      }),
      prisma.creatorUser.findFirst({ where: { slug }, select: { id: true } }),
    ]);
    if (!profileConflict && !creatorConflict) break;
    suffix += 1;
    slug = `${base.slice(0, 56)}-${suffix}`;
  }

  return slug;
}

export function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || "U";
}

export async function setUserHandle(userId: string, rawHandle: string) {
  const parsed = parseHandle(rawHandle);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid handle.",
    };
  }

  const handle = parsed.data;
  const profileHandle = `@${handle}`;
  const handleTaken = { equals: handle, mode: "insensitive" as const };
  const atHandleTaken = { equals: profileHandle, mode: "insensitive" as const };
  const [userConflict, profileConflict, creatorConflict] = await Promise.all([
    prisma.user.findFirst({
      where: { handle: handleTaken, NOT: { id: userId } },
      select: { id: true },
    }),
    prisma.userProfile.findFirst({
      where: {
        OR: [{ handle: handleTaken }, { handle: atHandleTaken }],
        NOT: { userId },
      },
      select: { id: true },
    }),
    prisma.creatorUser.findFirst({
      where: {
        OR: [{ handle: handleTaken }, { handle: atHandleTaken }],
        NOT: { userId },
      },
      select: { id: true },
    }),
  ]);

  if (userConflict || profileConflict || creatorConflict) {
    return { ok: false as const, error: "This handle is already taken." };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      profile: {
        select: {
          id: true,
          slug: true,
          displayName: true,
          avatarInitials: true,
          avatarColor: true,
          avatarUrl: true,
        },
      },
    },
  });

  if (!user) {
    return { ok: false as const, error: "User not found." };
  }

  const displayName =
    user.profile?.displayName?.trim() ||
    [user.firstName?.trim(), user.lastName?.trim()].filter(Boolean).join(" ") ||
    user.email.split("@")[0] ||
    "Member";
  const slug =
    user.profile?.slug?.trim() || (await uniquePublicSlug(handle, userId));

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { handle },
      });

      if (user.profile) {
        await tx.userProfile.update({
          where: { userId },
          data: {
            handle: profileHandle,
            slug: user.profile.slug?.trim() ? undefined : slug,
          },
        });
      } else {
        await tx.userProfile.create({
          data: {
            userId,
            slug,
            displayName,
            handle: profileHandle,
            avatarInitials: initialsFromName(displayName),
            avatarColor: "#6b9fff",
            source: "handle-setup",
          },
        });
      }

      await tx.creatorUser.updateMany({
        where: { userId },
        data: { handle: profileHandle },
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false as const, error: "This handle is already taken." };
    }
    throw error;
  }

  return {
    ok: true as const,
    handle,
    profileHref: `/feed/profile/${slug}`,
  };
}
