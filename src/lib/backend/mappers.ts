import type { BackendUser } from "./session";

/**
 * Translations between the API's vocabulary and the prototype's.
 *
 * The prototype was built against its own mock schema, so its components speak
 * in ADULT/MINOR and onboarding step slugs. Keeping the translation here means
 * the components and their route handlers stay untouched.
 */

/** ageZone KID|TEEN|ADULT → the prototype's accountType. */
export function toAccountType(ageZone: string): "ADULT" | "MINOR" {
  return ageZone === "ADULT" ? "ADULT" : "MINOR";
}

/** The API stores one `name`; the prototype shows first and last separately. */
export function splitName(name: string): { firstName: string; lastName: string } {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
}

/** Where a returning user belongs, given the progress the API has recorded. */
export function redirectForUser(user: BackendUser): string {
  if (!user.emailVerified) return "/signup";
  if (user.accountState === "PENDING_GUARDIAN") return "/onboarding/waiting";

  switch (user.onboardingStep) {
    case "COMPLETED":
      return "/feed";
    case "INTEREST_SELECTION":
      return "/onboarding/interests";
    case "HANDLE_SETUP":
      return "/onboarding/handle";
    case "PASSWORD_SETUP":
      return "/onboarding/password";
    default:
      // Verified but no step recorded — start at the beginning of onboarding.
      return "/onboarding/password";
  }
}

/**
 * Maps API error codes onto the copy the prototype's forms already display.
 * Anything unmapped falls through to the API's own message.
 */
const ERROR_COPY: Record<string, string> = {
  USER_NOT_FOUND:
    "We couldn't find an account with that email. Check the address or sign up to join InrCliq.",
  EMAIL_NOT_VERIFIED: "Please verify your email before logging in. Check your inbox or sign up again.",
  EMAIL_ALREADY_REGISTERED: "An account with this email already exists. Please log in.",
  USERNAME_TAKEN: "This handle is already taken.",
  INVALID_CREDENTIALS: "Incorrect email or password.",
  OTP_INVALID: "Invalid or expired code.",
  OTP_MAX_ATTEMPTS: "Too many attempts. Request a new code.",
  RATE_LIMIT_EXCEEDED: "Please wait before requesting another code.",
  CONSENT_REQUIRED: "A guardian needs to approve this account before you can log in.",
  ACCOUNT_BLOCKED: "This account has been blocked.",
  ACCOUNT_REVOKED: "This account has been closed.",
  BACKEND_UNREACHABLE: "We can't reach InrCliq right now. Please try again.",
};

export function errorCopy(errorCode: string, fallback: string): string {
  return ERROR_COPY[errorCode] ?? fallback;
}
