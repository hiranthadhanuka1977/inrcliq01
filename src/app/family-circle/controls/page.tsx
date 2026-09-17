import { FamilyCenterControlsPage } from "@/components/guardian/family-center/FamilyCenterPanels";
import { requireFamilyCenterSession } from "@/lib/guardian/require-family-center";

export const dynamic = "force-dynamic";

export default async function FamilyCenterControlsRoute() {
  const { data } = await requireFamilyCenterSession();
  return <FamilyCenterControlsPage data={data} />;
}
