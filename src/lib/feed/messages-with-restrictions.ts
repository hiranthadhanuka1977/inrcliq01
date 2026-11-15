import { mapThreadToConversation } from "@/lib/feed/chat";
import { shareStill } from "@/lib/feed/post-share-message";
import { readFeedAudios } from "@/lib/feed/read-audios";
import { resolveReceiverUserId, type listChatThreadsForUser } from "@/lib/feed/chat-service";
import { blockStateForPeer, listDmBlocksForUser } from "@/lib/feed/dm-participant-controls";
import { getDirectMessagingRestriction } from "@/lib/guardian/dm-contact-controls";
import { resolvePolicyAgeZone } from "@/lib/guardian/dm-safety-policy";
import {
  getSenderMinorDmRestriction,
  minorRestrictionMessage,
} from "@/lib/guardian/sender-enforcement";
import type { Conversation } from "@/lib/feed/messages";
import type { FeedMedia } from "@/types/feed/feed";
import { prisma } from "@/lib/prisma";
import { isMinorAgeZone } from "@/lib/utils/age-zone";

type ChatThread = Awaited<ReturnType<typeof listChatThreadsForUser>>[number];
type ThreadPeerRef = Parameters<typeof getDirectMessagingRestriction>[1];
type MinorRestriction = Awaited<ReturnType<typeof getSenderMinorDmRestriction>>;

async function receiverIsMinor(thread: ThreadPeerRef) {
  const receiverUserId = await resolveReceiverUserId(thread);
  if (!receiverUserId) return false;
  const receiver = await prisma.user.findUnique({
    where: { id: receiverUserId },
    select: { dateOfBirth: true, accountType: true },
  });
  return Boolean(receiver && isMinorAgeZone(resolvePolicyAgeZone(receiver).zone));
}

/**
 * Composer restriction for a conversation: guardian contact controls, then the sender's
 * minors-only safety restriction. Pass `minorRestriction` to reuse one lookup across threads.
 */
export async function getConversationRestriction(
  userId: string,
  thread: ThreadPeerRef,
  minorRestriction?: MinorRestriction,
): Promise<{ restricted: boolean; message?: string }> {
  const contact = await getDirectMessagingRestriction(userId, thread);
  if (contact.restricted) return contact;

  const restriction =
    minorRestriction === undefined ? await getSenderMinorDmRestriction(userId) : minorRestriction;
  if (!restriction || !(await receiverIsMinor(thread))) return { restricted: false };
  return { restricted: true, message: minorRestrictionMessage(restriction.endsAt) };
}

function normalizePublicSlug(value: string | null | undefined) {
  const slug = value?.trim().replace(/^@/, "") ?? "";
  if (!slug || slug.toLowerCase() === "me") return null;
  return slug;
}

function handleKeys(value: string | null | undefined) {
  const raw = value?.trim() ?? "";
  if (!raw) return [];
  const bare = raw.replace(/^@/, "");
  if (!bare || bare.toLowerCase() === "me") return [];
  return [raw.toLowerCase(), bare.toLowerCase(), `@${bare}`.toLowerCase()];
}

async function loadPublicSlugIndex(
  threads: Array<{ peerSlug: string | null; peerHandle: string; peerCreatorId: string | null }>,
) {
  const slugKeys = new Set<string>();
  const handleKeysWanted = new Set<string>();
  const creatorIds: string[] = [];
  for (const thread of threads) {
    const slug = normalizePublicSlug(thread.peerSlug);
    if (slug) slugKeys.add(slug);
    for (const key of handleKeys(thread.peerHandle)) handleKeysWanted.add(key);
    if (thread.peerCreatorId) creatorIds.push(thread.peerCreatorId);
  }

  const bySlug = new Map<string, string>();
  const byHandle = new Map<string, string>();
  const byCreatorId = new Map<string, string>();
  const slugs = [...slugKeys];
  const handles = [...handleKeysWanted];

  function remember(slug: string | null | undefined, handle: string | null | undefined, creatorId?: string) {
    const canonical = normalizePublicSlug(slug);
    if (!canonical) return;
    bySlug.set(canonical.toLowerCase(), canonical);
    for (const key of handleKeys(handle)) byHandle.set(key, canonical);
    if (creatorId) byCreatorId.set(creatorId, canonical);
  }

  if (slugs.length > 0) {
    const [profiles, creators] = await Promise.all([
      prisma.userProfile.findMany({
        where: {
          OR: slugs.map((slug) => ({ slug: { equals: slug, mode: "insensitive" as const } })),
        },
        select: { slug: true, handle: true },
      }),
      prisma.creatorUser.findMany({
        where: {
          OR: slugs.map((slug) => ({ slug: { equals: slug, mode: "insensitive" as const } })),
        },
        select: { id: true, slug: true, handle: true },
      }),
    ]);
    for (const row of profiles) remember(row.slug, row.handle);
    for (const row of creators) remember(row.slug, row.handle, row.id);
  }

  if (handles.length > 0) {
    const [profiles, creators] = await Promise.all([
      prisma.userProfile.findMany({
        where: {
          OR: handles.map((handle) => ({ handle: { equals: handle, mode: "insensitive" as const } })),
        },
        select: { slug: true, handle: true },
      }),
      prisma.creatorUser.findMany({
        where: {
          OR: handles.map((handle) => ({ handle: { equals: handle, mode: "insensitive" as const } })),
        },
        select: { id: true, slug: true, handle: true },
      }),
    ]);
    for (const row of profiles) remember(row.slug, row.handle);
    for (const row of creators) remember(row.slug, row.handle, row.id);
  }

  const missingCreatorIds = creatorIds.filter((id) => !byCreatorId.has(id));
  if (missingCreatorIds.length > 0) {
    const creators = await prisma.creatorUser.findMany({
      where: { id: { in: missingCreatorIds } },
      select: { id: true, slug: true, handle: true },
    });
    for (const row of creators) remember(row.slug, row.handle, row.id);
  }

  return { bySlug, byHandle, byCreatorId };
}

function publicSlugForThread(
  thread: { peerSlug: string | null; peerHandle: string; peerCreatorId: string | null },
  index: Awaited<ReturnType<typeof loadPublicSlugIndex>>,
) {
  const fromPeer = normalizePublicSlug(thread.peerSlug);
  if (fromPeer) {
    const known = index.bySlug.get(fromPeer.toLowerCase());
    if (known) return known;
  }
  if (thread.peerCreatorId) {
    const fromCreator = index.byCreatorId.get(thread.peerCreatorId);
    if (fromCreator) return fromCreator;
  }
  for (const key of handleKeys(thread.peerHandle)) {
    const fromHandle = index.byHandle.get(key);
    if (fromHandle) return fromHandle;
  }
  return null;
}

export async function mapThreadsToConversationsWithRestrictions(
  userId: string,
  threads: ChatThread[],
): Promise<Conversation[]> {
  const [minorRestriction, blocks, publicSlugs] = await Promise.all([
    getSenderMinorDmRestriction(userId),
    listDmBlocksForUser(userId),
    loadPublicSlugIndex(threads),
  ]);

  const conversations = await Promise.all(
    threads.map(async (thread) => {
      const [conversation, restriction, peerUserId] = await Promise.all([
        Promise.resolve(mapThreadToConversation(thread)),
        getConversationRestriction(userId, thread, minorRestriction),
        resolveReceiverUserId(thread),
      ]);
      const block = blockStateForPeer(userId, peerUserId, blocks);
      return {
        ...conversation,
        muted: thread.notificationsMuted,
        blocked: block.blockedByMe,
        blockedByPeer: block.blockedByThem,
        publicSlug: publicSlugForThread(thread, publicSlugs),
        peerResolvable: Boolean(peerUserId && peerUserId !== userId),
        dmRestricted: restriction.restricted,
        dmRestrictedMessage: restriction.restricted ? restriction.message : undefined,
      };
    }),
  );
  return withShareThumbnails(conversations);
}

/** Older shares stored no picture. Fill a still from the post so the card can show one. */
async function withShareThumbnails(conversations: Conversation[]): Promise<Conversation[]> {
  const missing = new Set<string>();
  for (const conversation of conversations) {
    for (const message of conversation.messages) {
      const share = message.postShare;
      if (share && !share.membersOnly && !share.imageUrl && !share.videoUrl) missing.add(share.postId);
    }
  }
  if (missing.size === 0) return conversations;

  const rows = await prisma.feedPost.findMany({
    where: { id: { in: [...missing] } },
    select: { id: true, mediaJson: true, audioJson: true, membersOnly: true },
  });
  const stills = new Map(
    rows.map((row) => [
      row.id,
      shareStill({
        membersOnly: row.membersOnly,
        media: (row.mediaJson as FeedMedia | null) ?? null,
        audios: readFeedAudios(row.audioJson),
      }),
    ]),
  );

  return conversations.map((conversation) => ({
    ...conversation,
    messages: conversation.messages.map((message) => {
      const share = message.postShare;
      const still = share ? stills.get(share.postId) : undefined;
      if (!share || !still || share.imageUrl || share.videoUrl) return message;
      return {
        ...message,
        postShare: {
          ...share,
          imageUrl: still.imageUrl,
          imageAlt: share.imageAlt || still.imageAlt,
          videoUrl: still.videoUrl,
          hasVideo: share.hasVideo || still.hasVideo,
        },
      };
    }),
  }));
}

export async function conversationFromThread(userId: string, thread: ChatThread) {
  const [conversation] = await mapThreadsToConversationsWithRestrictions(userId, [thread]);
  return conversation;
}
