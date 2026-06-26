import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const { user, error } = await requireSessionUser();
    if (error) return error;

    if (user.onboardingStep !== "approved") {
      return NextResponse.json({ error: "Invalid onboarding step." }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { onboardingStep: "password" },
    });

    return NextResponse.json({ ok: true, redirectTo: "/onboarding/password" });
  } catch (err) {
    console.error("onboarding/acknowledge-approval error", err);
    return NextResponse.json({ error: "Unable to continue." }, { status: 500 });
  }
}
