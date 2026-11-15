import { NextResponse } from "next/server";
import { mainOrigin } from "../../../lib/main";
import { SELLER_PRO_COOKIE, SELLER_PRO_NAME_COOKIE } from "../../../lib/session";
import { SELLER_PRO_SPLASH_COOKIE } from "../../../lib/splash";

export const dynamic = "force-dynamic";

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/seller-pro") || value.startsWith("//") || value.includes("\\")) {
    return "/seller-pro";
  }
  return value;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code")?.trim() ?? "";
  const next = safeNext(url.searchParams.get("next"));
  const home = new URL("/seller-pro", request.url);
  if (!/^[a-f0-9]{64}$/.test(code)) return NextResponse.redirect(home);

  let payload: { sessionToken?: string; expires?: string; displayName?: string } | null = null;
  try {
    const exchange = await fetch(`${mainOrigin()}/api/seller-pro/exchange`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
      cache: "no-store",
    });
    payload = (await exchange.json().catch(() => null)) as typeof payload;
    if (!exchange.ok || !payload?.sessionToken) return NextResponse.redirect(home);
  } catch {
    return NextResponse.redirect(home);
  }

  const expires = payload.expires ? new Date(payload.expires) : new Date(Date.now() + 12 * 60 * 60 * 1000);
  const response = NextResponse.redirect(new URL(next, request.url));
  const cookie = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  };
  response.cookies.set(SELLER_PRO_COOKIE, payload.sessionToken, cookie);
  response.cookies.set(
    SELLER_PRO_NAME_COOKIE,
    encodeURIComponent(payload.displayName || "Seller"),
    cookie,
  );
  response.cookies.set(SELLER_PRO_SPLASH_COOKIE, "1", {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 30,
  });
  return response;
}
