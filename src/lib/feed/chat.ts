import type { Conversation, ChatMessage, ConversationParticipant } from "@/lib/feed/messages";
import {
  bookingMessagePreview,
  bookingNotePreview,
  parseBookingMessage,
  parseBookingNote,
  withCreatorName,
} from "@/lib/feed/booking-confirmation";
import {
  MASKED_DM_BODY,
  MASKED_DM_PREVIEW,
  MASKED_PENDING_BODY,
  REMOVED_BODY,
  REMOVED_DM_PREVIEW,
} from "@/lib/guardian/is-user-minor";
import { resolveAuthorProfileSlug } from "@/lib/feed/profile-slugs";

type DbMessage = {
  id: string;
  body: string;
  fromMe: boolean;
  contentMasked?: boolean;
  deliveryStatus?: "DELIVERED" | "PENDING_REVIEW" | "NOT_DELIVERED";
  createdAt: Date;
};

function recipientMaskedBody(message: DbMessage) {
  if (message.deliveryStatus === "PENDING_REVIEW") return MASKED_PENDING_BODY;
  if (message.deliveryStatus === "NOT_DELIVERED") return REMOVED_BODY;
  return MASKED_DM_BODY;
}

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
    slug: resolveAuthorProfileSlug(thread.peerHandle, thread.peerSlug),
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
    const contentMasked = Boolean(message.contentMasked);
    // Never expose the raw body to the recipient when the message is safety-masked.
    const displayBody =
      contentMasked && !message.fromMe
        ? recipientMaskedBody(message)
        : booking
          ? bookingMessagePreview(
              booking,
              message.fromMe ? "requester" : "provider",
              message.fromMe ? undefined : thread.peerName,
            )
          : bookingNote
            ? bookingNotePreview(bookingNote)
            : message.body;

    return {
      id: message.id,
      sender: message.fromMe ? "me" : "them",
      body: displayBody,
      time: isStructured ? formatChatClock(message.createdAt) : formatChatTime(message.createdAt),
      contentMasked: contentMasked || undefined,
      deliveryStatus:
        message.deliveryStatus === "PENDING_REVIEW" || message.deliveryStatus === "NOT_DELIVERED"
          ? message.deliveryStatus
          : undefined,
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
  const lastDb = thread.messages[thread.messages.length - 1];
  const previewIsMasked =
    Boolean(lastDb?.contentMasked) && lastDb?.fromMe === false && !last?.booking && !last?.bookingNote;
  const previewBookingRaw = previewIsMasked ? null : parseBookingMessage(previewSource);
  const previewBooking = previewBookingRaw
    ? withCreatorName(previewBookingRaw, thread.peerName)
    : null;
  const previewNote = previewIsMasked || previewBooking ? null : parseBookingNote(previewSource);

  return {
    id: thread.id,
    participant,
    preview: previewIsMasked
      ? lastDb?.deliveryStatus === "NOT_DELIVERED"
        ? REMOVED_DM_PREVIEW
        : MASKED_DM_PREVIEW
      : previewBooking
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
