import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { code?: unknown } | null;
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  if (!/^[a-f0-9]{64}$/.test(code)) {
    return NextResponse.json({ error: "Invalid code." }, { status: 400 });
  }

  const codeHash = createHash("sha256").update(code).digest("hex");
  const claimed = await prisma.studioLaunchCode.updateMany({
    where: { codeHash, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  if (claimed.count !== 1) {
    return NextResponse.json(
      { error: "This link has expired. Open ST v2.0 from Seller Tools again." },
      { status: 401 },
    );
  }

  const launch = await prisma.studioLaunchCode.findUnique({
    where: { codeHash },
    select: { userId: true },
  });
  if (!launch) {
    return NextResponse.json({ error: "Invalid code." }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: launch.userId },
    select: { suspendedAt: true, firstName: true },
  });
  if (!user || user.suspendedAt) {
    return NextResponse.json({ error: "This account cannot open Seller Tools." }, { status: 403 });
  }

  const [profile, creator] = await Promise.all([
    prisma.userProfile.findUnique({
      where: { userId: launch.userId },
      select: { displayName: true },
    }),
    prisma.creatorUser.findFirst({
      where: { userId: launch.userId },
      select: { name: true },
    }),
  ]);

  const sessionToken = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 12 * 60 * 60 * 1000);
  await prisma.session.create({
    data: { sessionToken, userId: launch.userId, expires },
  });

  return NextResponse.json({
    sessionToken,
    expires: expires.toISOString(),
    displayName: profile?.displayName || creator?.name || user.firstName || "Seller",
  });
}
