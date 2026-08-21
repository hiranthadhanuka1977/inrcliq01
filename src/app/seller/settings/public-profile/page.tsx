import { redirect } from "next/navigation";
import { SellerPublicProfileCustomiseView } from "@/components/seller/SellerPublicProfileCustomiseView";
import { prisma } from "@/lib/prisma";
import { getSellerIdentity } from "@/lib/seller/identity";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Personalise public profile · Seller Tools · INRCLIQ",
};

export default async function SellerPublicProfileSettingsPage() {
  const identity = await getSellerIdentity();
  if (!identity?.verified) {
    redirect("/seller");
  }

  const [profile, creator] = await Promise.all([
    prisma.userProfile.findUnique({
      where: { userId: identity.userId },
      select: { coverUrl: true },
    }),
    prisma.creatorUser.findFirst({
      where: { userId: identity.userId },
      select: { coverUrl: true },
    }),
  ]);

  const coverUrl = profile?.coverUrl?.trim() || creator?.coverUrl?.trim() || null;

  return (
    <SellerPublicProfileCustomiseView
      displayName={identity.displayName}
      slug={identity.slug}
      coverUrl={coverUrl}
    />
  );
}
