import { FamilyCenterAlertsPage } from "@/components/guardian/family-center/FamilyCenterPanels";
import { requireFamilyCenterSession } from "@/lib/guardian/require-family-center";

export const dynamic = "force-dynamic";

export default async function FamilyCenterAlertsRoute() {
  const { data } = await requireFamilyCenterSession();
  return <FamilyCenterAlertsPage data={data} />;
}
