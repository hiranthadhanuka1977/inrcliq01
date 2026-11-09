import { redirect } from "next/navigation";
import { getOnboardingRedirect } from "@/lib/auth/onboarding";
import { getLatestParentRequest } from "@/lib/auth/parent-invite";
import { getSessionUser } from "@/lib/session";

/** Sends a signed-in person who has not finished onboarding back to their current step. */
export async function redirectIfOnboardingIncomplete() {
  const user = await getSessionUser();
  if (!user) return;

  const parentRequest = user.accountType === "MINOR" ? await getLatestParentRequest(user.id) : null;
  const destination = getOnboardingRedirect(user, parentRequest);
  if (destination !== "/feed") redirect(destination);
}
