import { redirect } from "next/navigation";

export default async function LegacyChildDetailPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId } = await params;
  redirect(`/family-circle/accounts/${childId}`);
}
