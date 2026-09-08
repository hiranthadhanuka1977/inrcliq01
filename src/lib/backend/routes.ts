import { NextRequest, NextResponse } from "next/server";
import { callBackend } from "./client";
import { errorCopy, redirectForUser, splitName, toAccountType } from "./mappers";
import {
  clearBackendSession,
  getBackendUser,
  readPendingConsentSession,
  setBackendSession,
  type BackendUser,
  type PendingConsentSession,
} from "./session";
import { SSO_PENDING_COOKIE, endSessionUrl, type PendingSsoRegistration } from "./sso";
import { currentDestination } from "./destination";
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

  if (!result.ok) {
    // Not a failure: the address is verified, so there is nothing left to send.
    // It happens whenever the link is opened in another tab and this one is
    // still sitting on step 3 — common, and reporting it in red tells the user
    // something went wrong when in fact they are finished with this step.
    if (result.errorCode === "EMAIL_ALREADY_VERIFIED") {
      // Send them where they actually belong. Verifying in another tab of this
      // browser leaves a session behind, so a minor lands on the parent-email
      // or waiting screen rather than being told to log in again; someone who
      // verified on another device has no session and does go to login.
      return NextResponse.json({
        ok: true,
        email,
        alreadyVerified: true,
        redirectTo: (await currentDestination()) ?? "/",
      });
    }
    return fail(result.errorCode, result.message, result.status);
  }

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
    /** Minors only — the consent-scoped token that stands in for a session. */
    pendingConsentToken?: string;
    guardianConsent?: { status: string; guardianEmail: string } | null;
    email: string;
    name: string;
  }>("/auth/verify-email", { method: "POST", body: { token } });

  if (!result.ok) {
    // A single-use token consumed by a GET is not safe against repeats: a browser
    // prerender, a refresh, a second click or a mail scanner all replay the link.
    // The first request verifies the account and the second gets TOKEN_ALREADY_USED
    // — reporting that as "invalid or expired" tells the user their verification
    // failed when it actually succeeded. Send them to log in instead.
    if (result.errorCode === "TOKEN_ALREADY_USED") {
      // The first click verified them, so send them where that left them —
      // which for a minor is the parent-email or waiting screen, not a login
      // form they have no reason to see. Only someone with no session here
      // (they verified on another device) actually needs to log in.
      const destination = await currentDestination();
      return NextResponse.redirect(new URL(destination ?? "/?verified=already", request.url));
    }
    return NextResponse.redirect(new URL("/verify-email?error=invalid", request.url));
  }

  // A minor lands here with no session at all — a PENDING_GUARDIAN account
  // cannot log in. What they get instead is a consent-scoped token, which is
  // what the parent-email and waiting screens run on. Park it like a session so
  // those routes can find it.
  if (result.data.pendingConsentToken) {
    await setBackendSession({
      pendingConsentToken: result.data.pendingConsentToken,
      userId: result.data.userId,
      email: result.data.email,
      firstName: result.data.name?.split(/\s+/)[0] ?? "",
    });

    // No guardian named yet is a different screen from waiting on one.
    const minorDestination = result.data.guardianConsent ? "/onboarding/waiting" : "/onboarding/parent";
    return NextResponse.redirect(new URL(minorDestination, request.url));
  }

  if (result.data.accessToken && result.data.refreshToken) {
    await startSession(result.data as Session, result.data.userId);
  }

  // autoLogin false means the account is verified but has no session — the user
  // has to log in before any onboarding screen will work. The login form lives on
  // the root page; there is no /login route.
  const destination = !result.data.autoLogin ? "/" : "/onboarding/password";

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

/**
 * A login that lands on the guardian journey instead of a session.
 *
 * A minor awaiting approval authenticates like anyone else, but gets a
 * consent-scoped token rather than an access token — so the ordinary path here
 * would store a session with an undefined token and route them to the feed they
 * cannot open. Detected by `pendingConsentToken`, not by status code: the API
 * answers 201 either way, because from its side nothing went wrong.
 */
type PendingConsentLogin = {
  nextStep: string;
  pendingConsentToken: string;
  userId: string;
  email: string;
  name: string;
};

function isPendingConsentLogin(data: unknown): data is PendingConsentLogin {
  return typeof (data as PendingConsentLogin)?.pendingConsentToken === "string";
}

/** Parks the consent token as a session and says where the minor belongs. */
async function enterGuardianJourney(data: PendingConsentLogin) {
  await setBackendSession({
    pendingConsentToken: data.pendingConsentToken,
    userId: data.userId,
    email: data.email,
    firstName: data.name?.split(/\s+/)[0] ?? "",
  });

  // Read the destination back through the shared rule rather than mapping
  // nextStep here, so this agrees with the landing page and the session route.
  return NextResponse.json({ ok: true, redirectTo: (await currentDestination()) ?? "/onboarding/parent" });
}

export async function liveVerifyLoginCode(request: Request) {
  const { email, code } = (await request.json()) as { email: string; code: string };
  const result = await callBackend<(BackendUser & Session) | PendingConsentLogin>("/auth/login/verify-code", {
    method: "POST",
    body: { email, code },
  });

  if (!result.ok) return fail(result.errorCode, result.message, result.status);
  if (isPendingConsentLogin(result.data)) return enterGuardianJourney(result.data);

  const session = result.data as BackendUser & Session;
  await startSession(session, session.userId);
  return NextResponse.json({ ok: true, redirectTo: await redirectAfterLogin(session.accessToken) });
}

export async function liveLoginPassword(request: Request) {
  const { email, password } = (await request.json()) as { email: string; password: string };
  const result = await callBackend<(BackendUser & Session) | PendingConsentLogin>("/auth/login", {
    method: "POST",
    body: { emailOrUsername: email, password },
  });

  if (!result.ok) return fail(result.errorCode, result.message, result.status);
  // Not reachable today — a minor cannot hold a password, since password setup
  // happens after approval — but the two login paths should not diverge.
  if (isPendingConsentLogin(result.data)) return enterGuardianJourney(result.data);

  const session = result.data as BackendUser & Session;
  await startSession(session, session.userId);
  return NextResponse.json({ ok: true, redirectTo: await redirectAfterLogin(session.accessToken) });
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
  const pending = await readPendingConsentSession();
  if (pending) {
    return NextResponse.json({
      authenticated: true,
      user: { email: pending.email, firstName: pending.firstName, lastName: "", onboardingStep: "GUARDIAN_CONSENT" },
      redirectTo: (await currentDestination()) ?? "/onboarding/parent",
    });
  }

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

// ── Guardian approval ───────────────────────────────────────────────────────
//
// The guardian journey is unauthenticated by design: the parent arrives from a
// link in their inbox with no account and no session, and the token in that
// link is the whole credential. So none of these attach a Bearer — they pass
// the token straight through, exactly as the mock routes did.

/** GET /api/guardian/context?token=… */
export async function liveGuardianContext(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")?.trim() ?? "";
  if (!token) return NextResponse.json({ error: "Missing approval token." }, { status: 400 });

  // A guardian who happens to be signed in is shown their own account instead
  // of being asked to create a second one for the same address.
  const current = await getBackendUser();

  const result = await callBackend<Record<string, unknown>>(
    `/guardian/context?token=${encodeURIComponent(token)}`,
    current ? { token: current.session.accessToken } : {},
  );

  if (!result.ok) {
    // A used link and a bad link are different problems for the guardian: one
    // means "you already did this", the other "this never worked".
    const status = result.errorCode.startsWith("CONSENT_ALREADY_") ? 409 : result.status;
    return NextResponse.json({ error: errorCopy(result.errorCode, result.message) }, { status });
  }

  return NextResponse.json(result.data);
}

/** GET /api/guardian/protection-tiers?childFirstName=… */
export async function liveProtectionTiers(request: NextRequest) {
  const childFirstName = request.nextUrl.searchParams.get("childFirstName") ?? "";
  const query = childFirstName ? `?childFirstName=${encodeURIComponent(childFirstName)}` : "";
  const result = await callBackend<{ tiers: unknown[] }>(`/guardian/protection-tiers${query}`);
  if (!result.ok) return fail(result.errorCode, result.message, result.status);
  return NextResponse.json(result.data);
}

/** POST /api/guardian/account */
export async function liveGuardianAccount(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  const result = await callBackend("/guardian/account", { method: "POST", body });
  if (!result.ok) return fail(result.errorCode, result.message, result.status);
  return NextResponse.json({ ok: true, ...(result.data as object) });
}

/** POST /api/guardian/identity/{id-capture|face-capture|submit} */
export async function liveGuardianIdentity(request: Request, step: "id-capture" | "face-capture" | "submit") {
  const body = (await request.json()) as Record<string, unknown>;
  const result = await callBackend(`/guardian/identity/${step}`, { method: "POST", body });
  if (!result.ok) return fail(result.errorCode, result.message, result.status);
  return NextResponse.json(result.data as object);
}

/** POST /api/guardian/quick-approve */
export async function liveGuardianQuickApprove(request: Request) {
  const { token } = (await request.json()) as { token: string };
  const result = await callBackend("/guardian/quick-approve", { method: "POST", body: { token } });
  if (!result.ok) return fail(result.errorCode, result.message, result.status);
  return NextResponse.json({ ok: true, ...(result.data as object) });
}

/** POST /api/guardian/complete */
export async function liveGuardianComplete(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  const result = await callBackend("/guardian/complete", { method: "POST", body });
  if (!result.ok) return fail(result.errorCode, result.message, result.status);
  return NextResponse.json({ ok: true, ...(result.data as object) });
}

/** POST /api/guardian/decline */
export async function liveGuardianDecline(request: Request) {
  const { token } = (await request.json()) as { token: string };
  const result = await callBackend<{ childFirstName: string }>("/guardian/decline", {
    method: "POST",
    body: { token },
  });
  if (!result.ok) return fail(result.errorCode, result.message, result.status);
  return NextResponse.json({ ok: true, childFirstName: result.data.childFirstName });
}

// ── Minor side of the guardian flow ─────────────────────────────────────────
//
// A PENDING_GUARDIAN minor holds a pending-consent token rather than an access
// token: it is accepted on /consent/* and nowhere else. These routes read it
// from the session cookie and send it as the Bearer.

async function requirePendingConsent(): Promise<
  { session: PendingConsentSession } | { error: NextResponse }
> {
  const session = await readPendingConsentSession();
  if (!session) {
    return { error: NextResponse.json({ error: "Please log in." }, { status: 401 }) };
  }
  return { session };
}

/** POST /api/onboarding/parent-invite */
export async function liveParentInvite(request: Request) {
  const auth = await requirePendingConsent();
  if ("error" in auth) return auth.error;

  const { parentEmail } = (await request.json()) as { parentEmail: string };

  if (parentEmail?.trim().toLowerCase() === auth.session.email.toLowerCase()) {
    return NextResponse.json(
      { error: "Please enter your parent or guardian's email, not your own." },
      { status: 400 },
    );
  }

  const result = await callBackend<{ status: string; guardianEmail: string; expiresAt: string }>(
    "/consent/initiate",
    { method: "POST", token: auth.session.pendingConsentToken, body: { guardianEmail: parentEmail } },
  );

  if (!result.ok) return fail(result.errorCode, result.message, result.status);

  // No approveUrl in live mode — the link exists only in the delivered email,
  // so the prototype's inbox popover has nothing to show. That is the intended
  // difference: real mail replaces the simulated inbox.
  return NextResponse.json({ ok: true, redirectTo: "/onboarding/waiting", parentEmail: result.data.guardianEmail });
}

/** POST /api/onboarding/parent-invite/resend */
export async function liveParentInviteResend() {
  const auth = await requirePendingConsent();
  if ("error" in auth) return auth.error;

  const result = await callBackend("/consent/resend-invite", {
    method: "POST",
    token: auth.session.pendingConsentToken,
  });
  if (!result.ok) return fail(result.errorCode, result.message, result.status);
  return NextResponse.json({ ok: true });
}

/** GET /api/onboarding/parent-invite/resend — the waiting page's poll. */
export async function liveParentInviteStatus() {
  const auth = await requirePendingConsent();
  if ("error" in auth) return auth.error;

  const result = await callBackend<{
    status: string;
    guardianEmail: string;
    consentRequestedAt: string;
    consentExpiresAt: string;
    resendLockRemainingSeconds: number | null;
  }>("/consent/status", { token: auth.session.pendingConsentToken });

  // No consent yet is not an error — it is the "you have not named anyone"
  // state, which the parent step handles.
  if (!result.ok && result.errorCode === "CONSENT_NOT_FOUND") {
    return NextResponse.json({ status: null });
  }
  if (!result.ok) return fail(result.errorCode, result.message, result.status);

  return NextResponse.json({
    // The API says DENIED where the prototype's components say DECLINED.
    status: result.data.status === "DENIED" ? "DECLINED" : result.data.status,
    parentEmail: result.data.guardianEmail,
    sentAt: result.data.consentRequestedAt,
    expiresAt: result.data.consentExpiresAt,
    childFirstName: auth.session.firstName,
    cooldownRemaining: result.data.resendLockRemainingSeconds ?? 0,
  });
}

/**
 * POST /api/onboarding/acknowledge-approval
 *
 * The approved screen's Continue button. This is where a minor stops holding a
 * consent-only token and gets a real session, so the swap has to be persisted
 * before the next onboarding screen asks for a Bearer.
 */
export async function liveAcknowledgeApproval() {
  const auth = await requirePendingConsent();
  if ("error" in auth) return auth.error;

  const result = await callBackend<{
    nextStep: string;
    autoLogin: boolean;
    accessToken?: string;
    refreshToken?: string;
  }>("/consent/acknowledge-approval", { method: "POST", token: auth.session.pendingConsentToken });

  if (!result.ok) return fail(result.errorCode, result.message, result.status);

  return finishConsentExit(result.data, auth.session.userId);
}

/** POST /api/onboarding/fix-age — "that's the wrong date of birth". */
export async function liveFixAge() {
  const auth = await requirePendingConsent();
  if ("error" in auth) return auth.error;

  const result = await callBackend<{
    nextStep: string;
    autoLogin: boolean;
    accessToken?: string;
    refreshToken?: string;
  }>("/consent/fix-age", { method: "POST", token: auth.session.pendingConsentToken });

  if (!result.ok) return fail(result.errorCode, result.message, result.status);

  return finishConsentExit(result.data, auth.session.userId);
}

/**
 * Both ways out of the pending-consent state end the same way: exchange the
 * consent-only session for a real one and route to the step the API named.
 *
 * `autoLogin: false` means the account is fine but no session could be minted.
 * Sending them to an onboarding screen would only 401, so they go to the login
 * page — which lives at "/", there being no /login route.
 */
async function finishConsentExit(
  data: { nextStep: string; autoLogin: boolean; accessToken?: string; refreshToken?: string },
  userId: string,
) {
  if (!data.autoLogin || !data.accessToken || !data.refreshToken) {
    await clearBackendSession();
    return NextResponse.json({ ok: true, redirectTo: "/" });
  }

  await setBackendSession({ accessToken: data.accessToken, refreshToken: data.refreshToken, userId });

  const destination = data.nextStep === "HANDLE_SETUP" ? "/onboarding/handle" : "/onboarding/password";
  return NextResponse.json({ ok: true, redirectTo: destination });
}
