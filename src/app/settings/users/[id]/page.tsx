import { notFound } from "next/navigation";
import { UserDetail } from "@/components/settings/UserDetail";
import { getSettingsUserDetail } from "@/lib/settings/user-detail";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function SettingsUserDetailPage({ params }: PageProps) {
  const user = await getSettingsUserDetail((await params).id);
  if (!user) notFound();

  return <UserDetail user={user} />;
}
