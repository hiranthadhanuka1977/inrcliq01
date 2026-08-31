import { FamilyCenterActivityPage } from "@/components/guardian/family-center/FamilyCenterPanels";
import { requireFamilyCenterSession } from "@/lib/guardian/require-family-center";

export const dynamic = "force-dynamic";

export default async function FamilyCenterActivityRoute() {
  const { data } = await requireFamilyCenterSession();
  return <FamilyCenterActivityPage data={data} />;
}
