import { callBackend } from "./client";
import { redirectForUser } from "./mappers";
import { getBackendUser, readPendingConsentSession } from "./session";

/**
 * Where whoever holds the current cookie belongs, or null if nobody does.
 *
 * A minor awaiting a guardian counts as somebody: they hold a consent token and
 * belong on a specific screen, even though the API would reject that token
 * everywhere outside /consent/*.
 *
 * Every route that needs to send a user onward reads it from here — the session
 * endpoint, the landing page, and the two places that catch a link the user has
 * already used. They cannot disagree about the destination that way, which is
 * what stops a "your email is verified" from dropping someone on a login form
 * they do not need.
 */
export async function currentDestination(): Promise<string | null> {
  const pending = await readPendingConsentSession();

  if (pending) {
    const status = await callBackend<{ status: string }>("/consent/status", {
      token: pending.pendingConsentToken,
    });

    if (!status.ok) {
      // A 404 is the definite answer that they have named nobody. Anything else
      // — a rate limit, a blip — is not an answer at all, and must not be read
      // as one: guessing the waiting screen strands a user who has no invite to
      // wait for, on a page whose only job is to poll for one.
      //
      // The parent step is the safe guess either way. It is the only screen
      // that can move the account forward from any of these states, and a user
      // who does already have a pending invite is told so when they submit
      // (CONSENT_ALREADY_INITIATED) rather than being stuck.
      return "/onboarding/parent";
    }

    switch (status.data.status) {
      case "APPROVED":
        return "/onboarding/approved";
      case "EXPIRED":
      case "REVOKED":
        // Both need a fresh invite, which starts at the parent step.
        return "/onboarding/parent";
      default:
        // PENDING, and DENIED — the waiting page renders its own declined state.
        return "/onboarding/waiting";
    }
  }

  const current = await getBackendUser();
  return current ? redirectForUser(current.user) : null;
}
