import { getPostVerifyOnboardingStep, getPostVerifyRedirect } from "@/lib/auth/onboarding";
import { verifyEmailToken } from "@/lib/auth/email-verification";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";

export async function completeEmailVerification(rawToken: string) {
  const result = await verifyEmailToken(rawToken);

  if (!result.ok) {
    return { ok: false as const, reason: "invalid" as const };
  }

  const user = await prisma.user.findUnique({ where: { email: result.email } });

  if (!user) {
    return { ok: false as const, reason: "no_user" as const };
  }

  const onboardingStep = getPostVerifyOnboardingStep(user);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: new Date(),
      onboardingStep,
    },
  });

  await createSession(user.id);

  return {
    ok: true as const,
    redirectTo: getPostVerifyRedirect({
      ...user,
      emailVerified: new Date(),
      accountType: user.accountType,
    }),
  };
}
