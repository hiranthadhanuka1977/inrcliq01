import { SellerCategoryCreateView } from "@/components/seller/SellerCategoryCreateView";
import { requireSellerSpecialRequestsIdentity } from "@/lib/seller/identity";
import { getSellerServiceRequestsConfigForUser } from "@/lib/seller/service-requests-store";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SellerCategoryCreatePage() {
  const identity = await requireSellerSpecialRequestsIdentity();
  if (!identity) {
    redirect("/seller");
  }

  const config = await getSellerServiceRequestsConfigForUser(identity.userId);
  if (!config) notFound();

  return <SellerCategoryCreateView initialConfig={config} />;
}
