import { SellerCategoryManageView } from "@/components/seller/SellerCategoryManageView";
import { requireSellerSpecialRequestsIdentity } from "@/lib/seller/identity";
import { getSellerServiceRequestsConfigForUser } from "@/lib/seller/service-requests-store";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ categoryId: string }>;
};

export default async function SellerCategoryManagePage({ params }: PageProps) {
  const { categoryId } = await params;
  const identity = await requireSellerSpecialRequestsIdentity();
  if (!identity) {
    redirect("/seller");
  }

  const config = await getSellerServiceRequestsConfigForUser(identity.userId);
  if (!config) notFound();

  const exists = config.content.categories.some((category) => category.id === categoryId);
  if (!exists) {
    redirect("/seller/service-requests?tab=offerings");
  }

  return (
    <SellerCategoryManageView
      categoryId={categoryId}
      initialConfig={config}
    />
  );
}
