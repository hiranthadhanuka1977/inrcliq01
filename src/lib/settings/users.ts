import type { AccountType, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/** `User.signupMethod` of seeded demo accounts (created for feed creators). */
export const DEMO_SIGNUP_METHOD = "feed-creator";

export type SettingsUsersGroup = "members" | "demo";

const USER_GROUP_WHERE: Record<SettingsUsersGroup, Prisma.UserWhereInput> = {
  members: { OR: [{ signupMethod: null }, { signupMethod: { not: DEMO_SIGNUP_METHOD } }] },
  demo: { signupMethod: DEMO_SIGNUP_METHOD },
};

export type SettingsUserRow = {
  id: string;
  name: string;
  email: string;
  typeLabel: "Parent user" | "Standard user";
  accountType: AccountType;
  createdAt: Date;
  /** Feed posts authored by the user or by their linked creator identity. */
  postCount: number;
};

export function formatUserType(accountType: AccountType): SettingsUserRow["typeLabel"] {
  return accountType === "GUARDIAN" ? "Parent user" : "Standard user";
}

export function formatUserName(firstName: string | null, lastName: string | null) {
  const name = [firstName, lastName].filter(Boolean).join(" ").trim();
  return name || "—";
}

export async function countSettingsUsersByGroup(): Promise<Record<SettingsUsersGroup, number>> {
  const [members, demo] = await Promise.all([
    prisma.user.count({ where: USER_GROUP_WHERE.members }),
    prisma.user.count({ where: USER_GROUP_WHERE.demo }),
  ]);
  return { members, demo };
}

/** All users, or only one group when `group` is given. */
export async function listSettingsUsers(group?: SettingsUsersGroup): Promise<SettingsUserRow[]> {
  const [users, postCounts] = await Promise.all([
    prisma.user.findMany({
      where: group ? USER_GROUP_WHERE[group] : undefined,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        accountType: true,
        createdAt: true,
      },
    }),
    prisma.$queryRaw<{ userId: string; posts: number }[]>`
      SELECT u.id AS "userId", COUNT(DISTINCT p.id)::int AS posts
      FROM "User" u
      LEFT JOIN "CreatorUser" c ON c."userId" = u.id
      JOIN "FeedPost" p ON p."userId" = u.id OR p."creatorId" = c.id
      GROUP BY u.id
    `,
  ]);

  const postsByUser = new Map(postCounts.map((row) => [row.userId, row.posts]));

  return users.map((user) => ({
    id: user.id,
    email: user.email,
    name: formatUserName(user.firstName, user.lastName),
    typeLabel: formatUserType(user.accountType),
    accountType: user.accountType,
    createdAt: user.createdAt,
    postCount: postsByUser.get(user.id) ?? 0,
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
