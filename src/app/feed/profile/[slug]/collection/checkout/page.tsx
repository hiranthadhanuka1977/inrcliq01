import CollectionCheckoutView from "@/components/feed/profile/CollectionCheckoutView";
import { getCreatorCollection } from "@/lib/feed/collection";
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
  const [profile, collection] = await Promise.all([
    getProfileData(slug),
    getCreatorCollection(slug),
  ]);
  if (!profile || !collection) notFound();

  return <CollectionCheckoutView profile={profile} />;
}
