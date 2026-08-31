import { AccountType } from "@/generated/prisma/client";
import type { AccountSocialPerson } from "@/lib/feed/account-profile";
import { ensureChildChatThreadForGuardian } from "@/lib/feed/chat-service";
import {
  countFollowedCreatorsForUser,
  countInboundFollowersForUser,
  listFollowedCreatorsForUser,
  listInboundFollowersForUser,
} from "@/lib/feed/follow-service";
import {
  countActiveSubscriptionsForUser,
  listActiveSubscriptionsForUser,
} from "@/lib/feed/subscription-service";
import { getCountryLabel } from "@/lib/constants/locations";
import {
  PROTECTION_TIER_LABELS,
  type ProtectionTier,
} from "@/lib/guardian/constants";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { calculateAge } from "@/lib/utils/age";

export type ChildDetailData = {
  id: string;
  firstName: string;
  fullName: string;
  handle: string | null;
  handleLabel: string;
  email: string;
  age: number | null;
  dateOfBirth: string | null;
  country: string | null;
  countryLabel: string | null;
  region: string | null;
  locationLabel: string | null;
  protectionLevel: ProtectionTier | null;
  protectionLevelLabel: string;
  protectionLevelDescription: string;
  linkedAtDisplay: string;
  memberSince: string;
  profileHref: string | null;
  avatarInitials: string;
  avatarColor: string;
  avatarUrl: string | null;
  statusLabel: string;
  messagesHref: string;
  activity: {
    postCount: number;
    followersCount: number;
    followingCount: number;
    subscriptionsCount: number;
  };
  social: {
    followers: AccountSocialPerson[];
    following: AccountSocialPerson[];
    subscriptions: AccountSocialPerson[];
  };
};

function childFullName(firstName: string | null, lastName: string | null, email: string) {
  const full = [firstName?.trim(), lastName?.trim()].filter(Boolean).join(" ");
  if (full) return full;
  const local = email.split("@")[0]?.trim();
  return local || "Child";
}

function childInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || "C";
}

function childStatusLabel(onboardingStep: string | null) {
  if (onboardingStep === "complete") return "Active";
  if (onboardingStep === "approved") return "Approved — finishing setup";
  return "Pending setup";
}

function protectionDescription(tier: ProtectionTier | null) {
  if (!tier) {
    return "A protection level has not been set for this account yet.";
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

export async function getChildDetailForGuardian(
  childUserId: string,
): Promise<ChildDetailData | null> {
  const user = await getSessionUser();
  if (!user || user.accountType !== AccountType.GUARDIAN) return null;

  const link = await prisma.guardianChildLink.findUnique({
    where: {
      guardianUserId_childUserId: {
        guardianUserId: user.id,
        childUserId,
      },
    },
    include: {
      childUser: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          handle: true,
          dateOfBirth: true,
          country: true,
          region: true,
          createdAt: true,
          onboardingStep: true,
          accountType: true,
          profile: {
            select: {
              slug: true,
              displayName: true,
              avatarUrl: true,
              avatarColor: true,
              avatarInitials: true,
            },
          },
        },
      },
    },
  });

  if (!link || link.childUser.accountType !== AccountType.MINOR) return null;

  const child = link.childUser;
  const fullName =
    child.profile?.displayName?.trim() ||
    childFullName(child.firstName, child.lastName, child.email);
  const firstName = child.firstName?.trim() || fullName.split(/\s+/)[0] || "Child";
  const handle = child.handle?.trim() || child.profile?.slug?.trim() || null;
  const handleLabel = handle ? `@${handle.replace(/^@/, "")}` : "No handle";
  const slug = child.profile?.slug?.trim() || null;
  const avatarInitials = child.profile?.avatarInitials?.trim() || childInitials(fullName);
  const avatarColor = child.profile?.avatarColor?.trim() || "#6b9fff";
  const avatarUrl = child.profile?.avatarUrl?.trim() || null;

  let age: number | null = null;
  let dateOfBirth: string | null = null;
  if (child.dateOfBirth) {
    age = calculateAge(
      child.dateOfBirth.getMonth() + 1,
      child.dateOfBirth.getDate(),
      child.dateOfBirth.getFullYear(),
    );
    dateOfBirth = child.dateOfBirth.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  const countryLabel = child.country ? getCountryLabel(child.country) : null;
  const region = child.region?.trim() || null;
  const locationLabel = [region, countryLabel].filter(Boolean).join(", ") || null;

  const tier =
    link.protectionLevel && link.protectionLevel in PROTECTION_TIER_LABELS
      ? (link.protectionLevel as ProtectionTier)
      : null;

  const [
    subscriptionRows,
    subscriptionsCount,
    followRows,
    followingCount,
    followerRows,
    followersCount,
    postCount,
    thread,
  ] = await Promise.all([
    listActiveSubscriptionsForUser(child.id),
    countActiveSubscriptionsForUser(child.id),
    listFollowedCreatorsForUser(child.id),
    countFollowedCreatorsForUser(child.id),
    listInboundFollowersForUser(child.id),
    countInboundFollowersForUser(child.id),
    prisma.feedPost.count({ where: { userId: child.id } }),
    ensureChildChatThreadForGuardian(user.id, {
      childUserId: child.id,
      fullName,
      handleLabel,
      avatarInitials,
      avatarColor,
      avatarUrl,
      slug,
    }),
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
    const followerSlug = profile?.slug?.trim() || null;
    return {
      id: row.user.id,
      name,
      handle: displayHandle(profile?.handle ?? row.user.handle, row.user.email),
      slug: followerSlug,
      href: followerSlug ? `/feed/profile/${followerSlug}` : null,
      avatarInitials: followerInitials(name, profile?.avatarInitials),
      avatarColor: profile?.avatarColor?.trim() || "#6b9fff",
      avatarUrl: profile?.avatarUrl?.trim() || null,
      verified: Boolean(profile?.verified),
      meta: "Follower",
    };
  });

  return {
    id: child.id,
    firstName,
    fullName,
    handle,
    handleLabel,
    email: child.email,
    age,
    dateOfBirth,
    country: child.country,
    countryLabel,
    region,
    locationLabel,
    protectionLevel: tier,
    protectionLevelLabel: tier ? PROTECTION_TIER_LABELS[tier] : "Not set",
    protectionLevelDescription: protectionDescription(tier),
    linkedAtDisplay: link.linkedAt.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
    memberSince: child.createdAt.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    }),
    profileHref: slug ? `/feed/profile/${slug}` : null,
    avatarInitials,
    avatarColor,
    avatarUrl,
    statusLabel: childStatusLabel(child.onboardingStep),
    messagesHref: `/feed/messages?thread=${thread.id}`,
    activity: {
      postCount,
      followersCount,
      followingCount,
      subscriptionsCount,
    },
    social: {
      followers,
      following,
      subscriptions,
    },
  };
}
