import seedConversations from "../../../data/chat-inbox-seed.json";
import type {
  BookingConfirmationPayload,
  BookingNotePayload,
} from "@/lib/feed/booking-confirmation";

export type MessageSender = "me" | "them";

export type ChatMessage = {
  id: string;
  sender: MessageSender;
  body: string;
  time: string;
  /** True when the peer sees a safety-masked placeholder instead of the raw body. */
  contentMasked?: boolean;
  booking?: BookingConfirmationPayload;
  bookingNote?: BookingNotePayload;
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
};

/** Seed templates for first-time chat inbox (copied into ChatThread/ChatMessage per user). */
export const CONVERSATIONS = seedConversations as Conversation[];

export function totalUnreadCount(conversations: Conversation[]) {
  return conversations.reduce((sum, conversation) => sum + conversation.unread, 0);
}
