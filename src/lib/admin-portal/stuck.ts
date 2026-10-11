import type { AccountType, ApprovalStatus } from "@/generated/prisma/client";
import { ageInYears } from "@/lib/utils/age-zone";

export const STUCK_REASONS = [
  "email_unverified",
  "needs_guardian_email",
  "invite_open",
  "invite_expired",
  "declined",
  "approved_waiting",
  "continue_expired",
  "setup_incomplete",
  "suspended",
  "recent_complete",
] as const;

export type StuckReason = (typeof STUCK_REASONS)[number];

export const STUCK_LABELS: Record<StuckReason, string> = {
  email_unverified: "Email not verified",
  needs_guardian_email: "Needs a guardian email",
  invite_open: "Guardian invite open",
  invite_expired: "Guardian invite expired",
  declined: "Guardian declined",
  approved_waiting: "Approved, child has not continued",
  continue_expired: "Continue link expired",
  setup_incomplete: "Profile setup unfinished",
  suspended: "Suspended",
  recent_complete: "Finished in the last 7 days",
};

export const STEP_LABELS: Record<string, string> = {
  parent: "Guardian email",
  waiting: "Waiting for guardian",
  approved: "Approved",
  password: "Password",
  handle: "Handle",
  interests: "Interests",
  complete: "Complete",
  "guardian-setup": "Guardian setup",
};

export type RequestSnapshot = {
  status: ApprovalStatus;
  parentEmail: string;
  expiresAt: Date;
  sentAt: Date;
  resolvedAt: Date | null;
  revokedAt: Date | null;
  protectionLevel: string | null;
  continueTokenExpiresAt: Date | null;
  continueTokenUsedAt: Date | null;
  hasContinueToken: boolean;
};

const SETUP_STEPS = new Set(["password", "handle", "interests"]);
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function stepLabel(step: string | null) {
  if (!step) return "Not started";
  return STEP_LABELS[step] ?? step;
}

export function describeStuck(
  user: {
    accountType: AccountType;
    onboardingStep: string | null;
    emailVerified: Date | null;
    suspendedAt: Date | null;
    createdAt: Date;
  },
  request: RequestSnapshot | null,
  now = new Date(),
): { reason: StuckReason | null; detail: string } {
  if (user.suspendedAt) {
    return { reason: "suspended", detail: "Sign-in is blocked until the account is restored." };
  }

  if (!user.emailVerified) {
    return { reason: "email_unverified", detail: "Signed up, and the email address is not verified." };
  }

  if (user.accountType === "MINOR") {
    const minor = describeMinor(user.onboardingStep, request, now);
    if (minor) return minor;
  }

  if (user.onboardingStep && user.onboardingStep !== "complete" && user.onboardingStep !== "guardian-setup") {
    return {
      reason: "setup_incomplete",
      detail: `Still on ${stepLabel(user.onboardingStep).toLowerCase()}.`,
    };
  }

  if (
    user.onboardingStep === "complete" &&
    now.getTime() - user.createdAt.getTime() <= SEVEN_DAYS_MS
  ) {
    return { reason: "recent_complete", detail: "Onboarding finished in the last 7 days." };
  }

  if (user.accountType === "GUARDIAN" && user.onboardingStep !== "complete") {
    return { reason: "setup_incomplete", detail: "Guardian account setup is not finished." };
  }

  return { reason: null, detail: user.onboardingStep === "complete" ? "Onboarding complete." : "No blocker recorded." };
}

function describeMinor(
  step: string | null,
  request: RequestSnapshot | null,
  now: Date,
): { reason: StuckReason; detail: string } | null {
  const active = request && !request.revokedAt ? request : null;

  if (!active || active.status === "EXPIRED") {
    if (step === "password" || step === "handle" || step === "interests") {
      return null;
    }
    if (request?.status === "EXPIRED" && !request.revokedAt) {
      return {
        reason: "invite_expired",
        detail: `Invite to ${request.parentEmail} has expired. The child can send a new one.`,
      };
    }
    return {
      reason: "needs_guardian_email",
      detail: "Email is verified. A guardian email has not been sent.",
    };
  }

  if (active.status === "PENDING") {
    if (active.expiresAt.getTime() <= now.getTime()) {
      return {
        reason: "invite_expired",
        detail: `Invite to ${active.parentEmail} has expired.`,
      };
    }
    return {
      reason: "invite_open",
      detail: `Waiting on ${active.parentEmail}.`,
    };
  }

  if (active.status === "DECLINED") {
    return {
      reason: "declined",
      detail: `${active.parentEmail} declined. No newer invite has been sent.`,
    };
  }

  if (active.status === "APPROVED") {
    if (SETUP_STEPS.has(step ?? "")) return null;
    if (step === "complete") return null;
    const continueExpired =
      !active.hasContinueToken ||
      (active.continueTokenExpiresAt != null && active.continueTokenExpiresAt.getTime() <= now.getTime());
    const continueUsed = Boolean(active.continueTokenUsedAt);
    if (!continueUsed && continueExpired) {
      return {
        reason: "continue_expired",
        detail: "Guardian approved, and the continue link is missing or expired.",
      };
    }
    return {
      reason: "approved_waiting",
      detail: "Guardian approved. The child has not finished continuing onboarding.",
    };
  }

  return null;
}

export function inQueue(
  user: { onboardingStep: string | null; suspendedAt: Date | null; createdAt: Date },
  reason: StuckReason | null,
  now = new Date(),
) {
  if (user.suspendedAt) return true;
  if (reason && reason !== "recent_complete") return true;
  if (user.onboardingStep !== "complete") return true;
  return now.getTime() - user.createdAt.getTime() <= SEVEN_DAYS_MS;
}

export function ageGateSuggestion(
  accountType: AccountType,
  dateOfBirth: Date | null,
  now = new Date(),
): "to-adult" | "to-minor" | null {
  if (!dateOfBirth || accountType === "GUARDIAN") return null;
  const age = ageInYears(dateOfBirth, now);
  if (age < 0) return null;
  if (accountType === "MINOR" && age >= 18) return "to-adult";
  if (accountType === "ADULT" && age < 18) return "to-minor";
  return null;
}

export type TokenHealth = {
  kind: "Verification" | "Guardian invite" | "Continue link";
  state: "Missing" | "Valid" | "Used" | "Expired" | "Resolved";
  detail: string;
};

export function tokenHealth(input: {
  emailVerified: Date | null;
  verification: { usedAt: Date | null; expiresAt: Date } | null;
  request: RequestSnapshot | null;
  now?: Date;
}): TokenHealth[] {
  const now = input.now ?? new Date();
  const verification = describeVerification(input.emailVerified, input.verification, now);
  const invite = describeInvite(input.request, now);
  const continueLink = describeContinue(input.request, now);
  return [verification, invite, continueLink];
}

function describeVerification(
  emailVerified: Date | null,
  token: { usedAt: Date | null; expiresAt: Date } | null,
  now: Date,
): TokenHealth {
  if (emailVerified) {
    return { kind: "Verification", state: "Used", detail: "Email address is verified." };
  }
  if (!token) return { kind: "Verification", state: "Missing", detail: "No verification email is on file." };
  if (token.usedAt) return { kind: "Verification", state: "Used", detail: "The latest link was used, and the email is still unverified." };
  if (token.expiresAt.getTime() <= now.getTime()) {
    return { kind: "Verification", state: "Expired", detail: "The latest verification link has expired." };
  }
  return { kind: "Verification", state: "Valid", detail: `Valid until ${formatStamp(token.expiresAt)}.` };
}

function describeInvite(request: RequestSnapshot | null, now: Date): TokenHealth {
  if (!request || request.revokedAt) {
    return { kind: "Guardian invite", state: "Missing", detail: "No open guardian invite." };
  }
  if (request.status === "PENDING" && request.expiresAt.getTime() > now.getTime()) {
    return { kind: "Guardian invite", state: "Valid", detail: `Valid until ${formatStamp(request.expiresAt)}.` };
  }
  if (request.status === "PENDING" || request.status === "EXPIRED") {
    return { kind: "Guardian invite", state: "Expired", detail: `Expired ${formatStamp(request.expiresAt)}.` };
  }
  return {
    kind: "Guardian invite",
    state: "Resolved",
    detail: `${request.status === "APPROVED" ? "Approved" : "Declined"} for ${request.parentEmail}.`,
  };
}

function describeContinue(request: RequestSnapshot | null, now: Date): TokenHealth {
  if (!request || request.status !== "APPROVED" || request.revokedAt) {
    return { kind: "Continue link", state: "Missing", detail: "Issued after a guardian approves." };
  }
  if (!request.hasContinueToken || !request.continueTokenExpiresAt) {
    return { kind: "Continue link", state: "Missing", detail: "Approval is recorded, and no continue link is stored." };
  }
  if (request.continueTokenUsedAt) {
    return { kind: "Continue link", state: "Used", detail: `Opened ${formatStamp(request.continueTokenUsedAt)}.` };
  }
  if (request.continueTokenExpiresAt.getTime() <= now.getTime()) {
    return { kind: "Continue link", state: "Expired", detail: `Expired ${formatStamp(request.continueTokenExpiresAt)}.` };
  }
  return {
    kind: "Continue link",
    state: "Valid",
    detail: `Valid until ${formatStamp(request.continueTokenExpiresAt)}.`,
  };
}

export function formatStamp(date: Date) {
  const iso = date.toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
}
