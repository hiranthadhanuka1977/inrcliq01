import { SellerProductManageView } from "@/components/seller/SellerProductManageView";
import { requireSellerCollectionIdentity } from "@/lib/seller/identity";
import { getSellerCollectionForUser } from "@/lib/seller/collection-store";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ productKey: string }>;
};

export default async function SellerProductManagePage({ params }: PageProps) {
  const identity = await requireSellerCollectionIdentity();
  if (!identity) {
    redirect("/seller");
  }

  const { productKey } = await params;
  const config = await getSellerCollectionForUser(
    identity.userId,
    identity.slug,
    identity.displayName,
  );

  if (!config.products.some((product) => product.id === productKey)) {
    notFound();
  }

  return <SellerProductManageView productKey={productKey} initialConfig={config} />;
}
