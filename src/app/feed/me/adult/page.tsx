import { redirect } from "next/navigation";
import { AdultIdentityVerifyView } from "@/components/feed/account/AdultIdentityVerifyView";
import LeftNav from "@/components/feed/LeftNav";
import MobileNav from "@/components/feed/MobileNav";
import { deriveUserNameFromEmail } from "@/lib/auth/display-name";
import { getAccountProfile } from "@/lib/feed/account-profile";
import { getDefaultAdultDob } from "@/lib/form-validation";
import { getSessionUser } from "@/lib/session";
import { formatLongDate } from "@/lib/utils/format-dates";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Confirm you are an adult · INRCLIQ",
};

export default async function AdultIdentityPage() {
  const [profile, user] = await Promise.all([getAccountProfile(), getSessionUser()]);
  if (!profile || !user) redirect("/");
  if (profile.accountType === "MINOR") redirect("/feed/me");
  if (profile.identityVerified) redirect("/feed/me");

  const derived = deriveUserNameFromEmail(user.email);
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || derived.fullName;
  const fallbackDob = getDefaultAdultDob();
  const dateOfBirthDisplay = user.dateOfBirth
    ? formatLongDate(user.dateOfBirth)
    : formatLongDate(new Date(fallbackDob.year, fallbackDob.month - 1, fallbackDob.day));

  return (
    <div className="app-shell">
      <LeftNav firstName={profile.firstName} />
      <main className="main-content account-profile" id="main">
        <AdultIdentityVerifyView
          email={user.email}
          fullName={fullName}
          dateOfBirthDisplay={dateOfBirthDisplay}
          country={user.country}
          identityRejected={user.guardianIdentityStatus === "rejected"}
        />
      </main>
      <MobileNav />
    </div>
  );
}
