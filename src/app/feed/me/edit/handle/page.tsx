import { redirect } from "next/navigation";
import ChangeHandleView from "@/components/feed/account/ChangeHandleView";
import LeftNav from "@/components/feed/LeftNav";
import MobileNav from "@/components/feed/MobileNav";
import { getAccountProfile } from "@/lib/feed/account-profile";

export const metadata = {
  title: "Change handle · INRCLIQ",
};

export default async function ChangeHandlePage() {
  const profile = await getAccountProfile();
  if (!profile) redirect("/");

  return (
    <div className="app-shell">
      <LeftNav firstName={profile.firstName} />
      <ChangeHandleView
        firstName={profile.firstName}
        lastName={profile.lastName}
        initialHandle={profile.handle}
      />
      <MobileNav />
    </div>
  );
}
