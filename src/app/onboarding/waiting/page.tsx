import { redirect } from "next/navigation";
import { AuthCenterLayout } from "@/components/auth/AuthCenterLayout";
import { ParentWaitingView } from "@/components/onboarding/ParentWaitingView";
import { getOnboardingRedirect } from "@/lib/auth/onboarding";
import { getLatestParentRequest } from "@/lib/auth/parent-invite";
import { getSessionUser } from "@/lib/session";

export default async function WaitingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/");

  const parentRequest = await getLatestParentRequest(user.id);
  const redirectTo = getOnboardingRedirect(user, parentRequest);

  if (redirectTo !== "/onboarding/waiting") {
    redirect(redirectTo);
  }

  return (
    <AuthCenterLayout signupStep cardClassName="parent-waiting" progressStep={4}>
      <ParentWaitingView />
    </AuthCenterLayout>
  );
}
