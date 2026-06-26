import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";

export async function requireSessionUser() {
  const user = await getSessionUser();
  if (!user) {
    return { user: null, error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) };
  }
  return { user, error: null };
}

export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}
