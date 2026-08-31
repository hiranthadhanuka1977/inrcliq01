import { FamilyCenterOverview } from "@/components/guardian/family-center/FamilyCenterPanels";
import { requireFamilyCenterSession } from "@/lib/guardian/require-family-center";

export const dynamic = "force-dynamic";

export default async function FamilyCenterOverviewPage() {
  const { data } = await requireFamilyCenterSession();
  return <FamilyCenterOverview data={data} />;
}
