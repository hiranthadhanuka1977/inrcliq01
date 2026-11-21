import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth/credentials";
import { requireSessionUser } from "@/lib/api-helpers";
import { isChosenPassword } from "@/lib/feed/profile-completion";
import { prisma } from "@/lib/prisma";
import { parsePassword } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const { user, error } = await requireSessionUser();
    if (error) return error;

    if (isChosenPassword(user.passwordHash)) {
      return NextResponse.json({ error: "A password is already set." }, { status: 409 });
    }

    const body = await request.json();
    const parsed = parsePassword(body.password);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid password." },
        { status: 400 },
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(parsed.data) },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/feed/me/password error", err);
    return NextResponse.json({ error: "Unable to save password." }, { status: 500 });
  }
}
