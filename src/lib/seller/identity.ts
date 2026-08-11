import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { SPECIAL_REQUESTS_OWNER_SLUG } from "@/lib/seller/constants";

export type SellerIdentity = {
  userId: string;
  slug: string;
  displayName: string;
  hasSpecialRequests: boolean;
  catalogId: string | null;
};

/**
 * Resolve the logged-in seller's profile + Special Requests ownership.
 * Service requests are available only when a SpecialRequestCatalog row exists for the user.
 */
export async function getSellerIdentity(): Promise<SellerIdentity | null> {
  const user = await getSessionUser();
  if (!user) return null;

  const [profile, creator, catalog] = await Promise.all([
    prisma.userProfile.findUnique({
      where: { userId: user.id },
      select: { slug: true, displayName: true, specialRequests: true },
    }),
    prisma.creatorUser.findFirst({
      where: { userId: user.id },
      select: { slug: true, name: true },
    }),
    prisma.specialRequestCatalog.findUnique({
      where: { userId: user.id },
      select: { id: true, enabled: true },
    }),
  ]);

  const slug = profile?.slug || creator?.slug || null;
  if (!slug) return null;

  return {
    userId: user.id,
    slug,
    displayName: profile?.displayName || creator?.name || user.firstName || "Creator",
    hasSpecialRequests: Boolean(catalog),
    catalogId: catalog?.id ?? null,
  };
}

export async function requireSellerSpecialRequestsIdentity(): Promise<SellerIdentity | null> {
  const identity = await getSellerIdentity();
  if (!identity?.hasSpecialRequests) return null;
  return identity;
}

/** Any seller with a linked profile/creator can manage Collection. */
export async function requireSellerCollectionIdentity(): Promise<SellerIdentity | null> {
  return getSellerIdentity();
}

export function isSpecialRequestsOwnerSlug(slug: string) {
  return slug === SPECIAL_REQUESTS_OWNER_SLUG;
}
