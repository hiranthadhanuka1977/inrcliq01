import RequestCheckoutView from "@/components/feed/profile/RequestCheckoutView";
import { SpecialRequestsUnavailablePage } from "@/components/feed/profile/SpecialRequestsUnavailable";
import { getProfileData } from "@/lib/feed/profile";
import { notFound } from "next/navigation";

interface RequestsCheckoutPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function readParam(
  value: string | string[] | undefined,
  fallback = "",
) {
  if (Array.isArray(value)) return value[0] ?? fallback;
  return value ?? fallback;
}

function readNumber(
  value: string | string[] | undefined,
  fallback = 0,
) {
  const parsed = Number(readParam(value, String(fallback)));
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function generateMetadata({ params }: RequestsCheckoutPageProps) {
  const { slug } = await params;
  const profile = await getProfileData(slug);
  if (!profile?.special_requests) return { title: "Checkout · INRCLIQ" };
  return { title: `Checkout · ${profile.name} · INRCLIQ` };
}

export default async function RequestsCheckoutPage({
  params,
  searchParams,
}: RequestsCheckoutPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const profile = await getProfileData(slug);
  if (!profile?.special_requests) notFound();

  if (profile.special_requests_enabled === false) {
    return (
      <SpecialRequestsUnavailablePage creatorName={profile.name} profileSlug={profile.slug} />
    );
  }

  const data = {
    request: readParam(query.request, ""),
    category: readParam(query.category, ""),
    delivery: readParam(query.delivery, ""),
    content: readParam(query.content, ""),
    recipient: readParam(query.recipient, ""),
    when: readParam(query.when, ""),
    dayRate: readNumber(query.dayRate, 0),
    feedFee: readNumber(query.feedFee, 0),
    totalFee: readNumber(query.totalFee, 0),
    isAppearance: readParam(query.isAppearance, "0") === "1",
    occasion: readParam(query.occasion, ""),
    location: readParam(query.location, ""),
    duration: readParam(query.duration, ""),
    expectation: readParam(query.expectation, ""),
    reference: readParam(query.reference, ""),
    message: readParam(query.message, ""),
    username: readParam(query.username, ""),
    instructions: readParam(query.instructions, ""),
  };

  return <RequestCheckoutView profile={profile} data={data} />;
}
