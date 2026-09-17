import { listChatThreadsForUser } from "@/lib/feed/chat-service";
import { mapThreadsToConversationsWithRestrictions } from "@/lib/feed/messages-with-restrictions";
import type { Conversation } from "@/lib/feed/messages";
import { getSessionUser } from "@/lib/session";

export async function getMessagesPageData(): Promise<{
  conversations: Conversation[];
  unreadTotal: number;
}> {
  const user = await getSessionUser();
  if (!user) {
    return { conversations: [], unreadTotal: 0 };
  }

  const threads = await listChatThreadsForUser(user.id);
  const conversations = await mapThreadsToConversationsWithRestrictions(user.id, threads);
  const unreadTotal = conversations.reduce((sum, item) => sum + item.unread, 0);
  return { conversations, unreadTotal };
}
