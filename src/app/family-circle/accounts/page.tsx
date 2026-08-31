import { FamilyCenterAccountsPage } from "@/components/guardian/family-center/FamilyCenterPanels";
import { requireFamilyCenterSession } from "@/lib/guardian/require-family-center";

export const dynamic = "force-dynamic";

export default async function FamilyCenterAccountsRoute() {
  const { data } = await requireFamilyCenterSession();
  return <FamilyCenterAccountsPage data={data} />;
}
