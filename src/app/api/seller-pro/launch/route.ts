import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/seller-pro") || value.startsWith("//") || value.includes("\\")) {
    return "/seller-pro";
  }
  return value;
}

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user || user.suspendedAt) {
    return NextResponse.redirect(new URL("/seller", request.url));
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

  const next = safeNext(new URL(request.url).searchParams.get("next"));
  const origin = (process.env.SELLER_PRO_ORIGIN || "http://localhost:3011").replace(/\/$/, "");
  const target = new URL("/seller-pro/enter", origin);
  target.searchParams.set("code", code);
  target.searchParams.set("next", next);
  return NextResponse.redirect(target);
}
