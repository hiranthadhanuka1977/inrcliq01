import CollectionProductDetailView from "@/components/feed/profile/CollectionProductDetailView";
import { CollectionUnavailablePage } from "@/components/feed/profile/CollectionUnavailable";
import { getCollectionProduct, getCreatorCollectionRaw } from "@/lib/feed/collection";
import { getProfileData } from "@/lib/feed/profile";
import { notFound } from "next/navigation";

interface ProductDetailPageProps {
  params: Promise<{ slug: string; productId: string }>;
}

export async function generateMetadata({ params }: ProductDetailPageProps) {
  const { slug, productId } = await params;
  const result = await getCollectionProduct(slug, productId);
  if (!result) return { title: "Product · INRCLIQ" };
  return { title: `${result.product.name} · INRCLIQ` };
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { slug, productId } = await params;
  const [profile, rawCollection, result] = await Promise.all([
    getProfileData(slug),
    getCreatorCollectionRaw(slug),
    getCollectionProduct(slug, productId),
  ]);
  if (!profile) notFound();

  if (rawCollection && rawCollection.enabled === false) {
    return (
      <CollectionUnavailablePage creatorName={profile.name} profileSlug={profile.slug} />
    );
  }

  if (!result) notFound();

  return <CollectionProductDetailView profile={profile} product={result.product} />;
}
