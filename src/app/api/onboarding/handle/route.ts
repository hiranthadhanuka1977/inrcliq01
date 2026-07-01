import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { parseHandle } from "@/lib/validation";

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

    const parsed = parseHandle(body.handle);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid handle." },
        { status: 400 },
      );
    }

    const handle = parsed.data;
    const existing = await prisma.user.findFirst({
      where: {
        handle: { equals: handle, mode: "insensitive" },
        NOT: { id: user.id },
      },
    });

    if (existing && existing.id !== user.id) {
      return NextResponse.json({ error: "This handle is already taken." }, { status: 409 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        handle,
        onboardingStep: "interests",
      },
    });
    return NextResponse.json({ ok: true, redirectTo: "/onboarding/interests" });
  } catch (error) {
    console.error("onboarding/handle error", error);
    return NextResponse.json({ error: "Unable to save handle." }, { status: 500 });
  }
}
