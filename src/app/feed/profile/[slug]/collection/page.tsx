import CollectionListingView from "@/components/feed/profile/CollectionListingView";
import { CollectionUnavailablePage } from "@/components/feed/profile/CollectionUnavailable";
import ProfileUnavailableView from "@/components/feed/profile/ProfileUnavailableView";
import { getCreatorCollection, getCreatorCollectionRaw } from "@/lib/feed/collection";
import { getProfileData } from "@/lib/feed/profile";
import { notFound } from "next/navigation";

interface CollectionPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: CollectionPageProps) {
  const { slug } = await params;
  const [profile, collection] = await Promise.all([
    getProfileData(slug),
    getCreatorCollectionRaw(slug),
  ]);
  if (!profile || !collection) return { title: "Collection · INRCLIQ" };
  return { title: `${collection.title} · INRCLIQ` };
}

export default async function CollectionPage({ params }: CollectionPageProps) {
  const { slug } = await params;
  const [profile, rawCollection, collection] = await Promise.all([
    getProfileData(slug),
    getCreatorCollectionRaw(slug),
    getCreatorCollection(slug),
  ]);
  if (!profile) return <ProfileUnavailableView />;

  if (rawCollection && rawCollection.enabled === false) {
    return (
      <CollectionUnavailablePage creatorName={profile.name} profileSlug={profile.slug} />
    );
  }

  if (!collection) notFound();

  return <CollectionListingView profile={profile} collection={collection} />;
}
