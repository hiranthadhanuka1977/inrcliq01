import { NextResponse } from "next/server";
import { SESSION_COOKIE, destroySession } from "@/lib/session";
import { SETTINGS_RESET_ENABLED } from "@/lib/settings/access";
import { resetAllSettingsUsers } from "@/lib/settings/users";

export async function POST() {
  if (!SETTINGS_RESET_ENABLED) {
    return NextResponse.json({ error: "Reset is disabled." }, { status: 403 });
  }

  try {
    await resetAllSettingsUsers();
    await destroySession();

    const response = NextResponse.json({ ok: true, redirectTo: "/" });
    response.cookies.set(SESSION_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    });

    return response;
  } catch (err) {
    console.error("settings/reset POST error", err);
    return NextResponse.json({ error: "Unable to reset platform data." }, { status: 500 });
  }
}