import { mapThreadToConversation } from "@/lib/feed/chat";
import { resolveReceiverUserId, type listChatThreadsForUser } from "@/lib/feed/chat-service";
import { getDirectMessagingRestriction } from "@/lib/guardian/dm-contact-controls";
import { resolvePolicyAgeZone } from "@/lib/guardian/dm-safety-policy";
import {
  getSenderMinorDmRestriction,
  minorRestrictionMessage,
} from "@/lib/guardian/sender-enforcement";
import type { Conversation } from "@/lib/feed/messages";
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

export async function mapThreadsToConversationsWithRestrictions(
  userId: string,
  threads: ChatThread[],
): Promise<Conversation[]> {
  const minorRestriction = await getSenderMinorDmRestriction(userId);
  return Promise.all(
    threads.map(async (thread) => {
      const conversation = mapThreadToConversation(thread);
      const restriction = await getConversationRestriction(userId, thread, minorRestriction);
      if (!restriction.restricted) return conversation;
      return {
        ...conversation,
        dmRestricted: true,
        dmRestrictedMessage: restriction.message,
      };
    }),
  );
}
