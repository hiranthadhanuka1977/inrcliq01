import type { AccountType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type SettingsUserRow = {
  id: string;
  name: string;
  email: string;
  typeLabel: "Parent user" | "Standard user";
  accountType: AccountType;
  createdAt: Date;
};

export function formatUserType(accountType: AccountType): SettingsUserRow["typeLabel"] {
  return accountType === "GUARDIAN" ? "Parent user" : "Standard user";
}

export function formatUserName(firstName: string | null, lastName: string | null) {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  return name || "—";
}

export async function listSettingsUsers(): Promise<SettingsUserRow[]> {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      accountType: true,
      createdAt: true,
    },
  });

  return users.map((user) => ({
    id: user.id,
    email: user.email,
    name: formatUserName(user.firstName, user.lastName),
    typeLabel: formatUserType(user.accountType),
    accountType: user.accountType,
    createdAt: user.createdAt,
  }));
}

async function deleteUserRelatedRows(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  userId: string,
  email: string,
) {
  await tx.parentApprovalRequest.deleteMany({
    where: {
      OR: [{ childUserId: userId }, { guardianUserId: userId }, { parentEmail: email }],
    },
  });
  await tx.loginCode.deleteMany({ where: { email } });
  await tx.emailVerificationToken.deleteMany({ where: { email } });

  // Chat + bookings / special requests (explicit wipe; also covered by User cascade).
  await tx.specialRequest.deleteMany({ where: { userId } });
  await tx.chatMessage.deleteMany({ where: { thread: { userId } } });
  await tx.chatThread.deleteMany({ where: { userId } });

  // Follows / subscriptions — ignore if the model is not migrated yet.
  try {
    await tx.creatorFollow.deleteMany({ where: { userId } });
  } catch {
    // CreatorFollow table may be absent on older DBs.
  }
  await tx.creatorSubscription.deleteMany({ where: { userId } });

  await tx.session.deleteMany({ where: { userId } });
  await tx.account.deleteMany({ where: { userId } });
}

export async function deleteSettingsUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });

  if (!user) {
    return { ok: false as const, error: "User not found." };
  }

  await prisma.$transaction(async (tx) => {
    await deleteUserRelatedRows(tx, user.id, user.email);
    await tx.user.delete({ where: { id: userId } });
  });

  return { ok: true as const };
}

export async function resetAllSettingsUsers() {
  await prisma.$transaction(async (tx) => {
    await tx.loginCode.deleteMany();
    await tx.emailVerificationToken.deleteMany();
    await tx.parentApprovalRequest.deleteMany();
    await tx.specialRequest.deleteMany();
    await tx.chatMessage.deleteMany();
    await tx.chatThread.deleteMany();
    try {
      await tx.creatorFollow.deleteMany();
    } catch {
      // CreatorFollow table may be absent on older DBs.
    }
    await tx.creatorSubscription.deleteMany();
    await tx.session.deleteMany();
    await tx.account.deleteMany();
    await tx.user.deleteMany();
  });

  return { ok: true as const };
}
