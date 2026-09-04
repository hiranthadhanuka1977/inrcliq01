import { redirect } from "next/navigation";
import { AuthCenterLayout } from "@/components/auth/AuthCenterLayout";
import { PasswordForm } from "@/components/onboarding/PasswordForm";
import { getOnboardingRedirect } from "@/lib/auth/onboarding";
import { getLatestParentRequest } from "@/lib/auth/parent-invite";
import { getSessionUser } from "@/lib/session";
import { isLiveBackend } from "@/lib/backend/config";
import { liveOnboardingGuard } from "@/lib/backend/onboarding-guard";
import type { OnboardingViewer } from "@/lib/backend/onboarding-guard";

export default async function PasswordPage() {
  if (isLiveBackend()) {
    const guard = await liveOnboardingGuard(["/onboarding/password"]);
    if (guard.kind === "redirect") redirect(guard.to);
    return renderPage(guard.viewer);
  }

  const user = await getSessionUser();
  if (!user) redirect("/");

  const parentRequest =
    user.accountType === "MINOR" ? await getLatestParentRequest(user.id) : null;
  const redirectTo = getOnboardingRedirect(user, parentRequest);

  if (redirectTo !== "/onboarding/password") {
    redirect(redirectTo);
  }

  return renderPage({
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    email: user.email,
  });
}

/** The page itself. Both session models render exactly the same screen. */
function renderPage(viewer: OnboardingViewer) {
  return (
    <AuthCenterLayout signupStep progressStep={5}>
      <PasswordForm email={viewer.email} />
    </AuthCenterLayout>
  );
}
