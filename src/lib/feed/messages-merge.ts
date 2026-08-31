import type { Conversation } from "@/lib/feed/messages";

export function mergeConversationLists(
  incoming: Conversation[],
  current: Conversation[],
  activeId: string,
  activeThread: Conversation | null,
): Conversation[] {
  const currentById = new Map(current.map((conversation) => [conversation.id, conversation]));

  return incoming.map((item) => {
    if (item.id === activeId && activeThread) {
      return { ...activeThread, unread: 0 };
    }

    const previous = currentById.get(item.id);
    if (!previous) return item;

    return {
      ...item,
      messages: item.id === activeId ? (previous.messages ?? item.messages) : item.messages,
      dmRestricted: item.dmRestricted ?? previous.dmRestricted,
      dmRestrictedMessage: item.dmRestrictedMessage ?? previous.dmRestrictedMessage,
    };
  });
}
