import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export type SessionNavProfile = {
  firstName: string | null;
  avatarUrl: string | null;
  avatarColor: string | null;
};

/**
 * Lightweight profile bits for feed chrome (left nav avatar/name).
 */
export async function getSessionNavProfile(): Promise<SessionNavProfile> {
  const user = await getSessionUser();
  if (!user) {
    return { firstName: null, avatarUrl: null, avatarColor: null };
  }

  const [profile, creator] = await Promise.all([
    prisma.userProfile.findUnique({
      where: { userId: user.id },
      select: {
        displayName: true,
        avatarUrl: true,
        avatarColor: true,
      },
    }),
    prisma.creatorUser.findFirst({
      where: { userId: user.id },
      select: {
        name: true,
        avatarUrl: true,
        avatarColor: true,
      },
    }),
  ]);

  const displayName =
    profile?.displayName?.trim() ||
    creator?.name?.trim() ||
    user.firstName?.trim() ||
    null;
  const firstName = displayName?.split(/\s+/)[0] || user.firstName?.trim() || null;

  return {
    firstName,
    avatarUrl: profile?.avatarUrl?.trim() || creator?.avatarUrl?.trim() || null,
    avatarColor: profile?.avatarColor?.trim() || creator?.avatarColor?.trim() || null,
  };
}
