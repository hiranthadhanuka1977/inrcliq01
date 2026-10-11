import { NextResponse } from "next/server";
import { ADMIN_ACCESS_COOKIE } from "@/lib/admin-portal/access";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_ACCESS_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
