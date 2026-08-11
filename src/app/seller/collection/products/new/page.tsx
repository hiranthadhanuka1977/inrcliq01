import { SellerProductCreateView } from "@/components/seller/SellerProductCreateView";
import { requireSellerCollectionIdentity } from "@/lib/seller/identity";
import { getSellerCollectionForUser } from "@/lib/seller/collection-store";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SellerProductCreatePage() {
  const identity = await requireSellerCollectionIdentity();
  if (!identity) {
    redirect("/");
  }

  const config = await getSellerCollectionForUser(
    identity.userId,
    identity.slug,
    identity.displayName,
  );

  return <SellerProductCreateView initialConfig={config} />;
}
