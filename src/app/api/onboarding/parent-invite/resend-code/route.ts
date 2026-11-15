import { NextResponse } from "next/server";
import { AccountType } from "@/generated/prisma/client";
import { resendMinorActivationCodeEmailToChild } from "@/lib/auth/parent-invite";
import { requireSessionUser } from "@/lib/api-helpers";

export async function POST() {
  try {
    const { user, error } = await requireSessionUser();
    if (error) return error;

    if (user.accountType !== AccountType.MINOR) {
      return NextResponse.json({ error: "Parent approval is not required." }, { status: 400 });
    }

    const result = await resendMinorActivationCodeEmailToChild(user);
    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error,
          ...("cooldownRemaining" in result ? { cooldownRemaining: result.cooldownRemaining } : {}),
        },
        { status: result.status },
      );
    }

    return NextResponse.json({
      ok: true,
      cooldownRemaining: result.cooldownRemaining,
    });
  } catch (error) {
    console.error("parent-invite/resend-code error", error);
    return NextResponse.json({ error: "Unable to email your activation code." }, { status: 500 });
  }
}
