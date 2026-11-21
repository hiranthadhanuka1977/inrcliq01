import { redirect } from "next/navigation";
import LeftNav from "@/components/feed/LeftNav";
import MobileNav from "@/components/feed/MobileNav";
import ProfileCompletionView from "@/components/feed/account/ProfileCompletionView";
import { getAccountProfile } from "@/lib/feed/account-profile";

export const metadata = {
  title: "Profile completion · INRCLIQ",
};

export default async function ProfileCompletionPage() {
  const profile = await getAccountProfile();
  if (!profile) redirect("/");

  return (
    <div className="app-shell">
      <LeftNav firstName={profile.firstName} />
      <ProfileCompletionView
        completion={{
          hasPassword: profile.hasPassword,
          handle: profile.handle,
          postCount: profile.postCount,
          avatarUrl: profile.avatarUrl,
          identityVerified: profile.identityVerified,
          accountType: profile.accountType,
        }}
        firstName={profile.firstName}
        verified={profile.verified}
      />
      <MobileNav />
    </div>
  );
}
