import { redirect } from "next/navigation";
import AccountSettingsView from "@/components/feed/account/AccountSettingsView";
import LeftNav from "@/components/feed/LeftNav";
import MobileNav from "@/components/feed/MobileNav";
import { getAccountProfile } from "@/lib/feed/account-profile";

export const metadata = {
  title: "Settings · INRCLIQ",
};

export default async function AccountSettingsPage() {
  const profile = await getAccountProfile();
  if (!profile) redirect("/");

  return (
    <div className="app-shell">
      <LeftNav firstName={profile.firstName} />
      <AccountSettingsView email={profile.email} />
      <MobileNav />
    </div>
  );
}
