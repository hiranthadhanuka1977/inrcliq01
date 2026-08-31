import { NextRequest, NextResponse } from "next/server";
import { callBackend } from "@/lib/backend/client";
import { isLiveBackend } from "@/lib/backend/config";
import { redirectForUser } from "@/lib/backend/mappers";
import { setBackendSession, type BackendUser } from "@/lib/backend/session";
import {
  SSO_PENDING_COOKIE,
  SSO_PENDING_MAX_AGE,
  SSO_VERIFIER_COOKIE,
  ssoConfig,
  type PendingSsoRegistration,
} from "@/lib/backend/sso";

type SsoCallbackResponse =
  | ({ requiresRegistration?: false; accessToken: string; refreshToken: string; idToken?: string | null } & BackendUser)
  | { requiresRegistration: true; ssoToken: string; email: string; name?: string; idToken?: string | null };

/**
 * GET /auth/callback?code=…
 *
 * Where Keycloak returns the browser after the provider's consent screen. The
 * code here is Keycloak's, not Google's — Google's was already redeemed by
 * Keycloak, server to server, and never reaches us.
 */
export async function GET(request: NextRequest) {
  const home = (path: string) => NextResponse.redirect(new URL(path, request.url));

  if (!isLiveBackend()) return home("/");

  const params = request.nextUrl.searchParams;

  // The user pressed "Cancel" on the consent screen, or the provider refused.
  const providerError = params.get("error");
  if (providerError) {
    return home(`/?error=${encodeURIComponent(providerError)}`);
  }

  const code = params.get("code");
  const codeVerifier = request.cookies.get(SSO_VERIFIER_COOKIE)?.value;
  if (!code || !codeVerifier) {
    // No verifier means this was not a flow we started — a stale bookmark, or a
    // cookie that expired while the user sat on the consent screen.
    return home("/?error=sso_expired");
  }

  const { clientId, redirectUri } = ssoConfig();
  const result = await callBackend<SsoCallbackResponse>("/auth/sso-callback", {
    method: "POST",
    // redirectUri and clientId must be byte-identical to the values used to
    // start the flow, or Keycloak refuses the exchange.
    body: { code, codeVerifier, redirectUri, clientId },
  });

  if (!result.ok) {
    return home(`/?error=${encodeURIComponent(result.errorCode.toLowerCase())}`);
  }

  const data = result.data;

  // New to us: Google gave an email and maybe a name, but never a date of birth
  // or country, and those decide the compliance outcome. Park the short-lived
  // ssoToken and let the signup screen collect the rest.
  if (data.requiresRegistration) {
    const pending: PendingSsoRegistration = {
      ssoToken: data.ssoToken,
      email: data.email,
      name: data.name,
      provider: "google",
      // The Keycloak SSO session already exists even though registration is
      // unfinished — keep the proof so logout can end it later.
      ...(data.idToken ? { idToken: data.idToken } : {}),
    };
    const response = home("/signup?sso=google");
    response.cookies.set(SSO_PENDING_COOKIE, JSON.stringify(pending), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SSO_PENDING_MAX_AGE,
    });
    response.cookies.delete(SSO_VERIFIER_COOKIE);
    return response;
  }

  await setBackendSession({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    userId: data.userId,
    ...(data.idToken ? { idToken: data.idToken } : {}),
  });

  // The API refuses SSO login for an unverified account, and the provider's
  // address is trusted (Trust Email on the Keycloak identity provider) — so the
  // account is verified by definition here, even though the SSO responses do
  // not carry the flag. Without this, redirectForUser sends them to /signup.
  const response = home(redirectForUser({ ...data, emailVerified: true }));
  response.cookies.delete(SSO_VERIFIER_COOKIE);
  return response;
}
