import { NextResponse } from "next/server";
import { createPasswordChangeCode } from "@/lib/auth/password-change-code";
import { requireSessionUser } from "@/lib/api-helpers";

export async function POST() {
  try {
    const { user, error } = await requireSessionUser();
    if (error) return error;

    const result = await createPasswordChangeCode(user.id, user.email);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 429 });
    }

    return NextResponse.json({ ok: true, email: result.email, code: result.code });
  } catch (err) {
    console.error("POST /api/feed/me/password/otp error", err);
    return NextResponse.json({ error: "Unable to send the password code." }, { status: 500 });
  }
}
