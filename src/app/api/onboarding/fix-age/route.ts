import { NextResponse } from "next/server";
import { AccountType } from "@/generated/prisma/client";
import { requireSessionUser } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const { user, error } = await requireSessionUser();
    if (error) return error;

    if (user.accountType !== AccountType.MINOR) {
      return NextResponse.json({ error: "Only minor accounts can update age status." }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        accountType: AccountType.ADULT,
        onboardingStep: "password",
      },
    });

    return NextResponse.json({ ok: true, redirectTo: "/onboarding/password" });
  } catch (error) {
    console.error("onboarding/fix-age error", error);
    return NextResponse.json({ error: "Unable to update account." }, { status: 500 });
  }
}
