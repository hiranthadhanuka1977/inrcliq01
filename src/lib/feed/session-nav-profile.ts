import { AccountType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { resolveUserDisplayName, resolveUserFirstName } from "@/lib/auth/display-name";
import { ensureGuardianUserNames } from "@/lib/auth/guardian-user-names";
import { resolveAuthorProfileSlug } from "@/lib/feed/profile-slugs";

export type SessionNavProfile = {
  firstName: string | null;
  avatarUrl: string | null;
  avatarColor: string | null;
  verified: boolean;
  isGuardian: boolean;
  profileHref: string | null;
};

function resolveSessionProfileHref(
  slug: string | null | undefined,
  handle: string | null | undefined,
): string | null {
  const trimmedSlug = slug?.trim();
  if (trimmedSlug) return `/feed/profile/${trimmedSlug}`;

  const trimmedHandle = handle?.trim();
  if (!trimmedHandle) return null;

  return `/feed/profile/${resolveAuthorProfileSlug(trimmedHandle)}`;
}

/**
 * Lightweight profile bits for feed chrome (left nav avatar/name).
 */
export async function getSessionNavProfile(): Promise<SessionNavProfile> {
  const user = await getSessionUser();
  if (!user) {
    return {
      firstName: null,
      avatarUrl: null,
      avatarColor: null,
      verified: false,
      isGuardian: false,
      profileHref: null,
    };
  }

  await ensureGuardianUserNames(user.id, user.email);

  const refreshedUser = user.firstName?.trim()
    ? user
    : await prisma.user.findUniqueOrThrow({ where: { id: user.id } });

  const [profile, creator] = await Promise.all([
    prisma.userProfile.findUnique({
      where: { userId: user.id },
      select: {
        slug: true,
        handle: true,
        displayName: true,
        avatarUrl: true,
        avatarColor: true,
        verified: true,
      },
    }),
    prisma.creatorUser.findFirst({
      where: { userId: user.id },
      select: {
        slug: true,
        handle: true,
        name: true,
        avatarUrl: true,
        avatarColor: true,
        verified: true,
      },
    }),
  ]);

  const displayName = resolveUserDisplayName({
    email: refreshedUser.email,
    firstName: refreshedUser.firstName,
    lastName: refreshedUser.lastName,
    displayName: profile?.displayName?.trim() || creator?.name?.trim() || null,
  });
  const firstName = resolveUserFirstName({
    email: refreshedUser.email,
    firstName: refreshedUser.firstName,
    lastName: refreshedUser.lastName,
    displayName,
  });

  return {
    firstName,
    avatarUrl: profile?.avatarUrl?.trim() || creator?.avatarUrl?.trim() || null,
    avatarColor: profile?.avatarColor?.trim() || creator?.avatarColor?.trim() || null,
    verified: Boolean(profile?.verified || creator?.verified),
    isGuardian: refreshedUser.accountType === AccountType.GUARDIAN,
    profileHref: resolveSessionProfileHref(
      profile?.slug ?? creator?.slug,
      refreshedUser.handle ?? profile?.handle ?? creator?.handle,
    ),
  };
}
