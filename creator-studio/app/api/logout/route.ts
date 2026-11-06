import { NextResponse } from "next/server";
import { destroyStudioSession, STUDIO_COOKIE } from "../../../lib/session";

export async function POST(request: Request) {
  await destroyStudioSession();
  const response = NextResponse.redirect(new URL("/", request.url), 303);
  response.cookies.set(STUDIO_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
