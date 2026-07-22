import type { Conversation, ChatMessage, ConversationParticipant } from "@/lib/feed/messages";

type DbMessage = {
  id: string;
  body: string;
  fromMe: boolean;
  createdAt: Date;
};

type DbThread = {
  id: string;
  peerCreatorId: string | null;
  peerName: string;
  peerHandle: string;
  peerInitials: string;
  peerAvatarColor: string;
  peerAvatarUrl: string | null;
  peerSlug: string | null;
  peerOnline: boolean;
  preview: string | null;
  lastMessageAt: Date | null;
  unreadCount: number;
  messages: DbMessage[];
};

export function formatChatTime(date: Date, now = new Date()): string {
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function mapThreadToConversation(thread: DbThread): Conversation {
  const participant: ConversationParticipant = {
    id: thread.peerCreatorId ?? thread.id,
    slug: thread.peerSlug ?? undefined,
    name: thread.peerName,
    handle: thread.peerHandle,
    initials: thread.peerInitials,
    avatarColor: thread.peerAvatarColor,
    avatarUrl: thread.peerAvatarUrl,
    online: thread.peerOnline,
  };

  const messages: ChatMessage[] = thread.messages.map((message) => ({
    id: message.id,
    sender: message.fromMe ? "me" : "them",
    body: message.body,
    time: formatChatTime(message.createdAt),
  }));

  return {
    id: thread.id,
    participant,
    preview: thread.preview ?? messages[messages.length - 1]?.body ?? "",
    previewTime: thread.lastMessageAt ? formatChatTime(thread.lastMessageAt) : "",
    unread: thread.unreadCount,
    messages,
  };
}
