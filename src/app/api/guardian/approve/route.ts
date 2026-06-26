import { NextResponse } from "next/server";
import { completeGuardianApproval, resolveGuardianToken } from "@/lib/auth/guardian-flow";

/** @deprecated Use the multi-step guardian flow via /api/guardian/complete instead. */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = typeof body.token === "string" ? body.token.trim() : "";

    if (!token) {
      return NextResponse.json({ error: "Missing approval token." }, { status: 400 });
    }

    const verification = await resolveGuardianToken(token);
    if (!verification.ok) {
      return NextResponse.json({ error: "Invalid or expired approval link." }, { status: 400 });
    }

    const result = await completeGuardianApproval(verification.request.id, {
      protectionLevel: "standard",
      childLivesWithGuardian: true,
    });

    if (!result.ok) {
      if (result.error === "Guardian account not set up yet.") {
        return NextResponse.json(
          { error: "Please complete the guardian approval flow." },
          { status: 400 },
        );
      }
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      childFirstName: result.childFirstName,
    });
  } catch (error) {
    console.error("guardian/approve error", error);
    return NextResponse.json({ error: "Unable to approve request." }, { status: 500 });
  }
}
