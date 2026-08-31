/**
 * Remove all SpecialRequest rows and related chat messages.
 * Usage: npx tsx scripts/clear-service-requests.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import {
  BOOKING_MESSAGE_PREFIX,
  BOOKING_NOTE_PREFIX,
  bookingMessagePreview,
  bookingNotePreview,
  parseBookingMessage,
  parseBookingNote,
} from "../src/lib/feed/booking-confirmation";
import { prisma } from "../src/lib/prisma";

function previewFromBody(body: string) {
  const trimmed = body.trim();
  if (trimmed.length <= 140) return trimmed;
  return `${trimmed.slice(0, 137)}…`;
}

function previewForMessage(body: string, fromMe: boolean, peerName: string) {
  const booking = parseBookingMessage(body);
  if (booking) {
    return bookingMessagePreview(
      booking,
      fromMe ? "requester" : "provider",
      fromMe ? undefined : peerName,
    );
  }

  const note = parseBookingNote(body);
  if (note) {
    return bookingNotePreview({
      ...note,
      creatorName: note.creatorName?.trim() || peerName,
    });
  }

  return previewFromBody(body);
}

async function refreshThread(threadId: string) {
  const thread = await prisma.chatThread.findUnique({
    where: { id: threadId },
    select: { id: true, peerName: true },
  });
  if (!thread) return;

  const last = await prisma.chatMessage.findFirst({
    where: { threadId },
    orderBy: { createdAt: "desc" },
    select: { body: true, fromMe: true, createdAt: true },
  });

  await prisma.chatThread.update({
    where: { id: threadId },
    data: {
      preview: last ? previewForMessage(last.body, last.fromMe, thread.peerName) : null,
      lastMessageAt: last?.createdAt ?? null,
      unreadCount: 0,
    },
  });
}

async function main() {
  const beforeRequests = await prisma.specialRequest.count();
  const beforeLinkedMessages = await prisma.chatMessage.count({
    where: { specialRequestId: { not: null } },
  });
  const beforeBookingMessages = await prisma.chatMessage.count({
    where: {
      OR: [
        { body: { startsWith: BOOKING_MESSAGE_PREFIX } },
        { body: { startsWith: BOOKING_NOTE_PREFIX } },
      ],
    },
  });

  const requests = await prisma.specialRequest.findMany({
    select: { id: true, threadId: true },
  });
  const requestThreadIds = [...new Set(requests.map((r) => r.threadId).filter(Boolean))] as string[];

  const bookingMessageThreads = await prisma.chatMessage.findMany({
    where: {
      OR: [
        { specialRequestId: { not: null } },
        { body: { startsWith: BOOKING_MESSAGE_PREFIX } },
        { body: { startsWith: BOOKING_NOTE_PREFIX } },
      ],
    },
    select: { threadId: true },
    distinct: ["threadId"],
  });
  const affectedThreadIds = [
    ...new Set([...requestThreadIds, ...bookingMessageThreads.map((m) => m.threadId)]),
  ];

  await prisma.$transaction(async (tx) => {
    const deletedMessages = await tx.chatMessage.deleteMany({
      where: {
        OR: [
          { specialRequestId: { not: null } },
          { body: { startsWith: BOOKING_MESSAGE_PREFIX } },
          { body: { startsWith: BOOKING_NOTE_PREFIX } },
        ],
      },
    });

    const deletedRequests = await tx.specialRequest.deleteMany({});

    console.log(
      JSON.stringify(
        {
          deleted: {
            specialRequests: deletedRequests.count,
            chatMessages: deletedMessages.count,
          },
          before: {
            specialRequests: beforeRequests,
            linkedChatMessages: beforeLinkedMessages,
            bookingStructuredMessages: beforeBookingMessages,
          },
          threadsToRefresh: affectedThreadIds.length,
        },
        null,
        2,
      ),
    );
  });

  for (const threadId of affectedThreadIds) {
    await refreshThread(threadId);
  }

  const afterRequests = await prisma.specialRequest.count();
  const afterBookingMessages = await prisma.chatMessage.count({
    where: {
      OR: [
        { body: { startsWith: BOOKING_MESSAGE_PREFIX } },
        { body: { startsWith: BOOKING_NOTE_PREFIX } },
      ],
    },
  });

  console.log(
    JSON.stringify(
      {
        after: {
          specialRequests: afterRequests,
          bookingStructuredMessages: afterBookingMessages,
        },
        refreshedThreads: affectedThreadIds.length,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
