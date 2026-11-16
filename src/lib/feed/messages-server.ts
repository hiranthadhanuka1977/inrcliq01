import { listChatThreadsForUser } from "@/lib/feed/chat-service";
import { listPendingMessageRequestsForUser } from "@/lib/feed/message-requests";
import { mapThreadsToConversationsWithRestrictions } from "@/lib/feed/messages-with-restrictions";
import type { Conversation, MessageRequestSummary } from "@/lib/feed/messages";
import { getSessionUser } from "@/lib/session";

export async function getMessagesPageData(): Promise<{
  conversations: Conversation[];
  messageRequests: MessageRequestSummary[];
  unreadTotal: number;
}> {
  const user = await getSessionUser();
  if (!user) {
    return { conversations: [], messageRequests: [], unreadTotal: 0 };
  }

  const [threads, messageRequests] = await Promise.all([
    listChatThreadsForUser(user.id),
    listPendingMessageRequestsForUser(user.id),
  ]);
  const conversations = await mapThreadsToConversationsWithRestrictions(user.id, threads);
  const unreadTotal = conversations.reduce((sum, item) => sum + item.unread, 0);
  return { conversations, messageRequests, unreadTotal };
}
