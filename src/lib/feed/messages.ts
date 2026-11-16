import seedConversations from "../../../data/chat-inbox-seed.json";
import type {
  BookingConfirmationPayload,
  BookingNotePayload,
} from "@/lib/feed/booking-confirmation";
import type { MessageAttachmentPayload } from "@/lib/feed/message-attachment";
import type { PostSharePayload } from "@/lib/feed/post-share-message";

export type MessageSender = "me" | "them";

export type ChatMessage = {
  id: string;
  sender: MessageSender;
  body: string;
  time: string;
  /** True when the peer sees a safety-masked placeholder instead of the raw body. */
  contentMasked?: boolean;
  /** Present only when not delivered normally (safety hold, message request, or not delivered). */
  deliveryStatus?: "PENDING_REVIEW" | "NOT_DELIVERED" | "REQUEST_PENDING" | "REQUEST_DECLINED";
  booking?: BookingConfirmationPayload;
  bookingNote?: BookingNotePayload;
  postShare?: PostSharePayload;
  attachment?: MessageAttachmentPayload;
};

export type ConversationParticipant = {
  id: string;
  slug?: string;
  name: string;
  handle: string;
  initials: string;
  avatarColor: string;
  avatarUrl: string | null;
  online?: boolean;
};

export type Conversation = {
  id: string;
  participant: ConversationParticipant;
  preview: string;
  previewTime: string;
  unread: number;
  messages: ChatMessage[];
  dmRestricted?: boolean;
  dmRestrictedMessage?: string;
  /** New messages still arrive, but this chat does not add to the unread badge. */
  muted?: boolean;
  /** The signed-in user blocked the other person. */
  blocked?: boolean;
  /** The other person blocked the signed-in user. */
  blockedByPeer?: boolean;
  /** Public `/feed/profile/{slug}` segment. Never `me`. Null when there is no public profile. */
  publicSlug?: string | null;
  /** The other person maps to an account that can be blocked or reported. */
  peerResolvable?: boolean;
};

/** Inbox row for a message request. The message body is never included. */
export type MessageRequestSummary = {
  id: string;
  previewTime: string;
  participant: ConversationParticipant;
  publicSlug: string | null;
};

/** Seed templates for first-time chat inbox (copied into ChatThread/ChatMessage per user). */
export const CONVERSATIONS = seedConversations as Conversation[];

export function totalUnreadCount(conversations: Conversation[]) {
  return conversations.reduce((sum, conversation) => sum + conversation.unread, 0);
}
