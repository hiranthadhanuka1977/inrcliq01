import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { setUserHandle } from "@/lib/feed/set-user-handle";

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
        data: { onboardingStep: "interests" },
      });
      return NextResponse.json({ ok: true, redirectTo: "/onboarding/interests" });
    }

    const rawHandle = typeof body.handle === "string" ? body.handle : "";
    const result = await setUserHandle(user.id, rawHandle);
    if (!result.ok) {
      const status = result.error === "This handle is already taken." ? 409 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { onboardingStep: "interests" },
    });

    return NextResponse.json({ ok: true, redirectTo: "/onboarding/interests" });
  } catch (error) {
    console.error("onboarding/handle error", error);
    return NextResponse.json({ error: "Unable to save handle." }, { status: 500 });
  }
}
