import ProfileShareView from "@/components/feed/profile/ProfileShareView";
import ProfileUnavailableView from "@/components/feed/profile/ProfileUnavailableView";
import { getProfileIdentity } from "@/lib/feed/profile-directory";
import { listViewerShareRecipients, type ShareRecipient } from "@/lib/feed/share-profile";
import { getSessionUser } from "@/lib/session";

interface ProfileSharePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProfileSharePageProps) {
  const { slug } = await params;
  const profile = await getProfileIdentity(slug);
  if (!profile) return { title: "Share profile · INRCLIQ" };
  return { title: `Share ${profile.name} · INRCLIQ` };
}

export default async function ProfileSharePage({ params }: ProfileSharePageProps) {
  const { slug } = await params;
  const profile = await getProfileIdentity(slug);
  if (!profile) return <ProfileUnavailableView />;

  const user = await getSessionUser();
  let people: ShareRecipient[] = [];
  let loadError: string | null = null;
  if (user) {
    try {
      people = await listViewerShareRecipients(user.id);
    } catch (err) {
      console.error("Profile share network error", err);
      loadError = "Could not load your network.";
    }
  }

  return (
    <ProfileShareView
      slug={profile.slug}
      name={profile.name}
      handle={profile.handle}
      people={people}
      signedIn={Boolean(user)}
      loadError={loadError}
    />
  );
}
