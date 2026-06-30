import { redirect } from "next/navigation";
import { WelcomePlaceholder } from "@/components/home/WelcomePlaceholder";
import { getOnboardingRedirect } from "@/lib/auth/onboarding";
import { getLatestParentRequest } from "@/lib/auth/parent-invite";
import { getSessionUser } from "@/lib/session";

export default async function HomePage() {
  const user = await getSessionUser();
  if (!user) redirect("/");

  const parentRequest =
    user.accountType === "MINOR" ? await getLatestParentRequest(user.id) : null;
  const onboardingRedirect = getOnboardingRedirect(user, parentRequest);

  if (onboardingRedirect !== "/home") {
    redirect(onboardingRedirect);
  }

  return <WelcomePlaceholder email={user.email} />;
}
