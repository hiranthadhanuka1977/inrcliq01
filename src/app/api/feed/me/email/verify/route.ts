import { NextRequest, NextResponse } from "next/server";
import { confirmEmailChange } from "@/lib/feed/email-change";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";

  try {
    const result = await confirmEmailChange(token);
    if (!result.ok) {
      const error = result.reason === "taken" ? "taken" : "invalid";
      return NextResponse.redirect(new URL(`/feed/me/edit/email?error=${error}`, request.url));
    }

    return NextResponse.redirect(new URL("/feed/me/edit?email=updated", request.url));
  } catch (error) {
    console.error("GET /api/feed/me/email/verify error", error);
    return NextResponse.redirect(new URL("/feed/me/edit/email?error=invalid", request.url));
  }
}
