import { mapThreadToConversation } from "@/lib/feed/chat";
import type { listChatThreadsForUser } from "@/lib/feed/chat-service";
import { getDirectMessagingRestriction } from "@/lib/guardian/dm-contact-controls";
import type { Conversation } from "@/lib/feed/messages";

type ChatThread = Awaited<ReturnType<typeof listChatThreadsForUser>>[number];

export async function mapThreadsToConversationsWithRestrictions(
  userId: string,
  threads: ChatThread[],
): Promise<Conversation[]> {
  return Promise.all(
    threads.map(async (thread) => {
      const conversation = mapThreadToConversation(thread);
      const restriction = await getDirectMessagingRestriction(userId, thread);
      if (!restriction.restricted) return conversation;
      return {
        ...conversation,
        dmRestricted: true,
        dmRestrictedMessage: restriction.message,
      };
    }),
  );
}
