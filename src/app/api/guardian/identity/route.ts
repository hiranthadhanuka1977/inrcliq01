import { NextResponse } from "next/server";
import { recordGuardianIdentityCapture, resolveGuardianToken } from "@/lib/auth/guardian-flow";
import { ID_DOC_TYPE_LABELS, type IdDocType } from "@/lib/guardian/constants";
import { GUARDIAN_TAB_SESSION_HEADER } from "@/lib/auth/guardian-tab-session";
import { getSessionUserByToken } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const idDocType = typeof body.idDocType === "string" ? body.idDocType : "";

    if (!token) {
      return NextResponse.json({ error: "Missing approval token." }, { status: 400 });
    }

    if (!(idDocType in ID_DOC_TYPE_LABELS)) {
      return NextResponse.json({ error: "Choose a valid ID type." }, { status: 400 });
    }

    const verification = await resolveGuardianToken(token);
    if (!verification.ok) {
      return NextResponse.json({ error: "Invalid or expired approval link." }, { status: 400 });
    }

    const sessionUser = await getSessionUserByToken(
      request.headers.get(GUARDIAN_TAB_SESSION_HEADER),
    );
    const result = await recordGuardianIdentityCapture(verification.request.id, {
      idDocType: idDocType as IdDocType,
      sessionUserId: sessionUser?.id ?? null,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("guardian/identity error", error);
    return NextResponse.json({ error: "Unable to save identity verification." }, { status: 500 });
  }
}
