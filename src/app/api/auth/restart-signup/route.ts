import { NextResponse } from "next/server";
import { destroySession, SESSION_COOKIE } from "@/lib/session";

/**
 * Clears the browser session and sends the user to /signup.
 * Used by expired-verification "Back to signup" so navigation cannot hang
 * on a client logout fetch or bounce via a leftover session cookie.
 */
export async function GET(request: Request) {
  try {
    await destroySession();
  } catch (error) {
    console.error("auth/restart-signup destroySession error", error);
  }

  const response = NextResponse.redirect(new URL("/signup?restart=1", request.url), 303);
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
  return response;
}
