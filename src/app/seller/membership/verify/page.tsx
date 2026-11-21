import { redirect } from "next/navigation";
import { SellerMembershipVerifyView } from "@/components/seller/SellerMembershipVerifyView";
import { deriveUserNameFromEmail } from "@/lib/auth/display-name";
import { getDefaultAdultDob } from "@/lib/form-validation";
import { getSessionUser } from "@/lib/session";
import { formatLongDate } from "@/lib/utils/format-dates";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Age verification · Verified membership · INRCLIQ",
};

export default async function SellerMembershipVerifyPage() {
  const user = await getSessionUser();
  if (!user) redirect("/");

  const derived = deriveUserNameFromEmail(user.email);
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ") || derived.fullName;
  const fallbackDob = getDefaultAdultDob();
  const dateOfBirthDisplay = user.dateOfBirth
    ? formatLongDate(user.dateOfBirth)
    : formatLongDate(new Date(fallbackDob.year, fallbackDob.month - 1, fallbackDob.day));

  return (
    <SellerMembershipVerifyView
      email={user.email}
      fullName={fullName}
      dateOfBirthDisplay={dateOfBirthDisplay}
      country={user.country}
      identityRejected={user.guardianIdentityStatus === "rejected"}
    />
  );
}
