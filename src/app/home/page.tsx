import { redirect } from "next/navigation";
import { getOnboardingRedirect } from "@/lib/auth/onboarding";
import { getLatestParentRequest } from "@/lib/auth/parent-invite";
import { getSessionUser } from "@/lib/session";

/** Legacy /home route — send completed users into the merged feed. */
export default async function HomePage() {
  const user = await getSessionUser();
  if (!user) redirect("/");

  const parentRequest =
    user.accountType === "MINOR" ? await getLatestParentRequest(user.id) : null;
  const onboardingRedirect = getOnboardingRedirect(user, parentRequest);

  if (onboardingRedirect !== "/feed") {
    redirect(onboardingRedirect);
  }

  redirect("/feed");
}
