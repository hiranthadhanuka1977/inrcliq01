import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isLiveBackend } from "@/lib/backend/config";
import { liveGuardianContext } from "@/lib/backend/routes";
import {
  buildAuthenticatedGuardianProfile,
  buildGuardianContext,
} from "@/lib/auth/guardian-flow";
import { getSessionUser } from "@/lib/session";

export async function GET(request: Request) {
  if (isLiveBackend()) return liveGuardianContext(request as NextRequest);

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
      const profile = buildAuthenticatedGuardianProfile(sessionUser);
      result.context.authenticatedGuardian = true;
      result.context.authenticatedGuardianName = profile.name;
      result.context.authenticatedGuardianEmail = profile.email;
      result.context.authenticatedGuardianCountry = profile.country;
      result.context.authenticatedGuardianRegion = profile.region;
      result.context.authenticatedGuardianProfile = profile;
    }

    return NextResponse.json(result.context);
  } catch (error) {
    console.error("guardian/context error", error);
    return NextResponse.json({ error: "Unable to load approval request." }, { status: 500 });
  }
}
