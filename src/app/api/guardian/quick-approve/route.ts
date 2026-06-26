import { NextResponse } from "next/server";
import { quickApproveReturningGuardian, resolveGuardianToken } from "@/lib/auth/guardian-flow";

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

    const result = await quickApproveReturningGuardian(verification.request.id);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("guardian/quick-approve error", error);
    return NextResponse.json({ error: "Unable to approve request." }, { status: 500 });
  }
}
