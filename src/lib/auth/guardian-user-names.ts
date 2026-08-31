import { AccountType } from "@/generated/prisma/client";
import { deriveUserNameFromEmail } from "@/lib/auth/display-name";
import { prisma } from "@/lib/prisma";

/** Persist a readable guardian name when signup did not collect one explicitly. */
export async function ensureGuardianUserNames(userId: string, email: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { firstName: true, lastName: true, accountType: true },
  });

  if (!user || user.accountType !== AccountType.GUARDIAN) return null;
  if (user.firstName?.trim()) {
    return {
      firstName: user.firstName.trim(),
      lastName: user.lastName?.trim() || null,
    };
  }

  const derived = deriveUserNameFromEmail(email);
  await prisma.user.update({
    where: { id: userId },
    data: {
      firstName: derived.firstName,
      lastName: derived.lastName,
    },
  });

  return derived;
}
