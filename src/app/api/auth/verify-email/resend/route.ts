import { NextResponse } from "next/server";
import {
  createEmailVerificationToken,
  getEmailVerifyCooldownRemaining,
  sendVerificationEmail,
} from "@/lib/auth/email-verification";
import { parseEmail } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const emailResult = parseEmail(body.email);

    if (!emailResult.success) {
      return NextResponse.json(
        { error: emailResult.error.issues[0]?.message ?? "Invalid email." },
        { status: 400 },
      );
    }

    const email = emailResult.data.toLowerCase();
    const remaining = await getEmailVerifyCooldownRemaining(email);

    if (remaining > 0) {
      return NextResponse.json(
        { error: "Please wait before resending.", cooldownRemaining: remaining },
        { status: 429 },
      );
    }

    const tokenResult = await createEmailVerificationToken(email);

    if (!tokenResult.ok) {
      return NextResponse.json(
        { cooldownRemaining: tokenResult.cooldownRemaining },
        { status: 429 },
      );
    }

    await sendVerificationEmail(email, tokenResult.verifyUrl);

    const response: Record<string, unknown> = {
      ok: true,
      cooldownRemaining: tokenResult.cooldownRemaining,
    };

    if (process.env.NODE_ENV === "development") {
      response.devVerifyUrl = tokenResult.verifyUrl;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("verify-email/resend error", error);
    return NextResponse.json({ error: "Unable to resend verification email." }, { status: 500 });
  }
}
