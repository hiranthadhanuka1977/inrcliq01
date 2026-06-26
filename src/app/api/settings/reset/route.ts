import { NextResponse } from "next/server";
import { destroySession } from "@/lib/session";
import { resetAllSettingsUsers } from "@/lib/settings/users";

export async function POST() {
  try {
    await resetAllSettingsUsers();
    await destroySession();

    return NextResponse.json({ ok: true, redirectTo: "/" });
  } catch (err) {
    console.error("settings/reset POST error", err);
    return NextResponse.json({ error: "Unable to reset platform data." }, { status: 500 });
  }
}