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

  // A minor awaiting a guardian is on one of four screens, and only the consent
  // record says which. `undefined` means the API did not report one (an older
  // build, or a non-minor in this state) — the parent step is the safe landing,
  // since it is the only one that can move the account forward.
  if (user.accountState === "PENDING_GUARDIAN") {
    switch (user.guardianConsent?.status) {
      case "PENDING":
        return "/onboarding/waiting";
      case "APPROVED":
        return "/onboarding/approved";
      case "DENIED":
        // The waiting page renders its own declined state.
        return "/onboarding/waiting";
      case "EXPIRED":
      case "REVOKED":
        // Both need a fresh invite, which starts at the parent step.
        return "/onboarding/parent";
      default:
        // null — no guardian named yet.
        return "/onboarding/parent";
    }
  }

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
 *
 * Anything unmapped falls through to the API's own message — which for most
 * domain errors *is* the code, so a gap here shows the user a raw
 * SCREAMING_SNAKE_CASE string. Add a line whenever the API grows a code that a
 * form can surface.
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
  CONSENT_NOT_FOUND: "We couldn't find that approval request.",
  CONSENT_ALREADY_INITIATED: "An approval request is already pending for this account.",
  CONSENT_ALREADY_APPROVED: "This approval link has already been used.",
  CONSENT_ALREADY_DENIED: "This request was already declined.",
  CONSENT_ALREADY_EXPIRED: "This approval link has expired.",
  GUARDIAN_CONSENT_EXPIRED: "This approval link has expired. Ask your child to send a new one.",
  GUARDIAN_CONSENT_PENDING: "This account is still waiting on a guardian.",
  GUARDIAN_NOT_VERIFIED: "This account is not set up as a verified guardian yet.",
  GUARDIAN_ACCOUNT_REQUIRED: "Please finish creating your guardian account first.",
  ACCOUNT_NOT_PENDING_GUARDIAN: "This account is not awaiting guardian approval.",
  ACCOUNT_BLOCKED: "This account has been blocked.",
  ACCOUNT_REVOKED: "This account has been closed.",
  EMAIL_ALREADY_VERIFIED: "This email is already verified. Log in to continue.",
  TOKEN_INVALID: "This link is not valid. Ask for a new one.",
  TOKEN_EXPIRED: "This link has expired. Ask for a new one.",
  TOKEN_ALREADY_USED: "This link has already been used.",
  PASSWORD_TOO_WEAK: "Use at least 8 characters with a mix of letters and numbers.",
  VALIDATION_ERROR: "Please check the details you entered.",
  ACCOUNT_NOT_ACTIVE: "This account isn't active yet.",
  CONSENT_ALREADY_REVOKED: "This approval request was withdrawn.",
  GUARDIAN_CONSENT_DENIED: "A guardian declined this account.",
  GUARDIAN_CONSENT_REVOKED: "A guardian withdrew their approval for this account.",
  GUARDIAN_EMAIL_IS_SELF: "Please enter your parent or guardian's email, not your own.",
  GUARDIAN_ACCOUNT_NOT_ACTIVE: "That email belongs to an account that can't approve a child.",
  GUARDIAN_MUST_BE_ADULT: "That email belongs to a minor's account, which can't act as a guardian.",
  STILL_A_MINOR:
    "That date of birth is still under 18, so a parent or guardian still needs to approve your account.",
  SSO_ACCOUNT_NOT_FOUND: "We couldn't find an account for that sign-in.",
  SSO_TOKEN_INVALID: "That sign-in expired. Please try again.",
  BACKEND_UNREACHABLE: "We can't reach InrCliq right now. Please try again.",
};

export function errorCopy(errorCode: string, fallback: string): string {
  return ERROR_COPY[errorCode] ?? fallback;
}
