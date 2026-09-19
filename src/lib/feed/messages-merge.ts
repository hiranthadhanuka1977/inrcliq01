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

    // Prefer whichever side has the newer/longer message list so newly mirrored
    // (and masked) messages are not stuck behind a stale client cache.
    const incomingCount = item.messages?.length ?? 0;
    const previousCount = previous.messages?.length ?? 0;
    const messages =
      item.id === activeId && previousCount > incomingCount
        ? previous.messages
        : item.messages;

    return {
      ...item,
      messages,
      dmRestricted: item.dmRestricted ?? previous.dmRestricted,
      dmRestrictedMessage: item.dmRestrictedMessage ?? previous.dmRestrictedMessage,
    };
  });
}
