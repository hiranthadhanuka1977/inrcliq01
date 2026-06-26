import { NextResponse } from "next/server";
import { destroySession } from "@/lib/session";

export async function POST() {
  try {
    await destroySession();
    return NextResponse.json({ ok: true, redirectTo: "/" });
  } catch (error) {
    console.error("auth/logout error", error);
    return NextResponse.json({ error: "Unable to log out." }, { status: 500 });
  }
}
