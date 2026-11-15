import { prisma } from "@/lib/prisma";

export const PROFILE_DIRECTORY_KINDS = ["followers", "following", "subscribers"] as const;

export type ProfileDirectoryKind = (typeof PROFILE_DIRECTORY_KINDS)[number];

export type ProfileDirectoryPerson = {
  id: string;
  name: string;
  handle: string;
  href: string | null;
  avatarInitials: string;
  avatarColor: string;
  avatarUrl: string | null;
  verified: boolean;
};

export type ProfileDirectory = {
  kind: ProfileDirectoryKind;
  name: string;
  handle: string;
  slug: string;
  people: ProfileDirectoryPerson[];
};

type Owner = {
  userId: string;
  slug: string;
  name: string;
  handle: string;
};

export function isProfileDirectoryKind(value: string): value is ProfileDirectoryKind {
  return (PROFILE_DIRECTORY_KINDS as readonly string[]).includes(value);
}

function displayHandle(handle: string | null | undefined, fallbackEmail?: string | null) {
  const trimmed = handle?.trim();
  if (trimmed) return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
  const local = fallbackEmail?.split("@")[0]?.trim();
  return local ? `@${local}` : "@user";
}

function personName(
  firstName: string | null,
  lastName: string | null,
  displayName: string | null | undefined,
  email: string,
) {
  const fromProfile = displayName?.trim();
  if (fromProfile) return fromProfile;
  const fullName = [firstName?.trim(), lastName?.trim()].filter(Boolean).join(" ");
  if (fullName) return fullName;
  return email.split("@")[0]?.trim() || "User";
}

function initials(name: string, avatarInitials: string | null | undefined) {
  const fromProfile = avatarInitials?.trim();
  if (fromProfile) return fromProfile;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  return (parts[0]?.[0] ?? "U").toUpperCase();
}

async function resolveOwner(slugOrHandle: string): Promise<Owner | null> {
  const normalized = slugOrHandle.trim().toLowerCase().replace(/^@/, "");
  if (!normalized) return null;

  const row = await prisma.userProfile.findFirst({
    where: {
      OR: [
        { slug: { equals: normalized, mode: "insensitive" } },
        { handle: { equals: normalized, mode: "insensitive" } },
        { handle: { equals: `@${normalized}`, mode: "insensitive" } },
        { user: { handle: { equals: normalized, mode: "insensitive" } } },
      ],
    },
    select: {
      userId: true,
      slug: true,
      displayName: true,
      handle: true,
    },
  });
  if (!row) return null;

  return {
    userId: row.userId,
    slug: row.slug?.trim() || normalized,
    name: row.displayName,
    handle: row.handle,
  };
}

/** Name and slug of a public profile, without loading its followers or following. */
export async function getProfileIdentity(slug: string) {
  const owner = await resolveOwner(slug);
  if (!owner) return null;
  return {
    userId: owner.userId,
    slug: owner.slug,
    name: owner.name,
    handle: owner.handle.startsWith("@") ? owner.handle : `@${owner.handle}`,
  };
}

const userSelect = {
  id: true,
  firstName: true,
  lastName: true,
  handle: true,
  email: true,
  profile: {
    select: {
      displayName: true,
      handle: true,
      slug: true,
      avatarInitials: true,
      avatarColor: true,
      avatarUrl: true,
      verified: true,
    },
  },
} as const;

function personFromUser(user: {
  id: string;
  firstName: string | null;
  lastName: string | null;
  handle: string | null;
  email: string;
  profile: {
    displayName: string | null;
    handle: string | null;
    slug: string | null;
    avatarInitials: string | null;
    avatarColor: string | null;
    avatarUrl: string | null;
    verified: boolean | null;
  } | null;
}): ProfileDirectoryPerson {
  const profile = user.profile;
  const name = personName(user.firstName, user.lastName, profile?.displayName, user.email);
  const slug = profile?.slug?.trim() || null;
  return {
    id: user.id,
    name,
    handle: displayHandle(profile?.handle ?? user.handle, user.email),
    href: slug ? `/feed/profile/${slug}` : null,
    avatarInitials: initials(name, profile?.avatarInitials),
    avatarColor: profile?.avatarColor?.trim() || "#6b9fff",
    avatarUrl: profile?.avatarUrl?.trim() || null,
    verified: Boolean(profile?.verified),
  };
}

export async function getProfileDirectory(
  slug: string,
  kind: ProfileDirectoryKind,
): Promise<ProfileDirectory | null> {
  const owner = await resolveOwner(slug);
  if (!owner) return null;

  const creator = await prisma.creatorUser.findFirst({
    where: { OR: [{ slug: owner.slug }, { userId: owner.userId }] },
    select: { id: true },
  });

  const base = {
    kind,
    name: owner.name,
    handle: owner.handle.startsWith("@") ? owner.handle : `@${owner.handle}`,
    slug: owner.slug,
    people: [] as ProfileDirectoryPerson[],
  };

  if (kind === "followers") {
    if (!creator) return base;
    const rows = await prisma.creatorFollow.findMany({
      where: { creatorId: creator.id },
      orderBy: { createdAt: "desc" },
      include: { user: { select: userSelect } },
    });
    return { ...base, people: rows.map((row) => personFromUser(row.user)) };
  }

  if (kind === "following") {
    const rows = await prisma.creatorFollow.findMany({
      where: { userId: owner.userId },
      orderBy: { createdAt: "desc" },
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
    });
    return {
      ...base,
      people: rows.map((row) => ({
        id: row.creator.id,
        name: row.creator.name,
        handle: displayHandle(row.creator.handle),
        href: row.creator.slug ? `/feed/profile/${row.creator.slug}` : null,
        avatarInitials: row.creator.avatarInitials,
        avatarColor: row.creator.avatarColor,
        avatarUrl: row.creator.avatarUrl,
        verified: row.creator.verified,
      })),
    };
  }

  if (kind === "subscribers") {
    if (!creator) return base;
    const rows = await prisma.creatorSubscription.findMany({
      where: { creatorId: creator.id, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      include: { user: { select: userSelect } },
    });
    return { ...base, people: rows.map((row) => personFromUser(row.user)) };
  }

  return base;
}
