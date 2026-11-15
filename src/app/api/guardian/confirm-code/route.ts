import { NextResponse } from "next/server";
import { confirmMinorActivationCode } from "@/lib/auth/guardian-flow";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const code = typeof body.code === "string" ? body.code : "";

    if (!token) {
      return NextResponse.json({ error: "Missing approval token." }, { status: 400 });
    }

    const result = await confirmMinorActivationCode(token, code);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("guardian/confirm-code error", error);
    return NextResponse.json({ error: "Unable to confirm the activation code." }, { status: 500 });
  }
}
