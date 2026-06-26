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

export async function deleteSettingsUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });

  if (!user) {
    return { ok: false as const, error: "User not found." };
  }

  await prisma.$transaction([
    prisma.parentApprovalRequest.deleteMany({
      where: {
        OR: [{ childUserId: userId }, { guardianUserId: userId }],
      },
    }),
    prisma.loginCode.deleteMany({ where: { email: user.email } }),
    prisma.emailVerificationToken.deleteMany({ where: { email: user.email } }),
    prisma.user.delete({ where: { id: userId } }),
  ]);

  return { ok: true as const };
}

export async function resetAllSettingsUsers() {
  await prisma.$transaction([
    prisma.loginCode.deleteMany(),
    prisma.emailVerificationToken.deleteMany(),
    prisma.parentApprovalRequest.deleteMany(),
    prisma.session.deleteMany(),
    prisma.account.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  return { ok: true as const };
}
