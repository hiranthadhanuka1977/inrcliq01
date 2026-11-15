import { notFound } from "next/navigation";
import { ProductEditor } from "../../../../../components/manage/ProductEditor";
import { loadFailure } from "../../../../../components/load-failure";
import { mainJson } from "../../../../../lib/main";
import { getSellerProSession } from "../../../../../lib/session";
import type { CollectionPayload } from "../../../../../lib/types";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ productKey: string }>;
};

export default async function ProductPage({ params }: PageProps) {
  if (!(await getSellerProSession())) return null;

  const { productKey } = await params;
  let data: CollectionPayload;
  try {
    data = await mainJson<CollectionPayload>("/api/seller/collection");
  } catch (error) {
    return loadFailure(error, "Collection");
  }
  const product = data.products.find((item) => item.id === productKey);
  if (!product) notFound();
  return <ProductEditor config={data} product={product} />;
}
