import { notFound, redirect } from "next/navigation";
import { CategoryEditor } from "../../../../../components/manage/CategoryEditor";
import { loadFailure } from "../../../../../components/load-failure";
import { MainApiError, mainJson } from "../../../../../lib/main";
import { getSellerProSession } from "../../../../../lib/session";
import type { ServiceRequestsPayload } from "../../../../../lib/types";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ categoryId: string }>;
};

export default async function CategoryPage({ params }: PageProps) {
  if (!(await getSellerProSession())) return null;

  const { categoryId } = await params;
  let config: ServiceRequestsPayload;
  try {
    config = await mainJson<ServiceRequestsPayload>("/api/seller/service-requests");
  } catch (error) {
    if (error instanceof MainApiError && error.status === 404) notFound();
    return loadFailure(error, "Service requests");
  }
  const exists = config.content.categories.some((category) => category.id === categoryId);
  if (!exists) redirect("/seller-pro/service-requests");
  return <CategoryEditor config={config} categoryId={categoryId} />;
}
