import { notFound } from "next/navigation";
import { NewCategoryForm } from "../../../../../components/manage/NewCategoryForm";
import { loadFailure } from "../../../../../components/load-failure";
import { MainApiError, mainJson } from "../../../../../lib/main";
import { getSellerProSession } from "../../../../../lib/session";
import type { ServiceRequestsPayload } from "../../../../../lib/types";

export const dynamic = "force-dynamic";

export default async function NewCategoryPage() {
  if (!(await getSellerProSession())) return null;

  let config: ServiceRequestsPayload;
  try {
    config = await mainJson<ServiceRequestsPayload>("/api/seller/service-requests");
  } catch (error) {
    if (error instanceof MainApiError && error.status === 404) notFound();
    return loadFailure(error, "Service requests");
  }
  return <NewCategoryForm config={config} />;
}
