import ProfileRequestsView from "@/components/feed/profile/ProfileRequestsView";
import { SpecialRequestsUnavailablePage } from "@/components/feed/profile/SpecialRequestsUnavailable";
import { getProfileData } from "@/lib/feed/profile";
import { resolveCreatorRequestsContent } from "@/lib/seller/service-requests-store";
import { listUnavailableDateKeysBySlug } from "@/lib/seller/unavailable-dates";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

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

  if (profile.special_requests_enabled === false) {
    return (
      <SpecialRequestsUnavailablePage creatorName={profile.name} profileSlug={profile.slug} />
    );
  }

  const requestsContent = await resolveCreatorRequestsContent(slug);
  if (!requestsContent) {
    return (
      <SpecialRequestsUnavailablePage creatorName={profile.name} profileSlug={profile.slug} />
    );
  }

  const unavailableDateKeys = await listUnavailableDateKeysBySlug(profile.slug || slug);

  return (
    <ProfileRequestsView
      profile={profile}
      requestsContent={requestsContent}
      unavailableDateKeys={unavailableDateKeys}
    />
  );
}
