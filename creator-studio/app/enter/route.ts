import { NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";
import { STUDIO_SPLASH_COOKIE } from "../../lib/splash";
import { hashLaunchCode, issueStudioSession, STUDIO_COOKIE } from "../../lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code")?.trim() ?? "";
  const home = new URL("/", request.url);
  if (!/^[a-f0-9]{64}$/.test(code)) return NextResponse.redirect(home);

  const claimed = await prisma.studioLaunchCode.updateMany({
    where: { codeHash: hashLaunchCode(code), usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  if (claimed.count !== 1) return NextResponse.redirect(home);

  const launch = await prisma.studioLaunchCode.findUnique({
    where: { codeHash: hashLaunchCode(code) },
    select: { userId: true },
  });
  if (!launch) return NextResponse.redirect(home);

  const session = await issueStudioSession(launch.userId);
  const response = NextResponse.redirect(home);
  response.cookies.set(STUDIO_COOKIE, session.sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: session.expires,
  });
  response.cookies.set(STUDIO_SPLASH_COOKIE, "1", {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 30,
  });
  return response;
}
