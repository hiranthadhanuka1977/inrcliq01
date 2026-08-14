import { AccountType, ApprovalStatus } from "@/generated/prisma/client";
import { getLatestParentRequest } from "@/lib/auth/parent-invite";
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
  listFollowedCreatorsForUser,
} from "@/lib/feed/follow-service";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { calculateAge } from "@/lib/utils/age";

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

  const parentRequest =
    user.accountType === AccountType.MINOR ? await getLatestParentRequest(user.id) : null;

  const approvedTier =
    parentRequest?.status === ApprovalStatus.APPROVED && parentRequest.protectionLevel
      ? (parentRequest.protectionLevel as ProtectionTier)
      : null;

  const privacyTier =
    approvedTier && approvedTier in PROTECTION_TIER_LABELS ? approvedTier : null;

  const firstName = user.firstName?.trim() || null;
  const lastName = user.lastName?.trim() || null;
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || "Your profile";
  const avatarInitial = (firstName || user.email || "Y").charAt(0).toUpperCase();

  const [profileRow, creatorRow] = await Promise.all([
    prisma.userProfile.findUnique({
      where: { userId: user.id },
      select: {
        displayName: true,
        avatarUrl: true,
        avatarColor: true,
        avatarInitials: true,
        verified: true,
      },
    }),
    prisma.creatorUser.findFirst({
      where: { userId: user.id },
      select: {
        name: true,
        avatarUrl: true,
        avatarColor: true,
        avatarInitials: true,
        verified: true,
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
    (resolvedFullName === "Your profile" ? avatarInitial : resolvedFullName.charAt(0).toUpperCase());
  const avatarUrl = profileRow?.avatarUrl?.trim() || creatorRow?.avatarUrl?.trim() || null;
  const avatarColor =
    profileRow?.avatarColor?.trim() || creatorRow?.avatarColor?.trim() || null;

  let age: number | null = null;
  let dateOfBirth: string | null = null;
  if (user.dateOfBirth) {
    const dob = user.dateOfBirth;
    age = calculateAge(dob.getMonth() + 1, dob.getDate(), dob.getFullYear());
    dateOfBirth = dob.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  const countryLabel = user.country ? getCountryLabel(user.country) : null;
  const region = user.region?.trim() || null;
  const locationLabel = [region, countryLabel].filter(Boolean).join(", ") || null;

  const [subscriptionRows, subscriptionsCount, followRows, followingCount] = await Promise.all([
    listActiveSubscriptionsForUser(user.id),
    countActiveSubscriptionsForUser(user.id),
    listFollowedCreatorsForUser(user.id),
    countFollowedCreatorsForUser(user.id),
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

  // Fan accounts don't currently have inbound User→User follows.
  const followers: AccountSocialPerson[] = [];

  return {
    id: user.id,
    firstName,
    lastName,
    fullName: resolvedFullName,
    handle: user.handle?.trim() || null,
    email: user.email,
    emailVerified: Boolean(user.emailVerified),
    accountType: user.accountType,
    accountTypeLabel: accountTypeLabel(user.accountType),
    dateOfBirth,
    age,
    country: user.country,
    countryLabel,
    region,
    locationLabel,
    privacyTier,
    privacyTierLabel: privacyTier
      ? PROTECTION_TIER_LABELS[privacyTier]
      : user.accountType === AccountType.MINOR
        ? "Not set"
        : "Standard",
    privacyTierDescription: privacyDescription(privacyTier, user.accountType),
    memberSince: user.createdAt.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    }),
    avatarInitial: resolvedAvatarInitial,
    avatarUrl,
    avatarColor,
    verified: Boolean(profileRow?.verified) || Boolean(creatorRow?.verified),
    social: {
      followersCount: followers.length,
      followingCount,
      subscriptionsCount,
      followers,
      following,
      subscriptions,
    },
  };
}
