import { AccountType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function hasLinkedChildren(userId: string) {
  const link = await prisma.guardianChildLink.findFirst({
    where: { guardianUserId: userId },
    select: { id: true },
  });
  return link != null;
}

/** Guardian accounts, and any account that already has a child linked. */
export async function canAccessFamilyCircle(user: { id: string; accountType: AccountType }) {
  if (user.accountType === AccountType.GUARDIAN) return true;
  return hasLinkedChildren(user.id);
}
