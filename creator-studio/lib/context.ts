import { prisma } from "./prisma";
import { getStudioUser } from "./session";

export async function getStudioContext() {
  const user = await getStudioUser();
  if (!user) return { kind: "signed-out" as const };

  const [profile, creator] = await Promise.all([
    prisma.userProfile.findUnique({
      where: { userId: user.id },
      select: { verified: true, displayName: true, slug: true },
    }),
    prisma.creatorUser.findFirst({
      where: { userId: user.id },
      select: { id: true, name: true, slug: true, verified: true },
    }),
  ]);

  const verified = Boolean(profile?.verified || creator?.verified);
  if (!creator || !verified) {
    return {
      kind: "blocked" as const,
      reason: "Creator Studio is for monetized creators. Verify the account in Seller Tools, then open the studio again.",
    };
  }

  return { kind: "ok" as const, user, creator, profile };
}
