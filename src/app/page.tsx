import { redirect } from "next/navigation";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { LoginForm } from "@/components/auth/LoginForm";
import { WelcomePlaceholder } from "@/components/home/WelcomePlaceholder";
import { PrototypeConsentModal } from "@/components/prototype/PrototypeConsentModal";
import { getOnboardingRedirect } from "@/lib/auth/onboarding";
import { getLatestParentRequest } from "@/lib/auth/parent-invite";
import { getSessionUser } from "@/lib/session";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ parentDone?: string }>;
}) {
  const { parentDone } = await searchParams;
  const isParentDone = parentDone === "1";
  const user = await getSessionUser();

  if (user && !isParentDone) {
    const parentRequest =
      user.accountType === "MINOR" ? await getLatestParentRequest(user.id) : null;
    redirect(getOnboardingRedirect(user, parentRequest));
  }

  if (isParentDone) {
    return <WelcomePlaceholder email={user?.email} />;
  }

  return (
    <>
      <AuthSplitLayout title="Welcome back." subtitle="Log in to your InrCliq account.">
        <LoginForm />
      </AuthSplitLayout>
      <PrototypeConsentModal />
    </>
  );
}
