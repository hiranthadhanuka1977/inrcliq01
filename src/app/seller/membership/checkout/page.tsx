import { redirect } from "next/navigation";
import { SellerMembershipCheckoutView } from "@/components/seller/SellerMembershipCheckoutView";
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

  const firstName = user.firstName ?? identity?.displayName?.split(" ")[0] ?? null;

  return <SellerMembershipCheckoutView firstName={firstName} />;
}
