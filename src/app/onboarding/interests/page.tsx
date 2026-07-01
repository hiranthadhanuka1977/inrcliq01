import { redirect } from "next/navigation";
import { AuthCenterLayout } from "@/components/auth/AuthCenterLayout";
import { InterestsForm } from "@/components/onboarding/InterestsForm";
import { getOnboardingRedirect } from "@/lib/auth/onboarding";
import { getLatestParentRequest } from "@/lib/auth/parent-invite";
import { getSessionUser } from "@/lib/session";

export default async function InterestsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/");

  const parentRequest =
    user.accountType === "MINOR" ? await getLatestParentRequest(user.id) : null;
  const redirectTo = getOnboardingRedirect(user, parentRequest);

  if (redirectTo !== "/onboarding/interests") {
    redirect(redirectTo);
  }

  return (
    <AuthCenterLayout signupStep progressStep={7}>
      <InterestsForm />
    </AuthCenterLayout>
  );
}
