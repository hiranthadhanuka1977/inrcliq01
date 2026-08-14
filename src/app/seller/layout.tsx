import type { Metadata } from "next";
import { SellerHeader } from "@/components/seller/SellerHeader";
import { SellerNav } from "@/components/seller/SellerNav";
import { FeedSessionProvider } from "@/context/feed/FeedSessionContext";
import { getSessionNavProfile } from "@/lib/feed/session-nav-profile";
import { getSellerIdentity } from "@/lib/seller/identity";

export const metadata: Metadata = {
  title: "INRCLIQ · Seller Tools",
  description: "Manage your collection and service request setup",
};

export default async function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [navProfile, identity] = await Promise.all([
    getSessionNavProfile(),
    getSellerIdentity(),
  ]);
  const firstName =
    navProfile.firstName || identity?.displayName?.split(" ")[0] || null;
  const verified = Boolean(identity?.verified);

  return (
    <FeedSessionProvider
      firstName={firstName}
      avatarUrl={navProfile.avatarUrl}
      avatarColor={navProfile.avatarColor}
    >
      <div className="seller-path-shell feed-path-shell">
        <SellerHeader />
        <div className={`seller-shell${verified ? "" : " seller-shell--marketing"}`}>
          {verified ? (
            <SellerNav hasSpecialRequests={Boolean(identity?.hasSpecialRequests)} />
          ) : null}
          <div className="seller-content">{children}</div>
        </div>
      </div>
    </FeedSessionProvider>
  );
}
