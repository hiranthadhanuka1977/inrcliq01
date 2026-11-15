import ProfileDirectoryView from "@/components/feed/profile/ProfileDirectoryView";
import ProfileUnavailableView from "@/components/feed/profile/ProfileUnavailableView";
import { getProfileDirectory, isProfileDirectoryKind } from "@/lib/feed/profile-directory";
import { notFound } from "next/navigation";

interface ProfileDirectoryPageProps {
  params: Promise<{ slug: string; directory: string }>;
}

const TITLES: Record<string, string> = {
  followers: "Followers",
  following: "Following",
  subscribers: "Subscribers",
};

export async function generateMetadata({ params }: ProfileDirectoryPageProps) {
  const { slug, directory } = await params;
  if (!isProfileDirectoryKind(directory)) return { title: "Profile · INRCLIQ" };
  const data = await getProfileDirectory(slug, directory);
  const label = TITLES[directory];
  if (!data) return { title: `${label} · INRCLIQ` };
  return { title: `${data.name} · ${label} · INRCLIQ` };
}

export default async function ProfileDirectoryPage({ params }: ProfileDirectoryPageProps) {
  const { slug, directory } = await params;
  if (!isProfileDirectoryKind(directory)) notFound();

  const data = await getProfileDirectory(slug, directory);
  if (!data) return <ProfileUnavailableView />;

  return <ProfileDirectoryView directory={data} />;
}
