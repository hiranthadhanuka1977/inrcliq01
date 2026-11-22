import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth/credentials";
import { findValidPasswordChangeCode } from "@/lib/auth/password-change-code";
import { requireSessionUser } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { parseLoginCode, parsePassword } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const { user, error } = await requireSessionUser();
    if (error) return error;

    const body = await request.json();
    const parsedCode = parseLoginCode(body.code);
    if (!parsedCode.success) {
      return NextResponse.json(
        { error: parsedCode.error.issues[0]?.message ?? "Please enter the 6-digit code." },
        { status: 400 },
      );
    }

    const parsedPassword = parsePassword(body.password);
    if (!parsedPassword.success) {
      return NextResponse.json(
        { error: parsedPassword.error.issues[0]?.message ?? "Invalid password." },
        { status: 400 },
      );
    }

    if (body.password !== body.confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
    }

    const record = await findValidPasswordChangeCode(user.id, parsedCode.data);
    if (!record) {
      return NextResponse.json({ error: "That code is incorrect or has expired." }, { status: 400 });
    }

    const passwordHash = await hashPassword(parsedPassword.data);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      prisma.passwordChangeCode.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/feed/me/password/change error", err);
    return NextResponse.json({ error: "Unable to update the password." }, { status: 500 });
  }
}
