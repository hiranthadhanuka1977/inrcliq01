import { currentDestination } from "./destination";
import { splitName } from "./mappers";
import { getBackendUser, readPendingConsentSession } from "./session";

/**
 * Server-side guard for an onboarding page in live mode.
 *
 * The pages were written against the mock session, which lives in the
 * prototype's own database. Live mode never writes a row there, so
 * `getSessionUser()` answers null for a perfectly valid session and every page
 * bounces to "/" — and once "/" learned to route a signed-in user onward, that
 * bounce became a redirect loop.
 *
 * `allow` lists the destinations that may render this page. It is usually just
 * the page itself; the parent step also accepts "waiting", because going back
 * to change the guardian's address is a legitimate move rather than a stale URL.
 */
export interface OnboardingViewer {
  firstName: string;
  lastName: string;
  email: string;
  /**
   * Pre-fills the date-of-birth fields on the parent-invite screen, so a child
   * correcting a typo starts from what they registered rather than a blank form.
   *
   * Null in live mode: a minor awaiting a guardian holds only the pending-consent
   * cookie, which carries their name and address and no date of birth, and the
   * backend user bridge does not surface one either. The form falls back to its
   * own default, which is the same screen the prototype showed before.
   */
  initialDob?: { month: number; day: number; year: number } | null;
}

export async function liveOnboardingGuard(
  allow: string[],
): Promise<{ kind: "redirect"; to: string } | { kind: "render"; viewer: OnboardingViewer }> {
  const destination = await currentDestination();

  if (!destination) {
    return { kind: "redirect", to: "/" };
  }

  if (!allow.includes(destination)) {
    return { kind: "redirect", to: destination };
  }

  // A minor awaiting a guardian has no access token, so their name and address
  // come from what verify-email handed back and parked in the cookie.
  const pending = await readPendingConsentSession();
  if (pending) {
    return {
      kind: "render",
      viewer: { firstName: pending.firstName, lastName: "", email: pending.email, initialDob: null },
    };
  }

  const current = await getBackendUser();
  if (!current) return { kind: "redirect", to: "/" };

  const { firstName, lastName } = splitName(current.user.name);
  return { kind: "render", viewer: { firstName, lastName, email: current.user.email, initialDob: null } };
}
