import { redirect } from "next/navigation";
import LeftNav from "@/components/feed/LeftNav";
import MobileNav from "@/components/feed/MobileNav";
import AccountProfileView from "@/components/feed/account/AccountProfileView";
import {
  getAccountProfile,
  type AccountSocialTab,
} from "@/lib/feed/account-profile";

export const metadata = {
  title: "Your profile · INRCLIQ",
};

function parseTab(value: string | string[] | undefined): AccountSocialTab {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "followers" || raw === "following" || raw === "subscriptions") {
    return raw;
  }
  return "subscriptions";
}

export default async function AccountProfilePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await getAccountProfile();
  if (!profile) redirect("/");

  const params = searchParams ? await searchParams : {};
  const initialTab = parseTab(params.tab);

  return (
    <div className="app-shell">
      <LeftNav firstName={profile.firstName} />
      <AccountProfileView profile={profile} initialTab={initialTab} />
      <MobileNav />
    </div>
  );
}
