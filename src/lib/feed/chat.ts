import type { Conversation, ChatMessage, ConversationParticipant } from "@/lib/feed/messages";
import {
  bookingMessagePreview,
  bookingNotePreview,
  parseBookingMessage,
  parseBookingNote,
  withCreatorName,
} from "@/lib/feed/booking-confirmation";

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

export function formatChatClock(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
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

  const messages: ChatMessage[] = thread.messages.map((message) => {
    const bookingRaw = parseBookingMessage(message.body);
    const booking = bookingRaw
      ? withCreatorName(bookingRaw, thread.peerName)
      : undefined;
    const bookingNoteRaw = booking ? null : parseBookingNote(message.body);
    const bookingNote = bookingNoteRaw
      ? {
          ...bookingNoteRaw,
          creatorName: bookingNoteRaw.creatorName?.trim() || thread.peerName,
        }
      : undefined;

    const isStructured = Boolean(booking || bookingNote);
    return {
      id: message.id,
      sender: message.fromMe ? "me" : "them",
      body: booking
        ? bookingMessagePreview(
            booking,
            message.fromMe ? "requester" : "provider",
            message.fromMe ? undefined : thread.peerName,
          )
        : bookingNote
          ? bookingNotePreview(bookingNote)
          : message.body,
      time: isStructured ? formatChatClock(message.createdAt) : formatChatTime(message.createdAt),
      booking,
      bookingNote,
    };
  });

  const deliverByByReference = new Map<string, string>();
  for (const message of messages) {
    if (message.booking?.reference && message.booking.deliverBy) {
      deliverByByReference.set(message.booking.reference, message.booking.deliverBy);
    }
  }
  for (const message of messages) {
    if (message.bookingNote && !message.bookingNote.deliverBy) {
      const fromBooking = deliverByByReference.get(message.bookingNote.reference);
      if (fromBooking) {
        message.bookingNote = { ...message.bookingNote, deliverBy: fromBooking };
      }
    }
  }

  const last = messages[messages.length - 1];
  const previewSource = thread.preview ?? last?.body ?? "";
  const previewBookingRaw = parseBookingMessage(previewSource);
  const previewBooking = previewBookingRaw
    ? withCreatorName(previewBookingRaw, thread.peerName)
    : null;
  const previewNote = previewBooking ? null : parseBookingNote(previewSource);

  return {
    id: thread.id,
    participant,
    preview: previewBooking
      ? bookingMessagePreview(
          previewBooking,
          last?.sender === "me" ? "requester" : "provider",
          last?.sender === "me" ? undefined : thread.peerName,
        )
      : previewNote
        ? bookingNotePreview({
            ...previewNote,
            creatorName: previewNote.creatorName?.trim() || thread.peerName,
          })
        : last?.booking
          ? bookingMessagePreview(
              last.booking,
              last.sender === "me" ? "requester" : "provider",
              last.sender === "me" ? undefined : thread.peerName,
            )
          : last?.bookingNote
            ? bookingNotePreview(last.bookingNote)
            : previewSource,
    previewTime: thread.lastMessageAt ? formatChatTime(thread.lastMessageAt) : "",
    unread: thread.unreadCount,
    messages,
  };
}
