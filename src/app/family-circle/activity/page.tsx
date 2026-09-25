import { FamilyCenterActivityPage } from "@/components/guardian/family-center/FamilyCenterPanels";
import { buildFamilyActivityHistory } from "@/lib/guardian/family-center-static";
import { requireFamilyCenterSession } from "@/lib/guardian/require-family-center";
import { listSafetyActivityItemsForGuardian } from "@/lib/guardian/safety-alerts";

export const dynamic = "force-dynamic";

export default async function FamilyCenterActivityRoute({
  searchParams,
}: {
  searchParams: Promise<{ child?: string }>;
}) {
  const { data } = await requireFamilyCenterSession();
  const { child: childId } = await searchParams;
  const safetyItems = await listSafetyActivityItemsForGuardian(data.guardian.id);
  const activityItems = buildFamilyActivityHistory(data.children, safetyItems);

  return (
    <FamilyCenterActivityPage
      data={data}
      childId={childId?.trim() || undefined}
      activityItems={activityItems}
    />
  );
}
