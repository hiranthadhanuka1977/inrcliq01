import { NextResponse } from "next/server";
import { createLoginCode, findUserForLogin, sendLoginCodeEmail } from "@/lib/auth/login-code";
import { parseEmail } from "@/lib/validation";

const LOGIN_ERRORS = {
  not_found:
    "We couldn't find an account with that email. Check the address or sign up to join InrCliq.",
  unverified:
    "Please verify your email before logging in. Check your inbox or sign up again.",
} as const;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = parseEmail(body.email);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid email." },
        { status: 400 },
      );
    }

    const userResult = await findUserForLogin(parsed.data);

    if (!userResult.ok) {
      return NextResponse.json(
        { error: LOGIN_ERRORS[userResult.reason] },
        { status: userResult.reason === "not_found" ? 404 : 403 },
      );
    }

    const result = await createLoginCode(parsed.data);

    if (!result.ok) {
      return NextResponse.json(
        { error: "Please wait before requesting another code.", cooldownRemaining: result.cooldownRemaining },
        { status: 429 },
      );
    }

    await sendLoginCodeEmail(parsed.data, result.code);

    return NextResponse.json({
      ok: true,
      cooldownRemaining: result.cooldownRemaining,
      loginCode: result.code,
    });
  } catch (error) {
    console.error("send-code error", error);
    return NextResponse.json({ error: "Unable to send login code." }, { status: 500 });
  }
}
