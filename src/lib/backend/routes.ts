import { NextRequest, NextResponse } from "next/server";
import { callBackend } from "./client";
import { errorCopy, redirectForUser, splitName, toAccountType } from "./mappers";
import {
  clearBackendSession,
  getBackendUser,
  setBackendSession,
  type BackendUser,
} from "./session";
import { SSO_PENDING_COOKIE, endSessionUrl, type PendingSsoRegistration } from "./sso";
import { cookies } from "next/headers";

/**
 * Live-mode implementations of the prototype's auth and onboarding routes.
 *
 * Each mirrors the response shape its mock counterpart returns, so the React
 * components are unaware of which backend answered them.
 */

type Session = { accessToken: string; refreshToken: string; userId?: string; idToken?: string | null };

function fail(errorCode: string, message: string, status: number, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error: errorCopy(errorCode, message), ...extra }, { status });
}

async function startSession(tokens: Session, userId: string) {
  await setBackendSession({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    userId,
    ...(tokens.idToken ? { idToken: tokens.idToken } : {}),
  });
}

async function requireUser() {
  const current = await getBackendUser();
  if (!current) return { error: NextResponse.json({ error: "Please log in." }, { status: 401 }) } as const;
  return { user: current.user, token: current.session.accessToken } as const;
}

// ── Signup ──────────────────────────────────────────────────────────────────

/**
 * Finishes a signup that began at a provider's consent screen.
 *
 * Google and Apple supply an email and sometimes a name, never a date of birth
 * or a country — and those two decide the compliance outcome. The signup form
 * collects them, then the short-lived ssoToken parked by /auth/callback is
 * redeemed here. No password is involved: the provider already proved who this
 * is, so onboarding starts at the handle step.
 */
async function completeSsoSignup(
  pending: PendingSsoRegistration,
  fields: { firstName?: string; lastName?: string; dateOfBirth: string; country: string },
) {
  const result = await callBackend<{
    accessToken: string;
    refreshToken: string;
    userId: string;
    onboardingStep: string;
    accountState: string;
  }>("/auth/sso-register", {
    method: "POST",
    body: {
      ssoToken: pending.ssoToken,
      ...(fields.firstName ? { firstName: fields.firstName } : {}),
      ...(fields.lastName ? { lastName: fields.lastName } : {}),
      dateOfBirth: fields.dateOfBirth,
      countryOfResidence: fields.country,
      termsAccepted: true,
    },
  });

  const jar = await cookies();
  jar.delete(SSO_PENDING_COOKIE);

  if (!result.ok) return fail(result.errorCode, result.message, result.status);

  await startSession({ ...result.data, idToken: pending.idToken }, result.data.userId);

  // The provider vouched for the address, so there is no verification step to
  // send them to — reuse the "skip verification" contract the form already
  // understands and route straight into onboarding.
  return NextResponse.json({
    ok: true,
    skipVerification: true,
    redirectTo: redirectForUser({ ...(result.data as unknown as BackendUser), emailVerified: true }),
    email: pending.email,
  });
}

async function readPendingSso(): Promise<PendingSsoRegistration | null> {
  const raw = (await cookies()).get(SSO_PENDING_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PendingSsoRegistration;
    return parsed.ssoToken ? parsed : null;
  } catch {
    return null;
  }
}

export async function liveSignupJoin(request: Request) {
  const body = (await request.json()) as Record<string, string>;
  const { firstName, lastName, email, month, day, year, country } = body;

  // The API takes an ISO date; the prototype's form collects three fields.
  const dateOfBirth = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  // Same form, two origins: a plain signup registers an email, while one that
  // began at Google finishes a registration Keycloak has already authenticated.
  const pending = await readPendingSso();
  if (pending) {
    return completeSsoSignup(pending, { firstName, lastName, dateOfBirth, country });
  }

  const result = await callBackend<{ userId: string; ageZone: string; accountState: string }>("/auth/register", {
    method: "POST",
    body: {
      email,
      firstName,
      lastName,
      dateOfBirth,
      countryOfResidence: country,
      termsAccepted: true,
    },
  });

  if (!result.ok) return fail(result.errorCode, result.message, result.status);

  return NextResponse.json({
    ok: true,
    email: String(email).toLowerCase(),
    accountType: toAccountType(result.data.ageZone),
    userId: result.data.userId,
    // No verifyUrl in live mode — the link only exists in the delivered email.
  });
}

export async function liveResendVerification(request: Request) {
  const { email } = (await request.json()) as { email: string };
  const result = await callBackend("/auth/resend-verification", { method: "POST", body: { email } });
  if (!result.ok) return fail(result.errorCode, result.message, result.status);
  return NextResponse.json({ ok: true, email });
}

/** GET /api/auth/verify-email?token=… — the API verifies by POST, so translate. */
export async function liveVerifyEmail(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.redirect(new URL("/verify-email?error=missing", request.url));

  const result = await callBackend<{
    userId: string;
    accountState: string;
    nextStep: string;
    autoLogin: boolean;
    accessToken?: string;
    refreshToken?: string;
  }>("/auth/verify-email", { method: "POST", body: { token } });

  if (!result.ok) {
    // A single-use token consumed by a GET is not safe against repeats: a browser
    // prerender, a refresh, a second click or a mail scanner all replay the link.
    // The first request verifies the account and the second gets TOKEN_ALREADY_USED
    // — reporting that as "invalid or expired" tells the user their verification
    // failed when it actually succeeded. Send them to log in instead.
    if (result.errorCode === "TOKEN_ALREADY_USED") {
      return NextResponse.redirect(new URL("/?verified=already", request.url));
    }
    return NextResponse.redirect(new URL("/verify-email?error=invalid", request.url));
  }

  if (result.data.accessToken && result.data.refreshToken) {
    await startSession(result.data as Session, result.data.userId);
  }

  // autoLogin false means the account is verified but has no session — the user
  // has to log in before any onboarding screen will work. The login form lives on
  // the root page; there is no /login route.
  const destination = !result.data.autoLogin
    ? "/"
    : result.data.accountState === "PENDING_GUARDIAN"
      ? "/onboarding/waiting"
      : "/onboarding/password";

  return NextResponse.redirect(new URL(destination, request.url));
}

// ── Login ───────────────────────────────────────────────────────────────────

export async function liveSendLoginCode(request: Request) {
  const { email } = (await request.json()) as { email: string };
  const result = await callBackend<{ sent: boolean; cooldownRemaining: number }>("/auth/login/send-code", {
    method: "POST",
    body: { email },
  });

  if (!result.ok) {
    // The cooldown seconds ride along on 429 so the UI can drive its timer.
    return fail(result.errorCode, result.message, result.status, {
      cooldownRemaining: result.details.cooldownRemaining,
    });
  }

  return NextResponse.json({ ok: true, cooldownRemaining: result.data.cooldownRemaining });
}

export async function liveVerifyLoginCode(request: Request) {
  const { email, code } = (await request.json()) as { email: string; code: string };
  const result = await callBackend<BackendUser & Session>("/auth/login/verify-code", {
    method: "POST",
    body: { email, code },
  });

  if (!result.ok) return fail(result.errorCode, result.message, result.status);

  await startSession(result.data, result.data.userId);
  return NextResponse.json({ ok: true, redirectTo: await redirectAfterLogin(result.data.accessToken) });
}

export async function liveLoginPassword(request: Request) {
  const { email, password } = (await request.json()) as { email: string; password: string };
  const result = await callBackend<BackendUser & Session>("/auth/login", {
    method: "POST",
    body: { emailOrUsername: email, password },
  });

  if (!result.ok) return fail(result.errorCode, result.message, result.status);

  await startSession(result.data, result.data.userId);
  return NextResponse.json({ ok: true, redirectTo: await redirectAfterLogin(result.data.accessToken) });
}

/** Login responses carry no onboarding progress, so read it back before routing. */
async function redirectAfterLogin(token: string): Promise<string> {
  const me = await callBackend<BackendUser>("/users/me", { token });
  return me.ok ? redirectForUser(me.data) : "/feed";
}

export async function liveLogout(request: Request) {
  const current = await getBackendUser();
  if (current) {
    await callBackend("/auth/logout", {
      method: "POST",
      body: { refreshToken: current.session.refreshToken },
    });
  }
  await clearBackendSession();

  // Revoking our token ends *our* session. A user who arrived through Google
  // also has a Keycloak SSO session living in a cookie on Keycloak's origin,
  // which we cannot touch from here — so hand the browser off to Keycloak's
  // end-session endpoint, which drops it and returns the user to the login
  // page. Password and code logins have no such session and go straight home.
  const home = new URL("/", request.url).toString();
  return NextResponse.json({
    ok: true,
    redirectTo: endSessionUrl(current?.session.idToken, home),
  });
}

export async function liveSession() {
  const current = await getBackendUser();
  if (!current) return NextResponse.json({ authenticated: false }, { status: 401 });

  const { firstName, lastName } = splitName(current.user.name);
  return NextResponse.json({
    authenticated: true,
    user: {
      email: current.user.email,
      firstName,
      lastName,
      onboardingStep: current.user.onboardingStep,
    },
    redirectTo: redirectForUser(current.user),
  });
}

// ── Onboarding ──────────────────────────────────────────────────────────────

async function skipTo(token: string, step: string, redirectTo: string) {
  const result = await callBackend("/users/me/onboarding-step", { method: "PATCH", token, body: { step } });
  if (!result.ok) return fail(result.errorCode, result.message, result.status);
  return NextResponse.json({ ok: true, redirectTo });
}

export async function liveOnboardingPassword(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const body = (await request.json()) as { skip?: boolean; password?: string };
  if (body.skip) return skipTo(auth.token, "HANDLE_SETUP", "/onboarding/handle");

  const result = await callBackend("/auth/password", {
    method: "POST",
    token: auth.token,
    body: { password: body.password },
  });
  if (!result.ok) return fail(result.errorCode, result.message, result.status);
  return NextResponse.json({ ok: true, redirectTo: "/onboarding/handle" });
}

export async function liveOnboardingHandle(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const body = (await request.json()) as { skip?: boolean; handle?: string };
  if (body.skip) return skipTo(auth.token, "INTEREST_SELECTION", "/onboarding/interests");

  const result = await callBackend("/users/me/handle", {
    method: "PATCH",
    token: auth.token,
    body: { handle: body.handle },
  });
  if (!result.ok) return fail(result.errorCode, result.message, result.status);
  return NextResponse.json({ ok: true, redirectTo: "/onboarding/interests" });
}

export async function liveOnboardingInterests(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const body = (await request.json()) as { skip?: boolean; interests?: string[] };
  if (body.skip) return skipTo(auth.token, "COMPLETED", "/feed");

  // The UI selects labels ("Music"); the API keys interests by code ("music").
  const codes = (body.interests ?? []).map((value) => value.toLowerCase());
  const result = await callBackend("/users/me/interests", {
    method: "PATCH",
    token: auth.token,
    body: { codes },
  });
  if (!result.ok) return fail(result.errorCode, result.message, result.status);
  return NextResponse.json({ ok: true, redirectTo: "/feed" });
}
