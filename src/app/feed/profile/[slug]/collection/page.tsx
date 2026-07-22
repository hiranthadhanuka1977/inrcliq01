import CollectionListingView from "@/components/feed/profile/CollectionListingView";
import { getCreatorCollection } from "@/lib/feed/collection";
import { getProfileData } from "@/lib/feed/profile";
import { notFound } from "next/navigation";

interface CollectionPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: CollectionPageProps) {
  const { slug } = await params;
  const [profile, collection] = await Promise.all([
    getProfileData(slug),
    getCreatorCollection(slug),
  ]);
  if (!profile || !collection) return { title: "Collection · INRCLIQ" };
  return { title: `${collection.title} · INRCLIQ` };
}

export default async function CollectionPage({ params }: CollectionPageProps) {
  const { slug } = await params;
  const [profile, collection] = await Promise.all([
    getProfileData(slug),
    getCreatorCollection(slug),
  ]);
  if (!profile || !collection) notFound();

  return <CollectionListingView profile={profile} collection={collection} />;
}
