import { notFound } from "next/navigation";
import DmContactDetailView from "@/components/feed/family/DmContactDetailView";
import { getChildDmContactDetailForGuardian } from "@/lib/guardian/child-detail";
import { requireFamilyCenterSession } from "@/lib/guardian/require-family-center";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ childId: string; threadId: string }>;
}) {
  const { childId, threadId } = await params;
  const detail = await getChildDmContactDetailForGuardian(childId, threadId);
  return {
    title: detail
      ? `${detail.contact.name} · ${detail.child.fullName} · Family Circle · INRCLIQ`
      : "Family Circle · INRCLIQ",
  };
}

export default async function DmContactDetailPage({
  params,
}: {
  params: Promise<{ childId: string; threadId: string }>;
}) {
  await requireFamilyCenterSession();
  const { childId, threadId } = await params;
  const detail = await getChildDmContactDetailForGuardian(childId, threadId);
  if (!detail) notFound();

  return <DmContactDetailView data={detail} />;
}
