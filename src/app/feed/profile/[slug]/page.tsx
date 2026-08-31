import ProfileView from "@/components/feed/profile/ProfileView";
import ProfileUnavailableView from "@/components/feed/profile/ProfileUnavailableView";
import { getProfileData } from "@/lib/feed/profile";

interface ProfilePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProfilePageProps) {
  const { slug } = await params;
  const profile = await getProfileData(slug);
  if (!profile) return { title: "Profile unavailable · INRCLIQ" };
  return { title: `${profile.name} · INRCLIQ` };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { slug } = await params;
  const profile = await getProfileData(slug);
  if (!profile) return <ProfileUnavailableView />;

  return <ProfileView profile={profile} />;
}
