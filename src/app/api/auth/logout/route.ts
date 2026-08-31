import { NextResponse } from "next/server";
import { destroySession } from "@/lib/session";
import { isLiveBackend } from "@/lib/backend/config";
import { liveLogout } from "@/lib/backend/routes";

export async function POST(request: Request) {
  if (isLiveBackend()) return liveLogout(request);

  try {
    await destroySession();
    return NextResponse.json({ ok: true, redirectTo: "/" });
  } catch (error) {
    console.error("auth/logout error", error);
    return NextResponse.json({ error: "Unable to log out." }, { status: 500 });
  }
}
