import ProfileView from "@/components/feed/profile/ProfileView";
import { getProfileData } from "@/lib/feed/profile";
import { notFound } from "next/navigation";

interface ProfilePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProfilePageProps) {
  const { slug } = await params;
  const profile = await getProfileData(slug);
  if (!profile) return { title: "Profile · INRCLIQ" };
  return { title: `${profile.name} · INRCLIQ` };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { slug } = await params;
  const profile = await getProfileData(slug);
  if (!profile) notFound();

  return <ProfileView profile={profile} />;
}
