import { FamilyCenterActivityPage } from "@/components/guardian/family-center/FamilyCenterPanels";
import { requireFamilyCenterSession } from "@/lib/guardian/require-family-center";

export const dynamic = "force-dynamic";

export default async function FamilyCenterActivityRoute({
  searchParams,
}: {
  searchParams: Promise<{ child?: string }>;
}) {
  const { data } = await requireFamilyCenterSession();
  const { child: childId } = await searchParams;

  return <FamilyCenterActivityPage data={data} childId={childId?.trim() || undefined} />;
}
