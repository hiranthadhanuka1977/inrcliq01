import { FamilyCenterAlertsPage } from "@/components/guardian/family-center/FamilyCenterPanels";
import { getFamilyCenterDashboardExtras } from "@/lib/guardian/family-center-dashboard";
import { requireFamilyCenterSession } from "@/lib/guardian/require-family-center";

export const dynamic = "force-dynamic";

export default async function FamilyCenterAlertsRoute() {
  const { data } = await requireFamilyCenterSession();
  const extras = await getFamilyCenterDashboardExtras(data);
  return <FamilyCenterAlertsPage data={data} extras={extras} />;
}
