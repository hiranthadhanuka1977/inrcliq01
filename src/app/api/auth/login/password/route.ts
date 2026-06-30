import { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth/credentials";
import { findUserForLogin } from "@/lib/auth/login-code";
import { getOnboardingRedirect } from "@/lib/auth/onboarding";
import { getLatestParentRequest } from "@/lib/auth/parent-invite";
import { createSession } from "@/lib/session";
import { parseEmail } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const emailResult = parseEmail(body.email);
    const password = typeof body.password === "string" ? body.password : "";

    if (!emailResult.success) {
      return NextResponse.json(
        { error: emailResult.error.issues[0]?.message ?? "Invalid email." },
        { status: 400 },
      );
    }

    if (!password.trim()) {
      return NextResponse.json({ error: "Please enter your password." }, { status: 400 });
    }

    const userResult = await findUserForLogin(emailResult.data);

    if (!userResult.ok) {
      const error =
        userResult.reason === "not_found"
          ? "We couldn't find an account with that email. Check the address or sign up to join InrCliq."
          : "Please verify your email before logging in. Check your inbox or sign up again.";
      return NextResponse.json({ error }, { status: userResult.reason === "not_found" ? 404 : 403 });
    }

    if (!userResult.user.passwordHash) {
      return NextResponse.json(
        { error: "No password is set for this account. Use a login code instead." },
        { status: 400 },
      );
    }

    const matches = await verifyPassword(password, userResult.user.passwordHash);
    if (!matches) {
      return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
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
    console.error("login/password error", error);
    return NextResponse.json({ error: "Unable to log in." }, { status: 500 });
  }
}
