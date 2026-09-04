import { NextResponse } from "next/server";
import { isLiveBackend } from "@/lib/backend/config";
import { liveGuardianIdentity } from "@/lib/backend/routes";
import { resolveMockIdentity } from "@/lib/guardian/mock-identity";

/**
 * Guardian identity step — submit.
 *
 * Simulated in both modes today: the prototype fakes it locally, and the API's
 * version is an explicit mock behind GUARDIAN_IDV_MODE while the real identity
 * model is built separately. The shape is the real contract, so neither side
 * changes when that model lands.
 */
export async function POST(request: Request) {
  if (isLiveBackend()) return liveGuardianIdentity(request, "submit");

  const body = await request.json();
  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token) {
    return NextResponse.json({ error: "Missing approval token." }, { status: 400 });
  }

  const result = await resolveMockIdentity(token, typeof body.idDocType === "string" ? body.idDocType : "passport");
  if (!result.ok) {
    return NextResponse.json({ error: "Invalid or expired approval link." }, { status: 400 });
  }

  return NextResponse.json({ status: "VERIFIED", extracted: result.extracted });
}
