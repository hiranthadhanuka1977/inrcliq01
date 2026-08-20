import { ensureCreatorUserForAuthUser } from "@/lib/feed/creator-user-bridge";
import { prisma } from "@/lib/prisma";
import { ensureSpecialRequestCatalogForUser } from "@/lib/seller/service-requests-store";

/**
 * Mock Verified membership activation — marks the seller as verified and
 * provisions Seller Tools catalog access. No real payment processor.
 */
export async function activateVerifiedMembership(userId: string) {
  const creator = await ensureCreatorUserForAuthUser(userId);
  if (!creator) {
    throw new Error("Unable to prepare your creator profile for membership.");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      firstName: true,
      lastName: true,
      handle: true,
      profile: { select: { displayName: true, slug: true } },
    },
  });
  if (!user) {
    throw new Error("Account not found.");
  }

  const displayName =
    user.profile?.displayName?.trim() ||
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    creator.name ||
    "Creator";

  await prisma.$transaction([
    prisma.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        slug: creator.slug,
        displayName,
        handle: user.handle?.startsWith("@")
          ? user.handle
          : `@${user.handle || creator.slug || userId.slice(-6)}`,
        avatarInitials: displayName.slice(0, 2).toUpperCase(),
        avatarColor: "#6b9fff",
        verified: true,
        source: "membership",
      },
      update: { verified: true },
    }),
    prisma.creatorUser.update({
      where: { id: creator.id },
      data: { verified: true },
    }),
  ]);

  await ensureSpecialRequestCatalogForUser(userId, { displayName });

  return {
    slug: creator.slug || user.profile?.slug || null,
    displayName,
    redirectTo: "/seller",
  };
}
