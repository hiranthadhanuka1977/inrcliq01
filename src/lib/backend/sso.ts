import { createHash, randomBytes } from "crypto";

/**
 * Browser half of the SSO flow.
 *
 * Keycloak brokers Google and Apple: it holds the provider credentials, runs the
 * consent screen, and hands back a code. Two codes exist in this flow and are
 * easy to confuse — Google's, which only Keycloak ever sees, and Keycloak's,
 * which is the one we forward to the API. Nothing here talks to Google.
 *
 * `inrcliq-frontend` is a public client, so there is no secret to protect; PKCE
 * is what stops an intercepted code from being redeemed by anyone else.
 */

export const SSO_VERIFIER_COOKIE = "inrcliq_sso_verifier";
export const SSO_PENDING_COOKIE = "inrcliq_sso_pending";

/** The verifier only has to outlive one consent screen. */
export const SSO_VERIFIER_MAX_AGE = 10 * 60;
/** Matches the API's 10-minute ssoToken — no point outliving it. */
export const SSO_PENDING_MAX_AGE = 10 * 60;

export type SsoProvider = "google" | "apple";

export interface PendingSsoRegistration {
  ssoToken: string;
  email: string;
  name?: string;
  provider: SsoProvider;
  /** Carried through registration so logout can end the SSO session it created. */
  idToken?: string;
}

function base64url(input: Buffer) {
  return input.toString("base64url");
}

/** RFC 7636: a random verifier, and the SHA-256 challenge derived from it. */
export function createPkcePair() {
  const codeVerifier = base64url(randomBytes(32));
  const codeChallenge = base64url(createHash("sha256").update(codeVerifier).digest());
  return { codeVerifier, codeChallenge };
}

export function ssoConfig() {
  const url = (process.env.NEXT_PUBLIC_KEYCLOAK_URL ?? "http://localhost:8080").replace(/\/$/, "");
  const realm = process.env.NEXT_PUBLIC_KEYCLOAK_REALM ?? "inrcliq";
  const clientId = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID ?? "inrcliq-frontend";
  const redirectUri = process.env.NEXT_PUBLIC_SSO_REDIRECT_URI ?? "http://localhost:3002/auth/callback";
  return { url, realm, clientId, redirectUri };
}

/**
 * Where the browser goes to start the flow. `kc_idp_hint` is what skips
 * Keycloak's own login form and lands the user straight on Google's consent
 * screen — without it they would see a Keycloak username box first.
 */
export function authorizeUrl(provider: SsoProvider, codeChallenge: string) {
  const { url, realm, clientId, redirectUri } = ssoConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid profile email",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    kc_idp_hint: provider,
  });
  return `${url}/realms/${realm}/protocol/openid-connect/auth?${params.toString()}`;
}

/**
 * Where to send the browser to end its Keycloak SSO session.
 *
 * Revoking our own refresh token is not enough: the session that makes Keycloak
 * say "I already know you" lives in a cookie on *its* origin, and survives
 * anything we do on ours. Until the browser visits this URL, the next
 * "Continue with Google" silently signs the same person straight back in.
 *
 * `id_token_hint` is what makes it silent. Without it Keycloak renders a
 * "Do you want to log out?" interstitial and leaves the session running — so a
 * session we cannot prove ownership of is better sent home than half-ended.
 */
export function endSessionUrl(idToken: string | undefined, postLogoutRedirect: string) {
  if (!idToken) return postLogoutRedirect;

  const { url, realm } = ssoConfig();
  const params = new URLSearchParams({
    id_token_hint: idToken,
    post_logout_redirect_uri: postLogoutRedirect,
  });
  return `${url}/realms/${realm}/protocol/openid-connect/logout?${params.toString()}`;
}
