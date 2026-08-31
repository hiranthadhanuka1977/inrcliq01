import { NextResponse } from "next/server";
import { destroySession, SESSION_COOKIE } from "@/lib/session";
import { isLiveBackend } from "@/lib/backend/config";
import { liveLogout } from "@/lib/backend/routes";

export async function POST() {
  if (isLiveBackend()) return liveLogout();

  try {
    await destroySession();

    const response = NextResponse.json({ ok: true, redirectTo: "/" });
    // Also clear on the response — cookies().set alone can fail to attach Set-Cookie
    // in App Router route handlers, leaving middleware thinking the session is still active.
    response.cookies.set(SESSION_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    });

    return response;
  } catch (error) {
    console.error("auth/logout error", error);
    return NextResponse.json({ error: "Unable to log out." }, { status: 500 });
  }
}
