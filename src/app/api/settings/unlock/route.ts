import { NextResponse } from "next/server";
import {
  SETTINGS_ACCESS_COOKIE,
  SETTINGS_ACCESS_MAX_AGE_SECONDS,
  SETTINGS_ACCESS_PASSWORD,
} from "@/lib/settings/access";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { password?: string };
    const password = body.password?.trim() ?? "";

    if (password !== SETTINGS_ACCESS_PASSWORD) {
      return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(SETTINGS_ACCESS_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SETTINGS_ACCESS_MAX_AGE_SECONDS,
    });

    return response;
  } catch (err) {
    console.error("settings/unlock POST error", err);
    return NextResponse.json({ error: "Unable to unlock settings." }, { status: 500 });
  }
}
