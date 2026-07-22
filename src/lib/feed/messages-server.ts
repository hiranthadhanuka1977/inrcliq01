import { mapThreadToConversation } from "@/lib/feed/chat";
import { listChatThreadsForUser } from "@/lib/feed/chat-service";
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
  const conversations = threads.map(mapThreadToConversation);
  const unreadTotal = conversations.reduce((sum, item) => sum + item.unread, 0);
  return { conversations, unreadTotal };
}
