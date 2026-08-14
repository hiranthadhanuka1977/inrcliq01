import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { SPECIAL_REQUESTS_OWNER_SLUG } from "@/lib/seller/constants";
import { ensureSpecialRequestCatalogForUser } from "@/lib/seller/service-requests-store";

export type SellerIdentity = {
  userId: string;
  slug: string;
  displayName: string;
  hasSpecialRequests: boolean;
  catalogId: string | null;
  verified: boolean;
};

/**
 * Resolve the logged-in seller's profile + Special Requests ownership.
 * Verified creators are auto-provisioned a blank catalog so Seller Tools
 * shows Service requests even before they configure offerings.
 */
export async function getSellerIdentity(): Promise<SellerIdentity | null> {
  const user = await getSessionUser();
  if (!user) return null;

  const [profile, creator, catalog] = await Promise.all([
    prisma.userProfile.findUnique({
      where: { userId: user.id },
      select: { slug: true, displayName: true, specialRequests: true, verified: true },
    }),
    prisma.creatorUser.findFirst({
      where: { userId: user.id },
      select: { slug: true, name: true, verified: true },
    }),
    prisma.specialRequestCatalog.findUnique({
      where: { userId: user.id },
      select: { id: true, enabled: true },
    }),
  ]);

  const slug = profile?.slug || creator?.slug || null;
  if (!slug) return null;

  const displayName = profile?.displayName || creator?.name || user.firstName || "Creator";
  const verified = Boolean(profile?.verified) || Boolean(creator?.verified);

  let catalogId = catalog?.id ?? null;
  let hasSpecialRequests = Boolean(catalog);

  if (!hasSpecialRequests && verified) {
    await ensureSpecialRequestCatalogForUser(user.id, { displayName });
    const refreshed = await prisma.specialRequestCatalog.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    catalogId = refreshed?.id ?? null;
    hasSpecialRequests = Boolean(catalogId);
  }

  return {
    userId: user.id,
    slug,
    displayName,
    hasSpecialRequests,
    catalogId,
    verified,
  };
}

export async function requireSellerSpecialRequestsIdentity(): Promise<SellerIdentity | null> {
  const identity = await getSellerIdentity();
  if (!identity?.verified || !identity.hasSpecialRequests) return null;
  return identity;
}

/** Verified creators with a linked profile/creator can manage Collection. */
export async function requireSellerCollectionIdentity(): Promise<SellerIdentity | null> {
  const identity = await getSellerIdentity();
  if (!identity?.verified) return null;
  return identity;
}

export function isSpecialRequestsOwnerSlug(slug: string) {
  return slug === SPECIAL_REQUESTS_OWNER_SLUG;
}
