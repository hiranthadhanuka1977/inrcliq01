import { redirect } from "next/navigation";
import { SellerSubscriptionsView } from "@/components/seller/SellerSubscriptionsView";
import { getSellerIdentity } from "@/lib/seller/identity";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Subscriptions · Seller Tools · INRCLIQ",
};

export default async function SellerSubscriptionsPage() {
  const identity = await getSellerIdentity();
  if (!identity?.verified) {
    redirect("/seller");
  }

  return <SellerSubscriptionsView displayName={identity.displayName} />;
}
