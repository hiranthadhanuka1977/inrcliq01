import { NextResponse } from "next/server";
import { AccountType } from "@/generated/prisma/client";
import {
  buildAuthenticatedGuardianProfile,
  buildGuardianContext,
} from "@/lib/auth/guardian-flow";
import { destroySession, getSessionUser } from "@/lib/session";

function emailsMatch(a: string | null | undefined, b: string | null | undefined) {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token")?.trim() ?? "";

    if (!token) {
      return NextResponse.json({ error: "Missing approval token." }, { status: 400 });
    }

    const result = await buildGuardianContext(token);

    if (!result.ok) {
      if (result.reason === "resolved") {
        return NextResponse.json(
          { error: "This approval link has already been used.", status: result.status },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: "Invalid or expired approval link." }, { status: 400 });
    }

    const sessionUser = await getSessionUser();
    if (sessionUser) {
      const isChildSession =
        sessionUser.accountType === AccountType.MINOR ||
        emailsMatch(sessionUser.email, result.context.child.email);

      // Parent approval should not reuse the child's browser session.
      // Default to logged out so the parent can sign in / create their own account.
      if (isChildSession) {
        await destroySession();
      } else if (
        emailsMatch(sessionUser.email, result.context.parentEmail) ||
        sessionUser.accountType === AccountType.GUARDIAN
      ) {
        const profile = buildAuthenticatedGuardianProfile(sessionUser);
        result.context.authenticatedGuardian = true;
        result.context.authenticatedGuardianName = profile.name;
        result.context.authenticatedGuardianEmail = profile.email;
        result.context.authenticatedGuardianCountry = profile.country;
        result.context.authenticatedGuardianRegion = profile.region;
        result.context.authenticatedGuardianProfile = profile;
      }
    }

    return NextResponse.json(result.context);
  } catch (error) {
    console.error("guardian/context error", error);
    return NextResponse.json({ error: "Unable to load approval request." }, { status: 500 });
  }
}
