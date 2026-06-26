import { redirect } from "next/navigation";
import { AuthCenterLayout } from "@/components/auth/AuthCenterLayout";
import { HandleForm } from "@/components/onboarding/HandleForm";
import { getOnboardingRedirect } from "@/lib/auth/onboarding";
import { getLatestParentRequest } from "@/lib/auth/parent-invite";
import { getSessionUser } from "@/lib/session";

export default async function HandlePage() {
  const user = await getSessionUser();
  if (!user) redirect("/");

  const parentRequest =
    user.accountType === "MINOR" ? await getLatestParentRequest(user.id) : null;
  const redirectTo = getOnboardingRedirect(user, parentRequest);

  if (redirectTo !== "/onboarding/handle") {
    redirect(redirectTo);
  }

  return (
    <AuthCenterLayout signupStep progressStep={6}>
      <HandleForm firstName={user.firstName ?? ""} lastName={user.lastName ?? ""} />
    </AuthCenterLayout>
  );
}
