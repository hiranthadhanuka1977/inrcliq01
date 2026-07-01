import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/api-helpers";
import { sendProfileCompleteEmail } from "@/lib/email/notifications";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { user, error } = await requireSessionUser();
    if (error) return error;

    if (!user.emailVerified) {
      return NextResponse.json({ error: "Verify your email first." }, { status: 403 });
    }

    const body = await request.json();
    const skip = Boolean(body.skip);
    const interests = Array.isArray(body.interests)
      ? body.interests.filter((value: unknown): value is string => typeof value === "string")
      : [];

    if (!skip && interests.length === 0) {
      return NextResponse.json({ error: "Please choose at least one interest." }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { onboardingStep: "complete" },
    });

    await sendProfileCompleteEmail(user.email, user.firstName ?? "there");

    return NextResponse.json({ ok: true, redirectTo: "/home" });
  } catch (error) {
    console.error("onboarding/interests error", error);
    return NextResponse.json({ error: "Unable to save interests." }, { status: 500 });
  }
}
