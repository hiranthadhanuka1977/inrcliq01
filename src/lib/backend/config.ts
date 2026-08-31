/**
 * Backend integration switch.
 *
 * The prototype ships with a self-contained mock (local Prisma + session table).
 * Setting BACKEND_MODE=live routes the auth and onboarding endpoints at the real
 * InrCliq API instead, leaving every other route (feed, seller, settings) on the
 * mock — those have no backend equivalent yet.
 *
 * Default is "mock", so a clone with no extra env behaves exactly as before.
 */
/**
 * Live-mode session cookie. Declared here rather than in session.ts because the
 * middleware needs the name and runs on the edge runtime, where `next/headers`
 * is unavailable.
 */
export const BACKEND_SESSION_COOKIE = "inrcliq_backend_session";

export type BackendMode = "mock" | "live";

export function backendMode(): BackendMode {
  return process.env.BACKEND_MODE === "live" ? "live" : "mock";
}

export function isLiveBackend() {
  return backendMode() === "live";
}

export function backendUrl() {
  return (process.env.BACKEND_URL ?? "http://localhost:3030/api/v1").replace(/\/$/, "");
}
