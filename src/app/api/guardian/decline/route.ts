import { NextResponse } from "next/server";
import { isLiveBackend } from "@/lib/backend/config";
import { liveGuardianDecline } from "@/lib/backend/routes";
import { declineParentRequestById, resolveGuardianToken } from "@/lib/auth/guardian-flow";

export async function POST(request: Request) {
  if (isLiveBackend()) return liveGuardianDecline(request);

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

    await declineParentRequestById(verification.request.id);

    return NextResponse.json({
      ok: true,
      childFirstName: verification.request.childUser.firstName ?? "Your child",
    });
  } catch (error) {
    console.error("guardian/decline error", error);
    return NextResponse.json({ error: "Unable to decline request." }, { status: 500 });
  }
}
