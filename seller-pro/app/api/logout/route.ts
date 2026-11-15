import { NextResponse } from "next/server";
import { mainOrigin } from "../../../lib/main";
import { getSellerProSession, SELLER_PRO_COOKIE, SELLER_PRO_NAME_COOKIE } from "../../../lib/session";

export const dynamic = "force-dynamic";

function clearCookie(response: NextResponse, name: string) {
  response.cookies.set(name, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
}

export async function POST(request: Request) {
  const session = await getSellerProSession();
  if (session) {
    await fetch(`${mainOrigin()}/api/auth/logout`, {
      method: "POST",
      headers: { cookie: `inrcliq_session=${session.token}` },
      cache: "no-store",
    }).catch(() => undefined);
  }

  const response = NextResponse.redirect(new URL("/seller-pro", request.url), 303);
  clearCookie(response, SELLER_PRO_COOKIE);
  clearCookie(response, SELLER_PRO_NAME_COOKIE);
  return response;
}
