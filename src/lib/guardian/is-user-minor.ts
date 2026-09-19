import { AccountType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { calculateAge } from "@/lib/utils/age";

/** True when the account is marked MINOR or DOB is under 18. */
export async function isUserMinor(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { accountType: true, dateOfBirth: true },
  });
  if (!user) return false;
  if (user.accountType === AccountType.MINOR) return true;
  if (!user.dateOfBirth) return false;
  const age = calculateAge(
    user.dateOfBirth.getMonth() + 1,
    user.dateOfBirth.getDate(),
    user.dateOfBirth.getFullYear(),
  );
  return age < 18;
}

export const MASKED_DM_PREVIEW = "Message hidden by safety filter";

export const MASKED_DM_BODY =
  "This message was hidden because it didn't pass InrCliq's safety check.";
