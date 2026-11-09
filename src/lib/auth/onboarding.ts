import type { ParentApprovalRequest, User } from "@/generated/prisma/client";

export function getOnboardingRedirect(
  user: User,
  parentRequest?: ParentApprovalRequest | null,
) {
  if (user.onboardingStep === "complete") return "/feed";
  if (user.onboardingStep === "interests") return "/onboarding/interests";
  if (user.onboardingStep === "handle") return "/onboarding/handle";
  if (user.onboardingStep === "approved") return "/onboarding/approved";
  if (user.onboardingStep === "password") return "/onboarding/password";

  if (
    user.accountType === "MINOR" &&
    parentRequest?.status === "APPROVED" &&
    !parentRequest.revokedAt
  ) {
    return "/onboarding/approved";
  }

  if (user.onboardingStep === "waiting") return "/onboarding/waiting";
  if (user.onboardingStep === "parent") return "/onboarding/parent";

  if (!user.emailVerified) return "/signup";

  if (user.accountType === "MINOR") {
    if (parentRequest?.status === "PENDING") return "/onboarding/waiting";
    if (parentRequest?.status === "DECLINED") return "/onboarding/waiting";
    return "/onboarding/parent";
  }

  return "/onboarding/password";
}

export function getPostVerifyRedirect(user: User) {
  if (user.accountType === "MINOR") return "/onboarding/parent";
  return "/onboarding/password";
}

export function getPostVerifyOnboardingStep(user: User) {
  if (user.accountType === "MINOR") return "parent";
  return "password";
}

/** Password, handle, and interests only run from that step. A minor cannot skip parent approval. */
export function onboardingStepAllows(
  user: { onboardingStep: string | null; accountType: string; emailVerified: Date | null },
  step: "password" | "handle" | "interests",
) {
  if (!user.emailVerified) return false;
  if (user.onboardingStep === step) return true;
  return step === "password" && user.accountType !== "MINOR" && !user.onboardingStep;
}
