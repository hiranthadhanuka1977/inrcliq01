import { ProductEditor } from "../../../../../components/manage/ProductEditor";
import { loadFailure } from "../../../../../components/load-failure";
import { mainJson } from "../../../../../lib/main";
import { getSellerProSession } from "../../../../../lib/session";
import type { CollectionPayload } from "../../../../../lib/types";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  if (!(await getSellerProSession())) return null;

  try {
    const data = await mainJson<CollectionPayload>("/api/seller/collection");
    return <ProductEditor config={data} product={null} />;
  } catch (error) {
    return loadFailure(error, "Collection");
  }
}
