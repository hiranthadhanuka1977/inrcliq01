import type { User } from "@/generated/prisma/client";
import { getBackendUser, type BackendUser } from "./session";
import { splitName, toAccountType } from "./mappers";

/**
 * Presents the live backend's user as the prototype's `User` record.
 *
 * The prototype resolves the signed-in user through `getSessionUser()` in about
 * forty places — pages included — and every one of them expects a Prisma `User`.
 * Rather than touch all of those, live mode returns this adapted object, so the
 * pages keep working unchanged.
 *
 * Fields the backend has no equivalent for are null. `passwordHash` in
 * particular is deliberately null: it is only read by the mock password-login
 * route, which live mode never reaches, and a placeholder there could be
 * mistaken for a real credential.
 */

/** Our step vocabulary → the slugs `getOnboardingRedirect` switches on. */
const STEP_SLUGS: Record<string, string> = {
  PASSWORD_SETUP: "password",
  HANDLE_SETUP: "handle",
  INTEREST_SELECTION: "interests",
  COMPLETED: "complete",
};

export function toPrototypeUser(user: BackendUser): User {
  const { firstName, lastName } = splitName(user.name);

  // A minor waiting on a guardian is not in the onboarding sequence — route them
  // to the parent screen instead of a step they cannot complete.
  const onboardingStep =
    user.accountState === "PENDING_GUARDIAN"
      ? "parent"
      : (STEP_SLUGS[user.onboardingStep ?? ""] ?? null);

  return {
    id: user.userId,
    email: user.email,
    // The prototype stores a timestamp and tests it for truthiness.
    emailVerified: user.emailVerified ? new Date() : null,
    firstName,
    lastName,
    handle: user.username,
    dateOfBirth: null,
    country: null,
    region: null,
    accountType: toAccountType(user.ageZone),
    signupMethod: user.hasPassword ? "email" : "sso",
    onboardingStep,
    passwordHash: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;
}

/** Live-mode replacement for `getSessionUser()`. */
export async function getLiveSessionUser(): Promise<User | null> {
  const current = await getBackendUser();
  return current ? toPrototypeUser(current.user) : null;
}
