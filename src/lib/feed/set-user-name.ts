import { getNameValidationState } from "@/lib/form-validation";
import { initialsFromName } from "@/lib/feed/set-user-handle";
import { prisma } from "@/lib/prisma";

const MAX_NAME_LENGTH = 40;

export async function setUserName(userId: string, rawFirst: string, rawLast: string) {
  const firstName = rawFirst.trim();
  const lastName = rawLast.trim();
  const validation = getNameValidationState(firstName, lastName);
  if (validation.message) {
    return { ok: false as const, error: validation.message };
  }
  if (firstName.length > MAX_NAME_LENGTH || lastName.length > MAX_NAME_LENGTH) {
    return { ok: false as const, error: "Use 40 characters or fewer for each name." };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) return { ok: false as const, error: "User not found." };

  const fullName = `${firstName} ${lastName}`;
  const avatarInitials = initialsFromName(fullName);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { firstName, lastName },
    }),
    prisma.userProfile.updateMany({
      where: { userId },
      data: { displayName: fullName, avatarInitials },
    }),
    prisma.creatorUser.updateMany({
      where: { userId },
      data: { name: fullName, firstName, lastName, avatarInitials },
    }),
  ]);

  return { ok: true as const, fullName, firstName, lastName };
}
