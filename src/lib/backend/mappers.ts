import type { BackendUser } from "./session";

/**
 * Translations between the API's vocabulary and the prototype's.
 *
 * The prototype was built against its own mock schema, so its components speak
 * in ADULT/MINOR and onboarding step slugs. Keeping the translation here means
 * the components and their route handlers stay untouched.
 */

/**
 * The API's ageZone → the prototype's accountType.
 *
 * The API now returns four bands: KIDS, TEEN, MATURE_TEEN, ADULT. Only ADULT is
 * an adult, so everything else collapses to MINOR and this needed no change when
 * MATURE_TEEN was added — which is why it is written as a single comparison
 * rather than a list of minor zones that would have to grow.
 *
 * Note ADULT is a content band, not a legal status: somebody of 19 in a
 * jurisdiction whose age of majority is 21 is a legal child and comes back as
 * MATURE_TEEN. Read the API's `isMinor` where legal status is what matters.
 *
 * SEAM: `src/lib/utils/age-zone.ts` has the prototype's own four codes — KIDS,
 * TEEN, MATURE_TEEN, ADULT — with the same boundaries but plural names. They
 * feed the mock's guardian and DM features from a local date-of-birth
 * calculation and never meet the API's values today. Anything that starts
 * rendering the API's band must map between the two rather than assume they
 * match.
 */
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
  // ── Feed and posts ────────────────────────────────────────────────────────
  POST_EMPTY: "Write something or add a photo before you post.",
  POST_NOT_FOUND: "That post is no longer available.",
  POST_NOT_VISIBLE: "This post is for members only. Subscribe to see it.",
  NOT_POST_AUTHOR: "You can only edit or delete your own posts.",
  CONTENT_BLOCKED: "That didn't pass our content check. Try rewording it.",
  EXCLUSIVE_REQUIRES_VERIFIED_CREATOR:
    "Members-only posts need a verified creator account. Get verified to publish exclusive content.",
  MINOR_CANNOT_PUBLISH_EXCLUSIVE: "Members-only posts aren't available on under-18 accounts.",
  COMMENT_NOT_FOUND: "That comment is no longer available.",
  ATTACHMENT_NOT_FOUND: "We couldn't find that upload. Try adding the file again.",
  ATTACHMENT_NOT_OWNED: "That file was uploaded from another account.",
  ATTACHMENT_PURPOSE_MISMATCH: "That file can't be used here. Try uploading it again.",
  MIME_TYPE_NOT_ALLOWED: "That file type isn't supported.",
  FILE_TOO_LARGE: "That file is too large.",
  INVALID_CURSOR: "We lost your place in the feed. Pull to refresh.",
  PROFILE_CONTEXT_REQUIRED: "Finish setting up your profile before posting.",
  BACKEND_UNREACHABLE: "We can't reach InrCliq right now. Please try again.",
};

export function errorCopy(errorCode: string, fallback: string): string {
  return ERROR_COPY[errorCode] ?? fallback;
}
