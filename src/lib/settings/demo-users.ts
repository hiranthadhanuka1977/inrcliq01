import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { AccountType, AgeZone } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { DEMO_SEED_SIGNUP_METHOD, deleteSettingsUser } from "@/lib/settings/users";

/**
 * Demo accounts that aren't feed creators (such as the Anderson family) live in
 * data/demo-users.json. Delete removes exactly those accounts; restore recreates
 * the missing ones with the same IDs and handles, plus their profiles and
 * parent-child links. Passwords are never stored, so restored accounts sign in
 * with email login codes.
 */

export const DEMO_USERS_FILE = "demo-users.json";

type DemoProfileSeed = {
  slug: string | null;
  displayName: string;
  handle: string;
  avatarInitials: string;
  avatarColor: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  bio: string;
  verified: boolean;
  source: string;
};

export type DemoUserSeed = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  handle: string | null;
  accountType: AccountType;
  dateOfBirth: string | null;
  ageZone: AgeZone | null;
  country: string | null;
  region: string | null;
  createdAt: string;
  profile: DemoProfileSeed | null;
};

export type DemoGuardianLinkSeed = {
  guardianEmail: string;
  childEmail: string;
  protectionLevel: string | null;
  linkedAt: string;
};

export type DemoUsersFile = { users: DemoUserSeed[]; guardianLinks: DemoGuardianLinkSeed[] };

export type DemoUsersStatus = { seedUsers: number; present: number; missing: number };

export type DemoUsersRestoreResult = {
  restored: number;
  alreadyPresent: number;
  skipped: string[];
  linksRestored: number;
  creatorsRelinked: number;
};

/** Local uploads are gitignored, so an image path only survives restore where the file exists. */
function availableImage(url: string | null) {
  if (!url?.startsWith("/")) return url;
  return existsSync(join(process.cwd(), "public", url)) ? url : null;
}

function loadDemoUsers(): DemoUsersFile {
  const parsed = JSON.parse(readFileSync(join(process.cwd(), "data", DEMO_USERS_FILE), "utf8")) as Partial<DemoUsersFile>;
  return {
    users: Array.isArray(parsed.users) ? parsed.users : [],
    guardianLinks: Array.isArray(parsed.guardianLinks) ? parsed.guardianLinks : [],
  };
}

async function findUsersByEmail(emails: string[]) {
  const rows = await prisma.user.findMany({
    where: { email: { in: emails, mode: "insensitive" } },
    select: { id: true, email: true },
  });
  return new Map(rows.map((row) => [row.email.toLowerCase(), row.id]));
}

/** Builds the seed file contents from every account currently marked `demo-seed`. */
export async function snapshotDemoUsers(): Promise<DemoUsersFile> {
  const users = await prisma.user.findMany({
    where: { signupMethod: DEMO_SEED_SIGNUP_METHOD },
    orderBy: [{ accountType: "asc" }, { createdAt: "asc" }],
    include: { profile: true, guardianChildren: { include: { childUser: { select: { email: true } } } } },
  });
  const emails = new Set(users.map((user) => user.email.toLowerCase()));

  return {
    users: users.map((user) => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      handle: user.handle,
      accountType: user.accountType,
      dateOfBirth: user.dateOfBirth?.toISOString() ?? null,
      ageZone: user.ageZone,
      country: user.country,
      region: user.region,
      createdAt: user.createdAt.toISOString(),
      profile: user.profile
        ? {
            slug: user.profile.slug,
            displayName: user.profile.displayName,
            handle: user.profile.handle,
            avatarInitials: user.profile.avatarInitials,
            avatarColor: user.profile.avatarColor,
            avatarUrl: user.profile.avatarUrl,
            coverUrl: user.profile.coverUrl,
            bio: user.profile.bio,
            verified: user.profile.verified,
            source: user.profile.source,
          }
        : null,
    })),
    guardianLinks: users.flatMap((user) =>
      user.guardianChildren
        .filter((link) => emails.has(link.childUser.email.toLowerCase()))
        .map((link) => ({
          guardianEmail: user.email,
          childEmail: link.childUser.email,
          protectionLevel: link.protectionLevel,
          linkedAt: link.linkedAt.toISOString(),
        })),
    ),
  };
}

export async function getDemoUsersStatus(): Promise<DemoUsersStatus> {
  const { users } = loadDemoUsers();
  const present = (await findUsersByEmail(users.map((user) => user.email))).size;
  return { seedUsers: users.length, present, missing: users.length - present };
}

/** Removes the seed file's accounts with the same cleanup as removing a user in Settings. */
export async function deleteDemoUsersSample(): Promise<{ deleted: number }> {
  const { users } = loadDemoUsers();
  const existing = await findUsersByEmail(users.map((user) => user.email));

  let deleted = 0;
  for (const userId of existing.values()) {
    if ((await deleteSettingsUser(userId)).ok) deleted += 1;
  }
  return { deleted };
}

async function findConflict(seed: DemoUserSeed): Promise<string | null> {
  const [byId, byHandle, byProfile] = await Promise.all([
    prisma.user.findUnique({ where: { id: seed.id }, select: { id: true } }),
    seed.handle ? prisma.user.findUnique({ where: { handle: seed.handle }, select: { id: true } }) : null,
    seed.profile
      ? prisma.userProfile.findFirst({
          where: {
            OR: [{ handle: seed.profile.handle }, ...(seed.profile.slug ? [{ slug: seed.profile.slug }] : [])],
          },
          select: { id: true },
        })
      : null,
  ]);
  if (byId) return "its account ID is already in use";
  if (byHandle) return `the handle ${seed.handle} is taken`;
  if (byProfile) return `the profile handle or slug is taken`;
  return null;
}

export async function restoreDemoUsersSample(): Promise<DemoUsersRestoreResult> {
  const { users, guardianLinks } = loadDemoUsers();
  const existing = await findUsersByEmail(users.map((user) => user.email));
  const skipped: string[] = [];
  let restored = 0;
  let creatorsRelinked = 0;

  for (const seed of users) {
    if (existing.has(seed.email.toLowerCase())) continue;

    const conflict = await findConflict(seed);
    if (conflict) {
      skipped.push(`${seed.email} (${conflict})`);
      continue;
    }

    await prisma.user.create({
      data: {
        id: seed.id,
        email: seed.email,
        emailVerified: new Date(),
        firstName: seed.firstName,
        lastName: seed.lastName,
        handle: seed.handle,
        accountType: seed.accountType,
        dateOfBirth: seed.dateOfBirth ? new Date(seed.dateOfBirth) : null,
        ageZone: seed.ageZone,
        country: seed.country,
        region: seed.region,
        signupMethod: DEMO_SEED_SIGNUP_METHOD,
        onboardingStep: "complete",
        createdAt: new Date(seed.createdAt),
        ...(seed.profile
          ? {
              profile: {
                create: {
                  ...seed.profile,
                  avatarUrl: availableImage(seed.profile.avatarUrl),
                  coverUrl: availableImage(seed.profile.coverUrl),
                },
              },
            }
          : {}),
      },
    });
    restored += 1;

    const creator = await prisma.creatorUser.findFirst({
      where: {
        userId: null,
        OR: [
          { email: { equals: seed.email, mode: "insensitive" } },
          ...(seed.profile?.slug ? [{ slug: seed.profile.slug }] : []),
        ],
      },
      select: { id: true },
    });
    if (creator) {
      await prisma.creatorUser.update({ where: { id: creator.id }, data: { userId: seed.id } });
      creatorsRelinked += 1;
    }
  }

  const ids = await findUsersByEmail(
    guardianLinks.flatMap((link) => [link.guardianEmail, link.childEmail]),
  );
  const links = guardianLinks.flatMap((link) => {
    const guardianUserId = ids.get(link.guardianEmail.toLowerCase());
    const childUserId = ids.get(link.childEmail.toLowerCase());
    return guardianUserId && childUserId
      ? [{ guardianUserId, childUserId, protectionLevel: link.protectionLevel, linkedAt: new Date(link.linkedAt) }]
      : [];
  });
  const { count: linksRestored } = links.length
    ? await prisma.guardianChildLink.createMany({ data: links, skipDuplicates: true })
    : { count: 0 };

  return { restored, alreadyPresent: existing.size, skipped, linksRestored, creatorsRelinked };
}
