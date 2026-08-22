import { redirect } from "next/navigation";
import { SellerWalletView } from "@/components/seller/SellerWalletView";
import { getSellerIdentity } from "@/lib/seller/identity";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My Money (Wallet) · Seller Tools · INRCLIQ",
};

export default async function SellerWalletPage() {
  const identity = await getSellerIdentity();
  if (!identity?.verified) {
    redirect("/seller");
  }

  return <SellerWalletView displayName={identity.displayName} />;
}
