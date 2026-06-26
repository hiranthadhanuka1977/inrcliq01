import { redirect } from "next/navigation";
import { AuthCenterLayout } from "@/components/auth/AuthCenterLayout";
import { ParentApprovedView } from "@/components/onboarding/ParentApprovedView";
import { getOnboardingRedirect } from "@/lib/auth/onboarding";
import { getLatestParentRequest } from "@/lib/auth/parent-invite";
import { getSessionUser } from "@/lib/session";

export default async function ApprovedPage() {
  const user = await getSessionUser();
  if (!user) redirect("/");

  const parentRequest = await getLatestParentRequest(user.id);
  const redirectTo = getOnboardingRedirect(user, parentRequest);

  if (redirectTo !== "/onboarding/approved") {
    redirect(redirectTo);
  }

  return (
    <AuthCenterLayout signupStep progressStep={4} screenId="screen-ONB-05">
      <ParentApprovedView firstName={user.firstName ?? "there"} />
    </AuthCenterLayout>
  );
}
