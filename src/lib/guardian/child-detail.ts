import { AccountType } from "@/generated/prisma/client";
import type { AccountSocialPerson } from "@/lib/feed/account-profile";
import { ensureChildChatThreadForGuardian, seedDefaultChatThreadsForUser } from "@/lib/feed/chat-service";
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
import {
  getDmContactControlsForThread,
  type DmContactGuardianSettings,
} from "@/lib/guardian/dm-contact-controls";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { calculateAge } from "@/lib/utils/age";

export type ChildDmContact = {
  id: string;
  name: string;
  handle: string;
  href: string | null;
  avatarInitials: string;
  avatarColor: string;
  avatarUrl: string | null;
  lastMessagePreview: string | null;
  lastActiveLabel: string | null;
};

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
  dmPolicySummary: string;
  dmContacts: ChildDmContact[];
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

function dmPolicySummary(tier: ProtectionTier | null) {
  if (!tier) return "Direct messaging status is not set for this account.";
  if (tier === "strict") return "Direct messaging is off under strict protection.";
  if (tier === "relaxed") return "Direct messaging is allowed with standard moderation.";
  return "Direct messaging is limited to approved contacts.";
}

function formatDmLastActive(value: Date | null) {
  if (!value) return null;

  const diffMs = Date.now() - value.getTime();
  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  if (diffMinutes < 1) return "Active just now";
  if (diffMinutes < 60) return `Active ${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Active ${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Active yesterday";
  if (diffDays < 7) return `Active ${diffDays}d ago`;

  return `Active ${value.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

export async function listChildDmContacts(childUserId: string, firstName: string): Promise<ChildDmContact[]> {
  await seedDefaultChatThreadsForUser(childUserId, { firstName });

  const threads = await prisma.chatThread.findMany({
    where: {
      userId: childUserId,
      NOT: { seedKey: { startsWith: "guardian:" } },
    },
    orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      peerName: true,
      peerHandle: true,
      peerSlug: true,
      peerInitials: true,
      peerAvatarColor: true,
      peerAvatarUrl: true,
      preview: true,
      lastMessageAt: true,
    },
  });

  return threads.map((thread) => ({
    id: thread.id,
    name: thread.peerName,
    handle: thread.peerHandle,
    href: thread.peerSlug ? `/feed/profile/${thread.peerSlug}` : null,
    avatarInitials: thread.peerInitials,
    avatarColor: thread.peerAvatarColor?.trim() || "#6b9fff",
    avatarUrl: thread.peerAvatarUrl,
    lastMessagePreview: thread.preview,
    lastActiveLabel: formatDmLastActive(thread.lastMessageAt),
  }));
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
    dmContacts,
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
    listChildDmContacts(child.id, firstName),
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
    dmPolicySummary: dmPolicySummary(tier),
    dmContacts,
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

export type DmContactActivityItem = {
  id: string;
  title: string;
  detail: string;
  timeAgo: string;
  dayLabel: string;
  type: "message" | "media" | "reaction" | "system";
};

export type ChildDmContactDetailData = {
  child: {
    id: string;
    firstName: string;
    fullName: string;
    handleLabel: string;
  };
  contact: ChildDmContact;
  activity: DmContactActivityItem[];
  settings: DmContactGuardianSettings;
};

function hashContactSeed(contactId: string) {
  let hash = 0;
  for (let i = 0; i < contactId.length; i += 1) {
    hash = (hash + contactId.charCodeAt(i) * (i + 1)) % 997;
  }
  return hash;
}

function staticDmContactActivity(
  contactId: string,
  contactName: string,
  childFirstName: string,
): DmContactActivityItem[] {
  const hash = hashContactSeed(contactId);

  const templates: Omit<DmContactActivityItem, "id">[] = [
    {
      title: "Message activity",
      detail: `${childFirstName} sent a message in this conversation. Content is not shown here.`,
      timeAgo: "2h ago",
      dayLabel: "Today",
      type: "message",
    },
    {
      title: "Message activity",
      detail: `${contactName} replied in this thread. Content is not shown here.`,
      timeAgo: "5h ago",
      dayLabel: "Today",
      type: "message",
    },
    {
      title: "Reaction added",
      detail: `${childFirstName} reacted to a message in this conversation.`,
      timeAgo: "Yesterday",
      dayLabel: "Yesterday",
      type: "reaction",
    },
    {
      title: "Photo shared",
      detail: "An image was shared in this thread. A safe preview is available in Safety alerts if needed.",
      timeAgo: "2d ago",
      dayLabel: "Yesterday",
      type: "media",
    },
    {
      title: "Conversation started",
      detail: `${childFirstName} opened a direct message thread with ${contactName}.`,
      timeAgo: "Jul 31",
      dayLabel: "Jul 31",
      type: "system",
    },
    {
      title: "Contact approved",
      detail: "This contact was added to the approved messaging list for this account.",
      timeAgo: "Aug 1",
      dayLabel: "Aug 1",
      type: "system",
    },
  ];

  const count = 4 + (hash % 2);
  const start = hash % templates.length;

  return Array.from({ length: count }, (_, index) => {
    const template = templates[(start + index) % templates.length]!;
    return {
      id: `${contactId}-activity-${index}`,
      ...template,
    };
  });
}

export async function getChildDmContactDetailForGuardian(
  childUserId: string,
  threadId: string,
): Promise<ChildDmContactDetailData | null> {
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
          accountType: true,
          profile: {
            select: {
              displayName: true,
              slug: true,
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

  const thread = await prisma.chatThread.findFirst({
    where: {
      id: threadId,
      userId: childUserId,
      NOT: { seedKey: { startsWith: "guardian:" } },
    },
    select: {
      id: true,
      peerName: true,
      peerHandle: true,
      peerSlug: true,
      peerInitials: true,
      peerAvatarColor: true,
      peerAvatarUrl: true,
      preview: true,
      lastMessageAt: true,
    },
  });

  if (!thread) return null;

  const contact: ChildDmContact = {
    id: thread.id,
    name: thread.peerName,
    handle: thread.peerHandle,
    href: thread.peerSlug ? `/feed/profile/${thread.peerSlug}` : null,
    avatarInitials: thread.peerInitials,
    avatarColor: thread.peerAvatarColor?.trim() || "#6b9fff",
    avatarUrl: thread.peerAvatarUrl,
    lastMessagePreview: thread.preview,
    lastActiveLabel: formatDmLastActive(thread.lastMessageAt),
  };

  return {
    child: {
      id: child.id,
      firstName,
      fullName,
      handleLabel,
    },
    contact,
    activity: staticDmContactActivity(thread.id, contact.name, firstName),
    settings: await getDmContactControlsForThread(child.id, thread.id),
  };
}
