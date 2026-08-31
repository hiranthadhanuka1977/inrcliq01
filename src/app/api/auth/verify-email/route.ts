import { NextRequest, NextResponse } from "next/server";
import { completeEmailVerification } from "@/lib/auth/complete-email-verification";
import { isLiveBackend } from "@/lib/backend/config";
import { liveVerifyEmail } from "@/lib/backend/routes";

export async function GET(request: NextRequest) {
  if (isLiveBackend()) return liveVerifyEmail(request);

  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/verify-email?error=missing", request.url));
  }

  try {
    const result = await completeEmailVerification(token);

    if (!result.ok) {
      return NextResponse.redirect(new URL("/verify-email?error=invalid", request.url));
    }

    return NextResponse.redirect(new URL(result.redirectTo, request.url));
  } catch (error) {
    console.error("verify-email error", error);
    return NextResponse.redirect(new URL("/verify-email?error=invalid", request.url));
  }
}
