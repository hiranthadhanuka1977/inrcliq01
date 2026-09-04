import { redirect } from "next/navigation";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { LoginForm } from "@/components/auth/LoginForm";
import { WelcomePlaceholder } from "@/components/home/WelcomePlaceholder";
import { PrototypeConsentModal } from "@/components/prototype/PrototypeConsentModal";
import { PrototypeControls } from "@/components/prototype/PrototypeControls";
import { getOnboardingRedirect } from "@/lib/auth/onboarding";
import { getLatestParentRequest } from "@/lib/auth/parent-invite";
import { getSessionUser } from "@/lib/session";
import { isLiveBackend } from "@/lib/backend/config";
import { currentDestination } from "@/lib/backend/destination";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ parentDone?: string; verified?: string }>;
}) {
  const { parentDone, verified } = await searchParams;
  const isParentDone = parentDone === "1";

  // Mock mode keeps its session in the prototype's own database; live mode has
  // no row there at all, so reading only the mock session left a signed-in user
  // staring at a login form. Each mode is asked about its own session.
  const destination = isLiveBackend() ? await currentDestination() : null;
  const user = isLiveBackend() ? null : await getSessionUser();

  if (!isParentDone) {
    if (destination) redirect(destination);
    if (user) {
      const parentRequest =
        user.accountType === "MINOR" ? await getLatestParentRequest(user.id) : null;
      redirect(getOnboardingRedirect(user, parentRequest));
    }
  }

  if (isParentDone) {
    return <WelcomePlaceholder email={user?.email} />;
  }

  // Reaching a login form after clicking a verification link is confusing
  // without a reason — it means the account is verified but this device holds
  // no session, usually because the link was opened somewhere else.
  const subtitle =
    verified === "already"
      ? "Your email is already verified. Log in to continue."
      : "Log in to your InrCliq account.";

  return (
    <>
      <PrototypeControls />
      <AuthSplitLayout title="Welcome back." subtitle={subtitle}>
        <LoginForm />
      </AuthSplitLayout>
      <PrototypeConsentModal />
    </>
  );
}
