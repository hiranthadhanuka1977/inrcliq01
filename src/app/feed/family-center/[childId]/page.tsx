import { notFound, redirect } from "next/navigation";
import ChildDetailView from "@/components/feed/family/ChildDetailView";
import { getChildDetailForGuardian } from "@/lib/guardian/child-detail";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId } = await params;
  const child = await getChildDetailForGuardian(childId);
  return {
    title: child ? `${child.fullName} · Family Center · INRCLIQ` : "Family Center · INRCLIQ",
  };
}

export default async function ChildDetailPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/");

  const { childId } = await params;
  const child = await getChildDetailForGuardian(childId);
  if (!child) notFound();

  return (
    <ChildDetailView
      child={child}
      firstName={user.firstName?.trim() || null}
    />
  );
}
