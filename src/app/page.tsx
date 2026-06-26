import { redirect } from "next/navigation";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { LoginForm } from "@/components/auth/LoginForm";
import { getOnboardingRedirect } from "@/lib/auth/onboarding";
import { getLatestParentRequest } from "@/lib/auth/parent-invite";
import { getSessionUser } from "@/lib/session";

export default async function LoginPage() {
  const user = await getSessionUser();

  if (user) {
    const parentRequest =
      user.accountType === "MINOR" ? await getLatestParentRequest(user.id) : null;
    redirect(getOnboardingRedirect(user, parentRequest));
  }

  return (
    <AuthSplitLayout title="Welcome back." subtitle="Log in to your InrCliq account.">
      <LoginForm />
    </AuthSplitLayout>
  );
}
