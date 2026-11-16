import { formatChatTime } from "@/lib/feed/chat";
import {
  findOrCreatePeerInboxThread,
  findPeerInboxThread,
  getChatThreadForUser,
  peerThreadDisplayUpdate,
  previewFromBody,
  resolveSenderPeerDisplay,
  type PeerDisplay,
} from "@/lib/feed/chat-service";
import { blockStateForPeer, getDmBlockBetween, listDmBlocksForUser } from "@/lib/feed/dm-participant-controls";
import { isFollowingCreator } from "@/lib/feed/follow-service";
import type { Conversation, ConversationParticipant, MessageRequestSummary } from "@/lib/feed/messages";
import { conversationFromThread, getConversationRestriction } from "@/lib/feed/messages-with-restrictions";
import { resolveAuthorProfileSlug } from "@/lib/feed/profile-slugs";
import { MASKED_DM_BODY, MASKED_DM_PREVIEW } from "@/lib/guardian/is-user-minor";
import { prisma } from "@/lib/prisma";

type SenderThreadRef = {
  id: string;
  peerCreatorId: string | null;
  peerSlug: string | null;
  peerHandle: string;
};

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "P2002"
  );
}

/** Follow is CreatorFollow (user → the recipient's creator profile). There is no second graph. */
async function senderFollowsRecipient(senderUserId: string, recipientUserId: string) {
  const creator = await prisma.creatorUser.findFirst({
    where: { userId: recipientUserId },
    select: { id: true },
  });
  if (!creator) return false;
  return isFollowingCreator(senderUserId, creator.id);
}

/**
 * Both people already have a delivered message on the recipient's thread.
 * Sample inbox rows are backdated before the thread was created, so they do not count.
 */
async function hasDeliveredBothWays(
  senderUserId: string,
  recipientUserId: string,
  senderThread: SenderThreadRef,
) {
  const peer = await resolveSenderPeerDisplay(senderUserId, senderThread);
  if (!peer) return false;
  const recipientThread = await findPeerInboxThread(recipientUserId, peer);
  if (!recipientThread) return false;

  const thread = await prisma.chatThread.findUnique({
    where: { id: recipientThread.id },
    select: { createdAt: true },
  });
  if (!thread) return false;

  const realDelivered = {
    threadId: recipientThread.id,
    deliveryStatus: "DELIVERED" as const,
    createdAt: { gte: thread.createdAt },
  };
  const [received, sent] = await Promise.all([
    prisma.chatMessage.findFirst({
      where: { ...realDelivered, fromMe: false },
      select: { id: true },
    }),
    prisma.chatMessage.findFirst({
      where: { ...realDelivered, fromMe: true },
      select: { id: true },
    }),
  ]);
  return Boolean(received && sent);
}

/** True when an ordinary delivery must wait for the recipient to accept. */
export async function messageRequiresRequest(
  senderUserId: string,
  recipientUserId: string,
  senderThread: SenderThreadRef,
) {
  if (!recipientUserId || recipientUserId === senderUserId) return false;
  if (await senderFollowsRecipient(senderUserId, recipientUserId)) return false;

  const accepted = await prisma.directMessageRequest.findFirst({
    where: { senderUserId, recipientUserId, status: "ACCEPTED" },
    select: { id: true },
  });
  if (accepted) return false;

  if (await hasDeliveredBothWays(senderUserId, recipientUserId, senderThread)) return false;
  return true;
}

/**
 * One pending request per pair. Later sends attach to it and are not delivered.
 * Decline keeps the row (so the message does not fall into the inbox) and a new
 * send creates another request.
 */
export async function openPendingMessageRequest(senderUserId: string, recipientUserId: string) {
  const existing = await prisma.directMessageRequest.findFirst({
    where: { senderUserId, recipientUserId, status: "PENDING" },
    select: { id: true },
  });
  if (existing) return existing.id;

  try {
    const created = await prisma.directMessageRequest.create({
      data: { senderUserId, recipientUserId },
      select: { id: true },
    });
    return created.id;
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
    const raced = await prisma.directMessageRequest.findFirst({
      where: { senderUserId, recipientUserId, status: "PENDING" },
      select: { id: true },
    });
    if (!raced) throw error;
    return raced.id;
  }
}

function participantFromPeer(peer: PeerDisplay, senderUserId: string): ConversationParticipant {
  const slug = resolveAuthorProfileSlug(peer.peerHandle, peer.peerSlug);
  return {
    id: peer.peerCreatorId ?? senderUserId,
    slug: slug && slug.toLowerCase() !== "me" ? slug : undefined,
    name: peer.peerName,
    handle: peer.peerHandle,
    initials: peer.peerInitials,
    avatarColor: peer.peerAvatarColor,
    avatarUrl: peer.peerAvatarUrl,
  };
}

export async function listPendingMessageRequestsForUser(userId: string): Promise<MessageRequestSummary[]> {
  const [rows, blocks] = await Promise.all([
    prisma.directMessageRequest.findMany({
      where: { recipientUserId: userId, status: "PENDING" },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        senderUserId: true,
        updatedAt: true,
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            createdAt: true,
            thread: { select: { peerCreatorId: true } },
          },
        },
      },
    }),
    listDmBlocksForUser(userId),
  ]);

  const summaries: MessageRequestSummary[] = [];
  for (const row of rows) {
    const block = blockStateForPeer(userId, row.senderUserId, blocks);
    if (block.blockedByMe || block.blockedByThem) continue;

    const peer = await resolveSenderPeerDisplay(row.senderUserId, {
      peerCreatorId: row.messages[0]?.thread.peerCreatorId ?? null,
    });
    if (!peer) continue;

    const participant = participantFromPeer(peer, row.senderUserId);
    summaries.push({
      id: row.id,
      previewTime: formatChatTime(row.messages[0]?.createdAt ?? row.updatedAt),
      participant,
      publicSlug: participant.slug ?? null,
    });
  }
  return summaries;
}

export type MessageRequestDecision =
  | { ok: true; action: "decline" }
  | { ok: true; action: "accept"; conversation: Conversation | null }
  | { ok: false; status: number; error: string };

async function deliveryStillAllowed(
  senderUserId: string,
  recipientUserId: string,
  senderThreadId: string | null,
) {
  const sender = await prisma.user.findUnique({
    where: { id: senderUserId },
    select: { suspendedAt: true },
  });
  if (!sender || sender.suspendedAt) {
    return "This message can't be delivered.";
  }

  const block = await getDmBlockBetween(senderUserId, recipientUserId);
  if (block.blockedByMe || block.blockedByThem) {
    return "You can't receive this message.";
  }

  if (!senderThreadId) return null;
  const senderThread = await prisma.chatThread.findFirst({
    where: { id: senderThreadId, userId: senderUserId },
  });
  if (!senderThread) return null;

  const restriction = await getConversationRestriction(senderUserId, senderThread);
  if (restriction.restricted) {
    return restriction.message ?? "This message can't be delivered.";
  }
  return null;
}

export async function decideMessageRequest(
  recipientUserId: string,
  requestId: string,
  action: "accept" | "decline",
): Promise<MessageRequestDecision> {
  const request = await prisma.directMessageRequest.findFirst({
    where: { id: requestId, recipientUserId, status: "PENDING" },
    select: { id: true, senderUserId: true },
  });
  if (!request) {
    return { ok: false, status: 404, error: "That request is no longer waiting." };
  }

  if (action === "decline") {
    await prisma.$transaction([
      prisma.chatMessage.updateMany({
        where: { messageRequestId: request.id, deliveryStatus: "REQUEST_PENDING" },
        data: { deliveryStatus: "REQUEST_DECLINED" },
      }),
      prisma.directMessageRequest.update({
        where: { id: request.id },
        data: { status: "DECLINED", decidedAt: new Date() },
      }),
    ]);
    return { ok: true, action: "decline" };
  }

  const held = await prisma.chatMessage.findMany({
    where: { messageRequestId: request.id, deliveryStatus: "REQUEST_PENDING" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      body: true,
      contentMasked: true,
      threadId: true,
      thread: { select: { peerCreatorId: true } },
    },
  });

  const blockedReason = await deliveryStillAllowed(
    request.senderUserId,
    recipientUserId,
    held[0]?.threadId ?? null,
  );
  if (blockedReason) {
    return { ok: false, status: 403, error: blockedReason };
  }

  const peer = await resolveSenderPeerDisplay(request.senderUserId, {
    peerCreatorId: held[0]?.thread.peerCreatorId ?? null,
  });
  if (held.length > 0 && !peer) {
    return { ok: false, status: 409, error: "This message can't be delivered." };
  }

  const now = new Date();
  let recipientThreadId: string | null = null;
  if (held.length > 0 && peer) {
    const recipientThread = await findOrCreatePeerInboxThread(recipientUserId, peer);
    recipientThreadId = recipientThread.id;
    const last = held[held.length - 1];
    const preview = last.contentMasked ? MASKED_DM_PREVIEW : previewFromBody(last.body);

    await prisma.$transaction([
      ...held.map((message, index) =>
        prisma.chatMessage.create({
          data: {
            threadId: recipientThread.id,
            body: message.contentMasked ? MASKED_DM_BODY : message.body,
            fromMe: false,
            contentMasked: message.contentMasked,
            deliveryStatus: "DELIVERED",
            createdAt: new Date(now.getTime() + index),
          },
        }),
      ),
      prisma.chatMessage.updateMany({
        where: { messageRequestId: request.id, deliveryStatus: "REQUEST_PENDING" },
        data: { deliveryStatus: "DELIVERED" },
      }),
      prisma.directMessageRequest.update({
        where: { id: request.id },
        data: { status: "ACCEPTED", decidedAt: now },
      }),
      prisma.chatThread.update({
        where: { id: recipientThread.id },
        data: {
          preview,
          lastMessageAt: now,
          unreadCount: 0,
          ...peerThreadDisplayUpdate(peer),
        },
      }),
    ]);
  } else {
    await prisma.directMessageRequest.update({
      where: { id: request.id },
      data: { status: "ACCEPTED", decidedAt: now },
    });
  }

  if (!recipientThreadId) {
    return { ok: true, action: "accept", conversation: null };
  }

  const thread = await getChatThreadForUser(recipientUserId, recipientThreadId);
  if (!thread) {
    return { ok: true, action: "accept", conversation: null };
  }

  const conversation = await conversationFromThread(recipientUserId, thread);
  return { ok: true, action: "accept", conversation };
}
