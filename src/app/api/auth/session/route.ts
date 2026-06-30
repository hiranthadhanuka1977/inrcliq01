import { NextResponse } from "next/server";
import { getOnboardingRedirect } from "@/lib/auth/onboarding";
import { getLatestParentRequest } from "@/lib/auth/parent-invite";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const parentRequest =
    user.accountType === "MINOR" ? await getLatestParentRequest(user.id) : null;
  const redirectTo = getOnboardingRedirect(user, parentRequest);

  return NextResponse.json({
    authenticated: true,
    user: {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      onboardingStep: user.onboardingStep,
    },
    redirectTo,
  });
}
