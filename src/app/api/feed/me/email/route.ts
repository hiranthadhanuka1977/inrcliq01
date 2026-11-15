import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/api-helpers";
import { requestEmailChange } from "@/lib/feed/email-change";

export async function POST(request: Request) {
  try {
    const { user, error } = await requireSessionUser();
    if (error) return error;

    const body = await request.json();
    const email = typeof body.email === "string" ? body.email : "";
    const result = await requestEmailChange(user.id, email);

    if (!result.ok) {
      const status = result.error === "Another account already uses that email." ? 409 : 400;
      return NextResponse.json(
        { error: result.error, cooldownRemaining: "cooldownRemaining" in result ? result.cooldownRemaining : undefined },
        { status },
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("POST /api/feed/me/email error", err);
    return NextResponse.json({ error: "Unable to send the verification email." }, { status: 500 });
  }
}
