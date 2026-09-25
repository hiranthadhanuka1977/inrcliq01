import { FamilyCenterOverview } from "@/components/guardian/family-center/FamilyCenterPanels";
import { getFamilyCenterDashboardExtras } from "@/lib/guardian/family-center-dashboard";
import { requireFamilyCenterSession } from "@/lib/guardian/require-family-center";

export const dynamic = "force-dynamic";

export default async function FamilyCenterOverviewPage() {
  const { data } = await requireFamilyCenterSession();
  const extras = await getFamilyCenterDashboardExtras(data);
  return <FamilyCenterOverview data={data} extras={extras} />;
}
