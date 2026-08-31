import { NextRequest, NextResponse } from "next/server";
import { isLiveBackend } from "@/lib/backend/config";
import { SSO_VERIFIER_COOKIE, SSO_VERIFIER_MAX_AGE, authorizeUrl, createPkcePair, type SsoProvider } from "@/lib/backend/sso";

/**
 * GET /api/auth/sso/start?provider=google
 *
 * Begins the consent round trip. The PKCE verifier is parked in an httpOnly
 * cookie rather than sessionStorage so the callback — a route handler, with no
 * access to browser storage — can read it back.
 */
export async function GET(request: NextRequest) {
  if (!isLiveBackend()) {
    // The mock has no identity provider to broker; fall back to the demo signup.
    return NextResponse.redirect(new URL("/signup", request.url));
  }

  const requested = request.nextUrl.searchParams.get("provider");
  const provider: SsoProvider = requested === "apple" ? "apple" : "google";

  const { codeVerifier, codeChallenge } = createPkcePair();
  const response = NextResponse.redirect(authorizeUrl(provider, codeChallenge));

  response.cookies.set(SSO_VERIFIER_COOKIE, codeVerifier, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SSO_VERIFIER_MAX_AGE,
  });

  return response;
}
