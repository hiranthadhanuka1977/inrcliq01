import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user || user.suspendedAt) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const code = randomBytes(32).toString("hex");
  const codeHash = createHash("sha256").update(code).digest("hex");
  await prisma.studioLaunchCode.create({
    data: {
      userId: user.id,
      codeHash,
      expiresAt: new Date(Date.now() + 2 * 60 * 1000),
    },
  });

  const studio = (process.env.STUDIO_ORIGIN || "http://localhost:3010").replace(/\/$/, "");
  return NextResponse.redirect(`${studio}/enter?code=${code}`);
}
