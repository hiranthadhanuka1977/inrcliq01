import ProfileRequestsView from "@/components/feed/profile/ProfileRequestsView";
import { getProfileData } from "@/lib/feed/profile";
import { notFound } from "next/navigation";

interface RequestsPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: RequestsPageProps) {
  const { slug } = await params;
  const profile = await getProfileData(slug);
  if (!profile?.special_requests) return { title: "Make it personal · INRCLIQ" };
  return { title: `Make it personal · ${profile.name} · INRCLIQ` };
}

export default async function RequestsPage({ params }: RequestsPageProps) {
  const { slug } = await params;
  const profile = await getProfileData(slug);
  if (!profile?.special_requests) notFound();

  return <ProfileRequestsView profile={profile} />;
}
