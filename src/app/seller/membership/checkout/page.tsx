import { redirect } from "next/navigation";
import { SellerMembershipCheckoutView } from "@/components/seller/SellerMembershipCheckoutView";
import { hasCompletedAdultIdentity } from "@/lib/auth/adult-identity";
import { getSessionUser } from "@/lib/session";
import { getSellerIdentity } from "@/lib/seller/identity";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Subscribe · Verified membership · INRCLIQ",
};

export default async function SellerMembershipCheckoutPage() {
  const [user, identity] = await Promise.all([getSessionUser(), getSellerIdentity()]);
  if (!user) redirect("/");

  if (identity?.verified) {
    redirect("/seller");
  }

  if (!hasCompletedAdultIdentity(user.guardianIdentityStatus)) {
    redirect("/seller/membership/verify");
  }

  const firstName = user.firstName ?? identity?.displayName?.split(" ")[0] ?? null;

  return <SellerMembershipCheckoutView firstName={firstName} />;
}
