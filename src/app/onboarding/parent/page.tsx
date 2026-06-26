import { redirect } from "next/navigation";
import { AuthCenterLayout } from "@/components/auth/AuthCenterLayout";
import { ParentInviteForm } from "@/components/onboarding/ParentInviteForm";
import { getOnboardingRedirect } from "@/lib/auth/onboarding";
import { getLatestParentRequest } from "@/lib/auth/parent-invite";
import { getSessionUser } from "@/lib/session";

export default async function ParentPage() {
  const user = await getSessionUser();
  if (!user) redirect("/");

  const parentRequest = await getLatestParentRequest(user.id);
  const redirectTo = getOnboardingRedirect(user, parentRequest);
  const canEditParent =
    redirectTo === "/onboarding/parent" || user.onboardingStep === "waiting";

  if (!canEditParent) {
    redirect(redirectTo);
  }

  return (
    <AuthCenterLayout signupStep progressStep={4} screenId="screen-ONB-03">
      <ParentInviteForm firstName={user.firstName ?? "Your child"} />
    </AuthCenterLayout>
  );
}
