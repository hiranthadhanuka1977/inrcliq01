import ProfileRequestsView from "@/components/feed/profile/ProfileRequestsView";
import ProfileUnavailableView from "@/components/feed/profile/ProfileUnavailableView";
import { SpecialRequestsUnavailablePage } from "@/components/feed/profile/SpecialRequestsUnavailable";
import { getProfileData } from "@/lib/feed/profile";
import { resolveCreatorRequestsContent } from "@/lib/seller/service-requests-store";
import { listUnavailableDateKeysBySlug } from "@/lib/seller/unavailable-dates";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface RequestsChoosePageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ category?: string; service?: string }>;
}

export async function generateMetadata({ params }: RequestsChoosePageProps) {
  const { slug } = await params;
  const profile = await getProfileData(slug);
  if (!profile?.special_requests) return { title: "Choose your experience · INRCLIQ" };
  return { title: `Choose your experience · ${profile.name} · INRCLIQ` };
}

export default async function RequestsChoosePage({
  params,
  searchParams,
}: RequestsChoosePageProps) {
  const { slug } = await params;
  const { category, service } = await searchParams;
  const profile = await getProfileData(slug);
  if (!profile) return <ProfileUnavailableView />;
  if (!profile.special_requests) notFound();

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
      variant="choose"
      initialCategoryId={category}
      initialServiceId={service}
      requestsContent={requestsContent}
      unavailableDateKeys={unavailableDateKeys}
    />
  );
}
