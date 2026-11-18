/** Sent by the child-approval tab. This session is not the shared site cookie. */
export const GUARDIAN_TAB_SESSION_HEADER = "x-guardian-session";

/** Tab-scoped storage. A new browser tab starts empty. */
export const GUARDIAN_TAB_SESSION_STORAGE_KEY = "inrcliq_guardian_tab_session";

export function readGuardianTabSession() {
  if (typeof window === "undefined") return null;
  const token = sessionStorage.getItem(GUARDIAN_TAB_SESSION_STORAGE_KEY)?.trim();
  return token || null;
}

export function writeGuardianTabSession(token: string) {
  sessionStorage.setItem(GUARDIAN_TAB_SESSION_STORAGE_KEY, token);
}

export function clearGuardianTabSession() {
  sessionStorage.removeItem(GUARDIAN_TAB_SESSION_STORAGE_KEY);
}

export function guardianTabFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
  token: string | null,
) {
  const headers = new Headers(init.headers);
  if (token) headers.set(GUARDIAN_TAB_SESSION_HEADER, token);
  return fetch(input, { ...init, headers });
}
