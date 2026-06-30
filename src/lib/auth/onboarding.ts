import type { ParentApprovalRequest, User } from "@/generated/prisma/client";

export function getOnboardingRedirect(
  user: User,
  parentRequest?: ParentApprovalRequest | null,
) {
  if (user.onboardingStep === "complete") return "/home";
  if (user.onboardingStep === "handle") return "/onboarding/handle";
  if (user.onboardingStep === "approved") return "/onboarding/approved";
  if (user.onboardingStep === "password") return "/onboarding/password";

  if (user.accountType === "MINOR" && parentRequest?.status === "APPROVED") {
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
