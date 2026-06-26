import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth/credentials";
import { requireSessionUser } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { parsePassword } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const { user, error } = await requireSessionUser();
    if (error) return error;

    if (!user.emailVerified) {
      return NextResponse.json({ error: "Verify your email first." }, { status: 403 });
    }

    const body = await request.json();
    const skip = Boolean(body.skip);

    if (skip) {
      await prisma.user.update({
        where: { id: user.id },
        data: { onboardingStep: "handle" },
      });
      return NextResponse.json({ ok: true, redirectTo: "/onboarding/handle" });
    }

    const parsed = parsePassword(body.password);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid password." },
        { status: 400 },
      );
    }

    const passwordHash = await hashPassword(parsed.data);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        onboardingStep: "handle",
      },
    });

    return NextResponse.json({ ok: true, redirectTo: "/onboarding/handle" });
  } catch (error) {
    console.error("onboarding/password error", error);
    return NextResponse.json({ error: "Unable to save password." }, { status: 500 });
  }
}
