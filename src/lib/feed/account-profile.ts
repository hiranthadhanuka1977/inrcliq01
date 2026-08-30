import { AccountType, ApprovalStatus } from "@/generated/prisma/client";
import { getLatestParentRequest } from "@/lib/auth/parent-invite";
import { resolveUserDisplayName, resolveUserFirstName } from "@/lib/auth/display-name";
import { ensureGuardianUserNames } from "@/lib/auth/guardian-user-names";
import { getCountryLabel } from "@/lib/constants/locations";
import {
  PROTECTION_TIER_LABELS,
  type ProtectionTier,
} from "@/lib/guardian/constants";
import {
  countActiveSubscriptionsForUser,
  listActiveSubscriptionsForUser,
} from "@/lib/feed/subscription-service";
import {
  countFollowedCreatorsForUser,
  countInboundFollowersForUser,
  listFollowedCreatorsForUser,
  listInboundFollowersForUser,
} from "@/lib/feed/follow-service";
import { resolveAuthorProfileSlug } from "@/lib/feed/profile-slugs";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { calculateAge } from "@/lib/utils/age";
import { getMinorGuardianSummary, type MinorGuardianSummary } from "@/lib/guardian/minor-guardian-profile";

export type AccountSocialPerson = {
  id: string;
  name: string;
  handle: string;
  slug: string | null;
  href: string | null;
  avatarInitials: string;
  avatarColor: string;
  avatarUrl: string | null;
  verified: boolean;
  meta?: string | null;
};

export type AccountSocialTab = "followers" | "following" | "subscriptions";

export type AccountProfile = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  handle: string | null;
  email: string;
  emailVerified: boolean;
  accountType: AccountType;
  accountTypeLabel: string;
  dateOfBirth: string | null;
  age: number | null;
  country: string | null;
  countryLabel: string | null;
  region: string | null;
  locationLabel: string | null;
  privacyTier: ProtectionTier | null;
  privacyTierLabel: string;
  privacyTierDescription: string;
  memberSince: string;
  avatarInitial: string;
  avatarUrl: string | null;
  avatarColor: string | null;
  /** Monetized / creator verified badge — not email verification. */
  verified: boolean;
  postCount: number;
  profileHref: string | null;
  guardian: MinorGuardianSummary | null;
  social: {
    followersCount: number;
    followingCount: number;
    subscriptionsCount: number;
    followers: AccountSocialPerson[];
    following: AccountSocialPerson[];
    subscriptions: AccountSocialPerson[];
  };
};

function accountTypeLabel(type: AccountType) {
  switch (type) {
    case AccountType.MINOR:
      return "Minor";
    case AccountType.GUARDIAN:
      return "Guardian";
    default:
      return "Adult";
  }
}

function privacyDescription(tier: ProtectionTier | null, accountType: AccountType) {
  if (accountType === AccountType.ADULT) {
    return "Adult accounts use standard privacy and community guidelines.";
  }
  if (accountType === AccountType.GUARDIAN) {
    return "Guardian accounts manage safety settings for linked child accounts.";
  }
  if (!tier) {
    return "A parent or guardian has not set a protection level for this account yet.";
  }
  if (tier === "strict") {
    return "Curated creators only. DMs off and comments hidden. Safety alerts to guardian.";
  }
  if (tier === "relaxed") {
    return "DMs allowed with standard moderation. Safety alerts to guardian.";
  }
  return "DMs limited to approved contacts. Comment filters on. Safety alerts to guardian.";
}

function displayHandle(handle: string | null | undefined, fallbackEmail?: string | null) {
  const trimmed = handle?.trim();
  if (trimmed) {
    return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
  }
  if (fallbackEmail) {
    const local = fallbackEmail.split("@")[0]?.trim();
    if (local) return `@${local}`;
  }
  return "@user";
}

function followerDisplayName(
  firstName: string | null,
  lastName: string | null,
  displayName: string | null | undefined,
  email: string,
) {
  const fromProfile = displayName?.trim();
  if (fromProfile) return fromProfile;
  const fullName = [firstName?.trim(), lastName?.trim()].filter(Boolean).join(" ");
  if (fullName) return fullName;
  const local = email.split("@")[0]?.trim();
  return local || "User";
}

function followerInitials(name: string, avatarInitials: string | null | undefined) {
  const fromProfile = avatarInitials?.trim();
  if (fromProfile) return fromProfile;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || "U";
}

function notifyLevelLabel(level: string) {
  switch (level) {
    case "all":
      return "Notifying: All";
    case "none":
      return "Notifying: None";
    default:
      return "Notifying: Personalized";
  }
}

export async function getAccountProfile(): Promise<AccountProfile | null> {
  const user = await getSessionUser();
  if (!user) return null;

  await ensureGuardianUserNames(user.id, user.email);

  const refreshedUser = user.firstName?.trim()
    ? user
    : await prisma.user.findUniqueOrThrow({ where: { id: user.id } });

  const parentRequest =
    refreshedUser.accountType === AccountType.MINOR
      ? await getLatestParentRequest(refreshedUser.id)
      : null;

  const approvedTier =
    parentRequest?.status === ApprovalStatus.APPROVED && parentRequest.protectionLevel
      ? (parentRequest.protectionLevel as ProtectionTier)
      : null;

  const privacyTier =
    approvedTier && approvedTier in PROTECTION_TIER_LABELS ? approvedTier : null;

  const firstName =
    resolveUserFirstName({
      email: refreshedUser.email,
      firstName: refreshedUser.firstName,
      lastName: refreshedUser.lastName,
    }) || null;
  const lastName = refreshedUser.lastName?.trim() || null;
  const fullName = resolveUserDisplayName({
    email: refreshedUser.email,
    firstName: refreshedUser.firstName,
    lastName: refreshedUser.lastName,
  });
  const avatarInitial = (firstName || refreshedUser.email || "Y").charAt(0).toUpperCase();

  const [profileRow, creatorRow] = await Promise.all([
    prisma.userProfile.findUnique({
      where: { userId: refreshedUser.id },
      select: {
        displayName: true,
        avatarUrl: true,
        avatarColor: true,
        avatarInitials: true,
        verified: true,
        slug: true,
      },
    }),
    prisma.creatorUser.findFirst({
      where: { userId: refreshedUser.id },
      select: {
        name: true,
        avatarUrl: true,
        avatarColor: true,
        avatarInitials: true,
        verified: true,
        slug: true,
      },
    }),
  ]);

  const resolvedFullName =
    profileRow?.displayName?.trim() ||
    creatorRow?.name?.trim() ||
    fullName;
  const resolvedAvatarInitial =
    profileRow?.avatarInitials?.trim() ||
    creatorRow?.avatarInitials?.trim() ||
    (resolvedFullName.charAt(0).toUpperCase() || avatarInitial);
  const avatarUrl = profileRow?.avatarUrl?.trim() || creatorRow?.avatarUrl?.trim() || null;
  const avatarColor =
    profileRow?.avatarColor?.trim() || creatorRow?.avatarColor?.trim() || null;

  let age: number | null = null;
  let dateOfBirth: string | null = null;
  if (refreshedUser.dateOfBirth) {
    const dob = refreshedUser.dateOfBirth;
    age = calculateAge(dob.getMonth() + 1, dob.getDate(), dob.getFullYear());
    dateOfBirth = dob.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  const countryLabel = refreshedUser.country ? getCountryLabel(refreshedUser.country) : null;
  const region = refreshedUser.region?.trim() || null;
  const locationLabel = [region, countryLabel].filter(Boolean).join(", ") || null;

  const [subscriptionRows, subscriptionsCount, followRows, followingCount, followerRows, followersCount, postCount] =
    await Promise.all([
      listActiveSubscriptionsForUser(refreshedUser.id),
      countActiveSubscriptionsForUser(refreshedUser.id),
      listFollowedCreatorsForUser(refreshedUser.id),
      countFollowedCreatorsForUser(refreshedUser.id),
      listInboundFollowersForUser(refreshedUser.id),
      countInboundFollowersForUser(refreshedUser.id),
      prisma.feedPost.count({ where: { userId: refreshedUser.id } }),
    ]);

  const subscriptions: AccountSocialPerson[] = subscriptionRows.map((row) => ({
    id: row.creator.id,
    name: row.creator.name,
    handle: row.creator.handle,
    slug: row.creator.slug,
    href: row.creator.slug ? `/feed/profile/${row.creator.slug}` : null,
    avatarInitials: row.creator.avatarInitials,
    avatarColor: row.creator.avatarColor,
    avatarUrl: row.creator.avatarUrl,
    verified: row.creator.verified,
    meta: notifyLevelLabel(row.notifyLevel),
  }));

  const following: AccountSocialPerson[] = followRows.map((row) => ({
    id: row.creator.id,
    name: row.creator.name,
    handle: row.creator.handle,
    slug: row.creator.slug,
    href: row.creator.slug ? `/feed/profile/${row.creator.slug}` : null,
    avatarInitials: row.creator.avatarInitials,
    avatarColor: row.creator.avatarColor,
    avatarUrl: row.creator.avatarUrl,
    verified: row.creator.verified,
    meta: "Following",
  }));

  const followers: AccountSocialPerson[] = followerRows.map((row) => {
    const profile = row.user.profile;
    const name = followerDisplayName(
      row.user.firstName,
      row.user.lastName,
      profile?.displayName,
      row.user.email,
    );
    const slug = profile?.slug?.trim() || null;
    return {
      id: row.user.id,
      name,
      handle: displayHandle(profile?.handle ?? row.user.handle, row.user.email),
      slug,
      href: slug ? `/feed/profile/${slug}` : null,
      avatarInitials: followerInitials(name, profile?.avatarInitials),
      avatarColor: profile?.avatarColor?.trim() || "#6b9fff",
      avatarUrl: profile?.avatarUrl?.trim() || null,
      verified: Boolean(profile?.verified),
      meta: "Follower",
    };
  });

  // Fan-only accounts (no linked CreatorUser) have no inbound follows in this model.

  const guardian =
    refreshedUser.accountType === AccountType.MINOR
      ? await getMinorGuardianSummary(refreshedUser.id)
      : null;

  return {
    id: refreshedUser.id,
    firstName,
    lastName,
    fullName: resolvedFullName,
    handle: refreshedUser.handle?.trim() || null,
    email: refreshedUser.email,
    emailVerified: Boolean(refreshedUser.emailVerified),
    accountType: refreshedUser.accountType,
    accountTypeLabel: accountTypeLabel(refreshedUser.accountType),
    dateOfBirth,
    age,
    country: refreshedUser.country,
    countryLabel,
    region,
    locationLabel,
    privacyTier,
    privacyTierLabel: privacyTier
      ? PROTECTION_TIER_LABELS[privacyTier]
      : refreshedUser.accountType === AccountType.MINOR
        ? "Not set"
        : "Standard",
    privacyTierDescription: privacyDescription(privacyTier, refreshedUser.accountType),
    memberSince: refreshedUser.createdAt.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    }),
    avatarInitial: resolvedAvatarInitial,
    avatarUrl,
    avatarColor,
    verified: Boolean(profileRow?.verified) || Boolean(creatorRow?.verified),
    postCount,
    profileHref: profileRow?.slug?.trim()
      ? `/feed/profile/${profileRow.slug.trim()}`
      : creatorRow?.slug?.trim()
        ? `/feed/profile/${creatorRow.slug.trim()}`
        : refreshedUser.handle?.trim()
          ? `/feed/profile/${resolveAuthorProfileSlug(
              refreshedUser.handle,
              profileRow?.slug ?? creatorRow?.slug,
            )}`
          : null,
    guardian,
    social: {
      followersCount,
      followingCount,
      subscriptionsCount,
      followers,
      following,
      subscriptions,
    },
  };
}
