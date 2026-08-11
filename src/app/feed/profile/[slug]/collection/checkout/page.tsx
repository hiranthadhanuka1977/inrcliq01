import CollectionCheckoutView from "@/components/feed/profile/CollectionCheckoutView";
import { CollectionUnavailablePage } from "@/components/feed/profile/CollectionUnavailable";
import { getCreatorCollection, getCreatorCollectionRaw } from "@/lib/feed/collection";
import { getProfileData } from "@/lib/feed/profile";
import { notFound } from "next/navigation";

interface CheckoutPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: CheckoutPageProps) {
  const { slug } = await params;
  const profile = await getProfileData(slug);
  if (!profile) return { title: "Checkout · INRCLIQ" };
  return { title: `Checkout · ${profile.name} · INRCLIQ` };
}

export default async function CollectionCheckoutPage({ params }: CheckoutPageProps) {
  const { slug } = await params;
  const [profile, rawCollection, collection] = await Promise.all([
    getProfileData(slug),
    getCreatorCollectionRaw(slug),
    getCreatorCollection(slug),
  ]);
  if (!profile) notFound();

  if (rawCollection && rawCollection.enabled === false) {
    return (
      <CollectionUnavailablePage creatorName={profile.name} profileSlug={profile.slug} />
    );
  }

  if (!collection) notFound();

  return <CollectionCheckoutView profile={profile} />;
}
