import { randomBytes } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { getAppUrl } from "@/lib/api-helpers";
import { deleteFeedPosts } from "@/lib/feed/delete-posts";
import { moderatePostText } from "@/lib/moderation/server-text-moderation";
import { prisma } from "@/lib/prisma";
import type { AuthenticatedPartner } from "@/lib/partner-api/auth";
import type { PartnerErrorCode } from "@/lib/partner-api/http";
import type { PartnerPostInput } from "@/lib/partner-api/input";
import type { FeedAudio, FeedMedia } from "@/types/feed/feed";

export const PARTNER_POSTS_PER_MINUTE = 60;

/** Showcase profiles display a fixed demo post count rather than a live tally. */
const DEMO_COUNT_PROFILE_SOURCE = "profile-json";

const postSelect = {
  id: true,
  externalId: true,
  partnerPayloadHash: true,
  category: true,
  text: true,
  tags: true,
  mediaJson: true,
  audioJson: true,
  membersOnly: true,
  postedAt: true,
  createdAt: true,
  creator: { select: { handle: true, slug: true } },
} satisfies Prisma.FeedPostSelect;

type PartnerPostRow = Prisma.FeedPostGetPayload<{ select: typeof postSelect }>;

export type PartnerPostFailure = {
  ok: false;
  status: number;
  code: PartnerErrorCode;
  message: string;
  category?: string;
  retryAfterSeconds?: number;
};

function newPostId() {
  return `c${randomBytes(12).toString("hex")}`;
}

function postedAgoLabel(postedAt: Date) {
  const minutes = Math.floor((Date.now() - postedAt.getTime()) / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)}h`;
  if (minutes < 7 * 24 * 60) return `${Math.floor(minutes / (24 * 60))}d`;
  return `${Math.floor(minutes / (7 * 24 * 60))}w`;
}

function handleVariants(handle: string) {
  const bare = handle.replace(/^@/, "");
  return [`@${bare}`, bare].map((value) => ({ handle: { equals: value, mode: "insensitive" as const } }));
}

function profileUrl(slug: string | null) {
  return slug ? `${getAppUrl()}/feed/profile/${slug}` : null;
}

function serializeMedia(media: FeedMedia | null, audio: FeedAudio | null) {
  if (audio) {
    return {
      type: "audio",
      audio: { url: audio.audio_url ?? null, title: audio.title, duration: audio.duration, thumbnail: audio.thumbnail },
    };
  }
  if (media?.type === "video") {
    return { type: "video", video: { url: media.video_url ?? null, poster: media.images[0] ?? null } };
  }
  if (media?.images.length) return { type: media.type, images: media.images };
  return null;
}

export function serializePartnerPost(post: PartnerPostRow) {
  const media = post.mediaJson as FeedMedia | null;
  const audio = post.audioJson as FeedAudio | null;
  return {
    id: post.id,
    externalId: post.externalId,
    status: "published",
    creator: { handle: post.creator.handle, slug: post.creator.slug },
    category: post.category,
    text: post.text,
    tags: post.tags,
    membersOnly: post.membersOnly,
    postedAt: post.postedAt.toISOString(),
    createdAt: post.createdAt.toISOString(),
    media: serializeMedia(media, audio),
    location: media?.location ?? null,
    feeling: media?.feeling ?? null,
    profileUrl: profileUrl(post.creator.slug),
  };
}

function findByExternalId(partnerId: string, externalId: string) {
  return prisma.feedPost.findUnique({
    where: { partnerId_externalId: { partnerId, externalId } },
    select: postSelect,
  });
}

function replayOrConflict(existing: PartnerPostRow, payloadHash: string) {
  if (existing.partnerPayloadHash === payloadHash) {
    return { ok: true as const, created: false, post: existing };
  }
  return {
    ok: false as const,
    status: 409,
    code: "duplicate_external_id" as const,
    message: `A different post already uses externalId "${existing.externalId}".`,
  };
}

export async function listPartnerCreators(partnerId: string) {
  const links = await prisma.feedPartnerCreator.findMany({
    where: { partnerId },
    orderBy: { createdAt: "asc" },
    select: { creator: { select: { handle: true, slug: true, name: true, verified: true } } },
  });
  return links.map(({ creator }) => ({ ...creator, profileUrl: profileUrl(creator.slug) }));
}

export async function createPartnerPost(
  partner: AuthenticatedPartner,
  input: PartnerPostInput,
): Promise<{ ok: true; created: boolean; post: PartnerPostRow } | PartnerPostFailure> {
  const existing = await findByExternalId(partner.partnerId, input.externalId);
  if (existing) return replayOrConflict(existing, input.payloadHash);

  const recent = await prisma.feedPost.count({
    where: { partnerId: partner.partnerId, createdAt: { gte: new Date(Date.now() - 60_000) } },
  });
  if (recent >= PARTNER_POSTS_PER_MINUTE) {
    return {
      ok: false,
      status: 429,
      code: "rate_limited",
      message: `Limit is ${PARTNER_POSTS_PER_MINUTE} posts per minute. Try again shortly.`,
      retryAfterSeconds: 60,
    };
  }

  const link = await prisma.feedPartnerCreator.findFirst({
    where: { partnerId: partner.partnerId, creator: { OR: handleVariants(input.creatorHandle) } },
    select: { creator: { select: { id: true, userId: true, verified: true } } },
  });
  if (!link) {
    return {
      ok: false,
      status: 403,
      code: "creator_not_allowed",
      message: `This API key can't post as @${input.creatorHandle}.`,
    };
  }
  const { creator } = link;

  const authorProfile = creator.userId
    ? await prisma.userProfile.findUnique({
        where: { userId: creator.userId },
        select: { userId: true, verified: true, source: true, pinnedFeedPostIds: true, postsCountLabel: true },
      })
    : null;

  if (input.membersOnly && !creator.verified && !authorProfile?.verified) {
    return {
      ok: false,
      status: 403,
      code: "members_only_not_allowed",
      message: "Only verified creators can publish members-only posts.",
    };
  }

  if (input.text) {
    const moderation = await moderatePostText(input.text);
    if (!moderation.allowed) {
      return moderation.verificationFailed
        ? {
            ok: false,
            status: 503,
            code: "moderation_unavailable",
            message: "The text safety check is unavailable. Retry the same request shortly.",
            retryAfterSeconds: 30,
          }
        : {
            ok: false,
            status: 422,
            code: "content_blocked",
            message: "The post text failed the content safety check.",
            category: moderation.category?.toLowerCase(),
          };
    }
  }

  const postId = newPostId();
  const postedAt = input.postedAt ?? new Date();

  try {
    const post = await prisma.$transaction(async (tx) => {
      const created = await tx.feedPost.create({
        data: {
          id: postId,
          category: input.category,
          text: input.text,
          tags: input.tags,
          mediaJson: (input.media ?? undefined) as Prisma.InputJsonValue | undefined,
          audioJson: (input.audio ?? undefined) as Prisma.InputJsonValue | undefined,
          membersOnly: input.membersOnly,
          postedAt,
          postedAgo: postedAgoLabel(postedAt),
          sortOrder: 0,
          creatorId: creator.id,
          userId: creator.userId,
          partnerId: partner.partnerId,
          externalId: input.externalId,
          partnerPayloadHash: input.payloadHash,
        },
        select: postSelect,
      });

      if (authorProfile) {
        const countsLive = authorProfile.source !== DEMO_COUNT_PROFILE_SOURCE;
        await tx.userProfile.update({
          where: { userId: authorProfile.userId },
          data: {
            pinnedFeedPostIds: [postId, ...authorProfile.pinnedFeedPostIds],
            ...(countsLive ? { postsCountLabel: (authorProfile.postsCountLabel ?? 0) + 1 } : {}),
          },
        });
      }

      return created;
    });

    return { ok: true, created: true, post };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const raced = await findByExternalId(partner.partnerId, input.externalId);
      if (raced) return replayOrConflict(raced, input.payloadHash);
    }
    throw error;
  }
}

export function getPartnerPost(partnerId: string, id: string) {
  return prisma.feedPost.findFirst({ where: { id, partnerId }, select: postSelect });
}

export async function deletePartnerPost(partnerId: string, id: string) {
  const post = await prisma.feedPost.findFirst({ where: { id, partnerId }, select: { id: true } });
  if (!post) return false;
  return (await deleteFeedPosts([post.id])) > 0;
}
