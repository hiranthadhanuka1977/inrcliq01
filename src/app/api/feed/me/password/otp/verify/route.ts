import { NextResponse } from "next/server";
import { findValidPasswordChangeCode } from "@/lib/auth/password-change-code";
import { requireSessionUser } from "@/lib/api-helpers";
import { parseLoginCode } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const { user, error } = await requireSessionUser();
    if (error) return error;

    const body = await request.json();
    const parsed = parseLoginCode(body.code);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Please enter the 6-digit code." },
        { status: 400 },
      );
    }

    const record = await findValidPasswordChangeCode(user.id, parsed.data);
    if (!record) {
      return NextResponse.json({ error: "That code is incorrect or has expired." }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/feed/me/password/otp/verify error", err);
    return NextResponse.json({ error: "Unable to check the code." }, { status: 500 });
  }
}
