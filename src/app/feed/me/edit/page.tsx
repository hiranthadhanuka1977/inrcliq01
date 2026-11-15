import { redirect } from "next/navigation";
import LeftNav from "@/components/feed/LeftNav";
import MobileNav from "@/components/feed/MobileNav";
import AccountProfileInfoView from "@/components/feed/account/AccountProfileInfoView";
import { getAccountProfile } from "@/lib/feed/account-profile";

export const metadata = {
  title: "Profile information · INRCLIQ",
};

export default async function AccountProfileInfoPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const profile = await getAccountProfile();
  if (!profile) redirect("/");
  const { email } = await searchParams;

  return (
    <div className="app-shell">
      <LeftNav firstName={profile.firstName} />
      <AccountProfileInfoView profile={profile} emailUpdated={email === "updated"} />
      <MobileNav />
    </div>
  );
}
