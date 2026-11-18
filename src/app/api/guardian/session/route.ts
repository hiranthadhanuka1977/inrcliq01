import { NextResponse } from "next/server";
import { GUARDIAN_TAB_SESSION_HEADER } from "@/lib/auth/guardian-tab-session";
import { destroySessionByToken } from "@/lib/session";

export async function DELETE(request: Request) {
  try {
    const token = request.headers.get(GUARDIAN_TAB_SESSION_HEADER)?.trim() ?? "";
    await destroySessionByToken(token || null);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("guardian/session delete error", error);
    return NextResponse.json({ error: "Unable to log out." }, { status: 500 });
  }
}
