import { FamilyCenterRequestsPage } from "@/components/guardian/family-center/FamilyCenterPanels";
import { requireFamilyCenterSession } from "@/lib/guardian/require-family-center";

export const dynamic = "force-dynamic";

export default async function FamilyCenterRequestsRoute() {
  const { data } = await requireFamilyCenterSession();
  return <FamilyCenterRequestsPage data={data} />;
}
