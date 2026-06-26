import { NextResponse } from "next/server";
import { completeGuardianApproval, resolveGuardianToken } from "@/lib/auth/guardian-flow";
import type { ProtectionTier } from "@/lib/guardian/constants";
import { PROTECTION_TIER_LABELS } from "@/lib/guardian/constants";
import { COUNTRIES, US_STATES } from "@/lib/constants/locations";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const protectionLevel = typeof body.protectionLevel === "string"
      ? (body.protectionLevel as ProtectionTier)
      : "standard";
    const childLivesWithGuardian = Boolean(body.childLivesWithGuardian);
    const childLocationCountry =
      typeof body.childLocationCountry === "string" ? body.childLocationCountry : null;
    const childLocationRegion =
      typeof body.childLocationRegion === "string" ? body.childLocationRegion : null;

    if (!token) {
      return NextResponse.json({ error: "Missing approval token." }, { status: 400 });
    }

    if (!(protectionLevel in PROTECTION_TIER_LABELS)) {
      return NextResponse.json({ error: "Invalid protection level." }, { status: 400 });
    }

    const verification = await resolveGuardianToken(token);
    if (!verification.ok) {
      return NextResponse.json({ error: "Invalid or expired approval link." }, { status: 400 });
    }

    if (!childLivesWithGuardian) {
      if (!childLocationCountry || !COUNTRIES.some((item) => item.code === childLocationCountry)) {
        return NextResponse.json({ error: "Please select the child's country." }, { status: 400 });
      }
      if (
        childLocationCountry === "US" &&
        (!childLocationRegion || !US_STATES.includes(childLocationRegion as (typeof US_STATES)[number]))
      ) {
        return NextResponse.json({ error: "Please select the child's state." }, { status: 400 });
      }
    }

    const result = await completeGuardianApproval(verification.request.id, {
      protectionLevel,
      childLivesWithGuardian,
      childLocationCountry,
      childLocationRegion,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("guardian/complete error", error);
    return NextResponse.json({ error: "Unable to complete approval." }, { status: 500 });
  }
}
