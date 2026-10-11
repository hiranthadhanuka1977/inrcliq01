import { NextResponse } from "next/server";
import { ADMIN_ACCESS_COOKIE, ADMIN_ACCESS_MAX_AGE_SECONDS } from "@/lib/admin-portal/access";
import { SETTINGS_ACCESS_PASSWORD } from "@/lib/settings/access";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { password?: string };
    const password = body.password?.trim() ?? "";

    if (password !== SETTINGS_ACCESS_PASSWORD) {
      return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_ACCESS_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: ADMIN_ACCESS_MAX_AGE_SECONDS,
    });
    return response;
  } catch (error) {
    console.error("admin-portal/unlock error", error);
    return NextResponse.json({ error: "Unable to unlock the admin portal." }, { status: 500 });
  }
}
