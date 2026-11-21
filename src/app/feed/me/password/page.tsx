import { redirect } from "next/navigation";
import LeftNav from "@/components/feed/LeftNav";
import MobileNav from "@/components/feed/MobileNav";
import SetPasswordView from "@/components/feed/account/SetPasswordView";
import { getAccountProfile } from "@/lib/feed/account-profile";

export const metadata = {
  title: "Set a password · INRCLIQ",
};

export default async function SetPasswordPage() {
  const profile = await getAccountProfile();
  if (!profile) redirect("/");

  return (
    <div className="app-shell">
      <LeftNav firstName={profile.firstName} />
      <SetPasswordView hasPassword={profile.hasPassword} />
      <MobileNav />
    </div>
  );
}
