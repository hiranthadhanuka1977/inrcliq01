import { NextResponse } from "next/server";
import { listSettingsUsers } from "@/lib/settings/users";

export async function GET() {
  try {
    const users = await listSettingsUsers();
    return NextResponse.json({ users });
  } catch (err) {
    console.error("settings/users GET error", err);
    return NextResponse.json({ error: "Unable to load users." }, { status: 500 });
  }
}