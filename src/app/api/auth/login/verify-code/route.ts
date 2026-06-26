import { NextResponse } from "next/server";
import { findUserForLogin, verifyLoginCode } from "@/lib/auth/login-code";
import { getOnboardingRedirect } from "@/lib/auth/onboarding";
import { getLatestParentRequest } from "@/lib/auth/parent-invite";
import { createSession } from "@/lib/session";
import { parseEmail, parseLoginCode } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const emailResult = parseEmail(body.email);
    const codeResult = parseLoginCode(body.code);

    if (!emailResult.success) {
      return NextResponse.json(
        { error: emailResult.error.issues[0]?.message ?? "Invalid email." },
        { status: 400 },
      );
    }

    if (!codeResult.success) {
      return NextResponse.json(
        { error: codeResult.error.issues[0]?.message ?? "Invalid code." },
        { status: 400 },
      );
    }

    const verification = await verifyLoginCode(emailResult.data, codeResult.data);
    if (!verification.ok) {
      return NextResponse.json({ error: "Invalid or expired code." }, { status: 401 });
    }

    const userResult = await findUserForLogin(emailResult.data);

    if (!userResult.ok) {
      const error =
        userResult.reason === "not_found"
          ? "We couldn't find an account with that email. Check the address or sign up to join InrCliq."
          : "Please verify your email before logging in. Check your inbox or sign up again.";
      return NextResponse.json({ error }, { status: userResult.reason === "not_found" ? 404 : 403 });
    }

    await createSession(userResult.user.id);

    const parentRequest =
      userResult.user.accountType === "MINOR"
        ? await getLatestParentRequest(userResult.user.id)
        : null;

    return NextResponse.json({
      ok: true,
      redirectTo: getOnboardingRedirect(userResult.user, parentRequest),
    });
  } catch (error) {
    console.error("verify-code error", error);
    return NextResponse.json({ error: "Unable to log in." }, { status: 500 });
  }
}
