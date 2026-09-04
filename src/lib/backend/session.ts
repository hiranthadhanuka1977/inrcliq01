import { cookies } from "next/headers";
import { callBackend } from "./client";
import { BACKEND_SESSION_COOKIE } from "./config";

/**
 * Live-mode session.
 *
 * Mock mode keeps a session row in the local database; live mode has no such
 * table — the API issues JWTs. Those are parked in their own httpOnly cookie so
 * the two modes never read each other's session and switching BACKEND_MODE
 * cannot resurrect a half-valid session from the other world.
 *
 * Access tokens are short-lived (5 minutes), so every read refreshes on 401.
 */
export { BACKEND_SESSION_COOKIE };
const SESSION_MAX_AGE_DAYS = 30;

export interface BackendSession {
  accessToken: string;
  refreshToken: string;
  userId: string;
  /** SSO logins only — the proof needed to end the Keycloak SSO session. */
  idToken?: string;
}

/**
 * A minor waiting on a guardian.
 *
 * They are not signed in — a PENDING_GUARDIAN account has no access token at
 * all — but they are not anonymous either: they hold a pending-consent token
 * that works on `/consent/*` and nothing else. That is enough to name a
 * guardian, poll for the answer, and continue once it arrives, which is the
 * whole of what those screens do.
 *
 * Kept in the same cookie under its own key, so one read tells a route which of
 * the two kinds of session it has.
 */
export interface PendingConsentSession {
  pendingConsentToken: string;
  userId: string;
  email: string;
  firstName: string;
}

type StoredSession = Partial<BackendSession> & Partial<PendingConsentSession>;

/** Where a minor is in the guardian journey. Null means no invite sent yet. */
export interface GuardianConsentSummary {
  status: "PENDING" | "APPROVED" | "DENIED" | "EXPIRED" | "REVOKED";
  guardianEmail: string;
  requestedAt: string;
  expiresAt: string;
  respondedAt: string | null;
}

export interface BackendUser {
  userId: string;
  username: string;
  name: string;
  email: string;
  accountState: string;
  ageZone: string;
  emailVerified: boolean;
  onboardingStep: string | null;
  onboardingCompletedAt: string | null;
  hasPassword: boolean;
  profilePictureUrl: string | null;
  coverPictureUrl: string | null;
  /**
   * Present for minors only, and null until they name a guardian. Absent for
   * adults. The three states are three different screens, which is why a null
   * has to be distinguishable from an absent key.
   */
  guardianConsent?: GuardianConsentSummary | null;
}

export async function setBackendSession(session: BackendSession | PendingConsentSession) {
  const cookieStore = await cookies();
  cookieStore.set(BACKEND_SESSION_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(Date.now() + SESSION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000),
  });
}

function readStoredSession(raw: string | undefined): StoredSession | null {
  if (!raw) return null;
  try {
    // `cookies().set()` percent-encodes the value on the way out, but
    // `cookies().get()` hands it back exactly as it appeared in the header —
    // still encoded. Decode when it clearly is, so the round trip is symmetric.
    return JSON.parse(raw.startsWith("{") ? raw : decodeURIComponent(raw)) as StoredSession;
  } catch {
    return null;
  }
}

export async function readBackendSession(): Promise<BackendSession | null> {
  const cookieStore = await cookies();
  const parsed = readStoredSession(cookieStore.get(BACKEND_SESSION_COOKIE)?.value);
  if (!parsed?.accessToken || !parsed.refreshToken) return null;
  return parsed as BackendSession;
}

/**
 * The pending-consent session, if that is what the cookie holds.
 *
 * Returns null for a fully signed-in user: the two are mutually exclusive, and
 * a route that wants "either" should check this first, then `getBackendUser`.
 */
export async function readPendingConsentSession(): Promise<PendingConsentSession | null> {
  const cookieStore = await cookies();
  const parsed = readStoredSession(cookieStore.get(BACKEND_SESSION_COOKIE)?.value);
  if (!parsed?.pendingConsentToken || parsed.accessToken) return null;
  return parsed as PendingConsentSession;
}

export async function clearBackendSession() {
  const cookieStore = await cookies();
  cookieStore.delete(BACKEND_SESSION_COOKIE);
}

/**
 * Cookies can only be written from a Route Handler or Server Action, but session
 * *maintenance* happens wherever the user is read — Server Components included,
 * where the same write throws. Those writes are therefore best-effort: the
 * request still resolves correctly without them (a refreshed token is used in
 * memory, a dead session is reported as signed out), and the next route-handler
 * call persists the change. Deliberate writes — login, logout — call the
 * helpers directly, so a genuine failure there still surfaces.
 */
async function bestEffort(write: () => Promise<void>) {
  try {
    await write();
  } catch {
    /* read-only render — the caller's return value already reflects the change */
  }
}

/**
 * Current user, refreshing the access token once if it has expired. Returns the
 * session alongside the user so callers can pass the (possibly rotated) token to
 * further backend calls without re-reading the cookie.
 */
export async function getBackendUser(): Promise<{ user: BackendUser; session: BackendSession } | null> {
  const session = await readBackendSession();
  if (!session) return null;

  let result = await callBackend<BackendUser>("/users/me", { token: session.accessToken });

  // 401 is the correct signal for an expired token; 403 is tolerated because
  // older builds of the API returned that for the same condition.
  if (!result.ok && (result.status === 401 || result.status === 403)) {
    const refreshed = await callBackend<{ accessToken: string; refreshToken: string }>("/auth/refresh", {
      method: "POST",
      body: { refreshToken: session.refreshToken },
    });
    if (!refreshed.ok) {
      await bestEffort(clearBackendSession);
      return null;
    }
    session.accessToken = refreshed.data.accessToken;
    session.refreshToken = refreshed.data.refreshToken;
    // idToken is deliberately left as-is: the refresh grant does not reissue
    // one, and the original still identifies the session we would end.
    await bestEffort(() => setBackendSession(session));
    result = await callBackend<BackendUser>("/users/me", { token: session.accessToken });
  }

  if (!result.ok) return null;
  return { user: result.data, session };
}
