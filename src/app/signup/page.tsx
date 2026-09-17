import { redirect } from "next/navigation";
import { SignupFlow } from "@/components/auth/SignupFlow";
import { getOnboardingRedirect } from "@/lib/auth/onboarding";
import { getLatestParentRequest } from "@/lib/auth/parent-invite";
import { getSessionUser } from "@/lib/session";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ restart?: string }>;
}) {
  const { restart } = await searchParams;

  // Hard restart from expired verification should always show signup UI,
  // even if a stale session cookie somehow remains.
  if (restart === "1") {
    return <SignupFlow />;
  }

  const user = await getSessionUser();

  if (user) {
    const parentRequest =
      user.accountType === "MINOR" ? await getLatestParentRequest(user.id) : null;
    redirect(getOnboardingRedirect(user, parentRequest));
  }

  return <SignupFlow />;
}
