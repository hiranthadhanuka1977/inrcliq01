import type { AccountType, ApprovalStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { SEEDED_CREATOR_SOURCES } from "@/lib/settings/feed-dashboard";
import { formatUserName, isDemoSignupMethod } from "@/lib/settings/users";
import { AGE_ZONE_LABELS, type AgeZoneCode } from "@/lib/utils/age-zone";

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  ADULT: "Adult",
  MINOR: "Under 18",
  GUARDIAN: "Parent / guardian",
};

type LinkedUser = { id: string; name: string; email: string };

export type SettingsUserDetail = {
  id: string;
  name: string;
  email: string;
  emailVerifiedAt: Date | null;
  handle: string | null;
  accountType: AccountType;
  accountTypeLabel: string;
  ageZoneLabel: string;
  ageZoneIsStored: boolean;
  dateOfBirth: Date | null;
  country: string | null;
  region: string | null;
  signupMethod: string | null;
  isDemo: boolean;
  onboardingStep: string | null;
  hasPassword: boolean;
  loginProviders: string[];
  activeSessions: number;
  createdAt: Date;
  updatedAt: Date;
  profile: {
    slug: string | null;
    displayName: string;
    handle: string;
    bio: string;
    verified: boolean;
    source: string;
    followersLabel: string | null;
    subscriptionPriceLabel: string | null;
  } | null;
  creator: {
    name: string;
    handle: string;
    slug: string | null;
    source: string;
    verified: boolean;
    seeded: boolean;
    followers: number;
    activeSubscribers: number;
  } | null;
  activity: {
    feedPosts: number;
    following: number;
    activeSubscriptions: number;
    hiddenPosts: number;
    chatThreads: number;
  };
  guardians: LinkedUser[];
  children: LinkedUser[];
  approvalRequests: {
    id: string;
    role: "child" | "guardian";
    status: ApprovalStatus;
    parentEmail: string;
    child: LinkedUser;
    sentAt: Date;
    resolvedAt: Date | null;
  }[];
  posts: {
    id: string;
    category: string;
    text: string;
    kind: string;
    membersOnly: boolean;
    likes: number;
    comments: number;
    shares: number;
    postedAt: Date;
  }[];
};

const LINKED_USER_SELECT = { id: true, email: true, firstName: true, lastName: true } as const;

function toLinkedUser(user: { id: string; email: string; firstName: string | null; lastName: string | null }): LinkedUser {
  return { id: user.id, email: user.email, name: formatUserName(user.firstName, user.lastName) };
}

function postKind(post: { mediaJson: unknown; audioJson: unknown }) {
  if (post.audioJson) return "Audio";
  const type = (post.mediaJson as { type?: unknown } | null)?.type;
  if (type === "video") return "Video";
  if (type === "collage") return "Collage";
  if (type === "image") return "Image";
  return "Text only";
}

export async function getSettingsUserDetail(userId: string): Promise<SettingsUserDetail | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      emailVerified: true,
      firstName: true,
      lastName: true,
      handle: true,
      dateOfBirth: true,
      ageZone: true,
      country: true,
      region: true,
      accountType: true,
      signupMethod: true,
      onboardingStep: true,
      passwordHash: true,
      createdAt: true,
      updatedAt: true,
      accounts: { select: { provider: true } },
      profile: {
        select: {
          slug: true,
          displayName: true,
          handle: true,
          bio: true,
          verified: true,
          source: true,
          followersLabel: true,
          subscriptionPriceLabel: true,
        },
      },
      creatorProfile: {
        select: {
          id: true,
          name: true,
          handle: true,
          slug: true,
          source: true,
          verified: true,
          _count: { select: { follows: true } },
        },
      },
      childGuardians: { select: { guardianUser: { select: LINKED_USER_SELECT } } },
      guardianChildren: { select: { childUser: { select: LINKED_USER_SELECT } } },
      _count: {
        select: {
          follows: true,
          hiddenFeedPosts: true,
          chatThreads: true,
        },
      },
    },
  });
  if (!user) return null;

  const creatorId = user.creatorProfile?.id;
  const postWhere = creatorId ? { OR: [{ userId }, { creatorId }] } : { userId };

  const [activeSessions, activeSubscriptions, activeSubscribers, posts, approvalRequests] =
    await Promise.all([
      prisma.session.count({ where: { userId, expires: { gt: new Date() } } }),
      prisma.creatorSubscription.count({ where: { userId, status: "ACTIVE" } }),
      creatorId
        ? prisma.creatorSubscription.count({ where: { creatorId, status: "ACTIVE" } })
        : Promise.resolve(0),
      prisma.feedPost.findMany({
        where: postWhere,
        orderBy: { postedAt: "desc" },
        select: {
          id: true,
          category: true,
          text: true,
          mediaJson: true,
          audioJson: true,
          membersOnly: true,
          likes: true,
          comments: true,
          shares: true,
          postedAt: true,
        },
      }),
      prisma.parentApprovalRequest.findMany({
        where: { OR: [{ childUserId: userId }, { guardianUserId: userId }] },
        orderBy: { sentAt: "desc" },
        select: {
          id: true,
          childUserId: true,
          status: true,
          parentEmail: true,
          sentAt: true,
          resolvedAt: true,
          childUser: { select: LINKED_USER_SELECT },
        },
      }),
    ]);

  const policyZone: AgeZoneCode =
    (user.ageZone as AgeZoneCode | null) ?? (user.accountType === "MINOR" ? "KIDS" : "ADULT");

  return {
    id: user.id,
    name: formatUserName(user.firstName, user.lastName),
    email: user.email,
    emailVerifiedAt: user.emailVerified,
    handle: user.handle,
    accountType: user.accountType,
    accountTypeLabel: ACCOUNT_TYPE_LABELS[user.accountType],
    ageZoneLabel: AGE_ZONE_LABELS[policyZone],
    ageZoneIsStored: user.ageZone !== null,
    dateOfBirth: user.dateOfBirth,
    country: user.country,
    region: user.region,
    signupMethod: user.signupMethod,
    isDemo: isDemoSignupMethod(user.signupMethod),
    onboardingStep: user.onboardingStep,
    hasPassword: Boolean(user.passwordHash),
    loginProviders: [...new Set(user.accounts.map((account) => account.provider))],
    activeSessions,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    profile: user.profile,
    creator: user.creatorProfile
      ? {
          name: user.creatorProfile.name,
          handle: user.creatorProfile.handle,
          slug: user.creatorProfile.slug,
          source: user.creatorProfile.source,
          verified: user.creatorProfile.verified,
          seeded: SEEDED_CREATOR_SOURCES.includes(user.creatorProfile.source),
          followers: user.creatorProfile._count.follows,
          activeSubscribers,
        }
      : null,
    activity: {
      feedPosts: posts.length,
      following: user._count.follows,
      activeSubscriptions,
      hiddenPosts: user._count.hiddenFeedPosts,
      chatThreads: user._count.chatThreads,
    },
    guardians: user.childGuardians.map((link) => toLinkedUser(link.guardianUser)),
    children: user.guardianChildren.map((link) => toLinkedUser(link.childUser)),
    approvalRequests: approvalRequests.map((request) => ({
      id: request.id,
      role: request.childUserId === userId ? "child" : "guardian",
      status: request.status,
      parentEmail: request.parentEmail,
      child: toLinkedUser(request.childUser),
      sentAt: request.sentAt,
      resolvedAt: request.resolvedAt,
    })),
    posts: posts.map((post) => ({
      id: post.id,
      category: post.category,
      text: post.text,
      kind: postKind(post),
      membersOnly: post.membersOnly,
      likes: post.likes,
      comments: post.comments,
      shares: post.shares,
      postedAt: post.postedAt,
    })),
  };
}
