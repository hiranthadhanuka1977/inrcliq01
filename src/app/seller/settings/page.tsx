import { redirect } from "next/navigation";
import { SellerSettingsView } from "@/components/seller/SellerSettingsView";
import { getSellerIdentity } from "@/lib/seller/identity";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Settings · Seller Tools · INRCLIQ",
};

export default async function SellerSettingsPage() {
  const identity = await getSellerIdentity();
  if (!identity?.verified) {
    redirect("/seller");
  }

  return (
    <SellerSettingsView
      displayName={identity.displayName}
      hasSpecialRequests={Boolean(identity.hasSpecialRequests)}
    />
  );
}
