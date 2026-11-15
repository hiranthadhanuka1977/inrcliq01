import { redirect } from "next/navigation";
import ChangeEmailView from "@/components/feed/account/ChangeEmailView";
import LeftNav from "@/components/feed/LeftNav";
import MobileNav from "@/components/feed/MobileNav";
import { getAccountProfile } from "@/lib/feed/account-profile";

export const metadata = {
  title: "Change email · INRCLIQ",
};

export default async function ChangeEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const profile = await getAccountProfile();
  if (!profile) redirect("/");

  const { error } = await searchParams;
  const pageError = error === "taken" || error === "invalid" ? error : null;

  return (
    <div className="app-shell">
      <LeftNav firstName={profile.firstName} />
      <ChangeEmailView currentEmail={profile.email} error={pageError} />
      <MobileNav />
    </div>
  );
}
