import { redirect } from "next/navigation";
import { AuthCenterLayout } from "@/components/auth/AuthCenterLayout";
import { ParentApprovedView } from "@/components/onboarding/ParentApprovedView";
import { getOnboardingRedirect } from "@/lib/auth/onboarding";
import { getLatestParentRequest } from "@/lib/auth/parent-invite";
import { getSessionUser } from "@/lib/session";
import { isLiveBackend } from "@/lib/backend/config";
import { liveOnboardingGuard } from "@/lib/backend/onboarding-guard";
import type { OnboardingViewer } from "@/lib/backend/onboarding-guard";

export default async function ApprovedPage() {
  if (isLiveBackend()) {
    const guard = await liveOnboardingGuard(["/onboarding/approved"]);
    if (guard.kind === "redirect") redirect(guard.to);
    return renderPage(guard.viewer);
  }

  const user = await getSessionUser();
  if (!user) redirect("/");

  const parentRequest = await getLatestParentRequest(user.id);
  const redirectTo = getOnboardingRedirect(user, parentRequest);

  if (redirectTo !== "/onboarding/approved") {
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
    <AuthCenterLayout signupStep progressStep={4} screenId="screen-ONB-05">
      <ParentApprovedView firstName={viewer.firstName || "there"} />
    </AuthCenterLayout>
  );
}
