import { notFound } from "next/navigation";
import ChildDetailView from "@/components/feed/family/ChildDetailView";
import { getChildDetailForGuardian } from "@/lib/guardian/child-detail";
import { requireFamilyCenterSession } from "@/lib/guardian/require-family-center";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId } = await params;
  const child = await getChildDetailForGuardian(childId);
  return {
    title: child ? `${child.fullName} · Family Circle · INRCLIQ` : "Family Circle · INRCLIQ",
  };
}

export default async function FamilyCenterChildDetailPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  await requireFamilyCenterSession();
  const { childId } = await params;
  const child = await getChildDetailForGuardian(childId);
  if (!child) notFound();

  return <ChildDetailView child={child} />;
}
