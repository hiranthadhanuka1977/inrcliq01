import { NextRequest, NextResponse } from "next/server";
import { consumeChildContinueToken } from "@/lib/auth/parent-invite";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/?error=missing_continue", request.url));
  }

  try {
    const result = await consumeChildContinueToken(token);

    if (!result.ok) {
      return NextResponse.redirect(new URL("/?error=invalid_continue", request.url));
    }

    return NextResponse.redirect(new URL(result.redirectTo, request.url));
  } catch (error) {
    console.error("continue-approval error", error);
    return NextResponse.redirect(new URL("/?error=invalid_continue", request.url));
  }
}
