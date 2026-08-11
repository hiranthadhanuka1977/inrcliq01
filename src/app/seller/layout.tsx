import type { Metadata } from "next";
import { SellerHeader } from "@/components/seller/SellerHeader";
import { SellerNav } from "@/components/seller/SellerNav";
import { FeedSessionProvider } from "@/context/feed/FeedSessionContext";
import { getSessionUser } from "@/lib/session";
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
  const [user, identity] = await Promise.all([getSessionUser(), getSellerIdentity()]);
  const firstName = user?.firstName?.trim() || identity?.displayName?.split(" ")[0] || null;

  return (
    <FeedSessionProvider firstName={firstName}>
      <div className="seller-path-shell feed-path-shell">
        <SellerHeader />
        <div className="seller-shell">
          <SellerNav hasSpecialRequests={Boolean(identity?.hasSpecialRequests)} />
          <div className="seller-content">{children}</div>
        </div>
      </div>
    </FeedSessionProvider>
  );
}
