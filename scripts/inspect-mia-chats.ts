import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { prisma } from "../src/lib/prisma";
import {
  BOOKING_MESSAGE_PREFIX,
  BOOKING_NOTE_PREFIX,
  parseBookingMessage,
  parseBookingNote,
} from "../src/lib/feed/booking-confirmation";

async function main() {
  const mia = await prisma.creatorUser.findFirst({
    where: { OR: [{ slug: "mia-chen" }, { handle: { contains: "miachenruns", mode: "insensitive" } }] },
    select: { id: true, name: true, userId: true, email: true },
  });

  if (!mia?.userId) {
    console.log("Mia Chen owner user not found");
    return;
  }

  console.log("Mia:", mia);

  const threads = await prisma.chatThread.findMany({
    where: { userId: mia.userId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
    orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
  });

  console.log(`\nThreads for Mia (${threads.length}):`);
  for (const t of threads) {
    const bookingMsgs = t.messages.filter(
      (m) =>
        m.specialRequestId ||
        m.body.startsWith(BOOKING_MESSAGE_PREFIX) ||
        m.body.startsWith(BOOKING_NOTE_PREFIX) ||
        parseBookingMessage(m.body) ||
        parseBookingNote(m.body) ||
        /Received by|· [A-Z0-9]{6,}/i.test(m.body),
    );

    console.log({
      id: t.id,
      peerName: t.peerName,
      peerHandle: t.peerHandle,
      preview: t.preview,
      lastMessageAt: t.lastMessageAt,
      messageCount: t.messages.length,
      bookingLikeCount: bookingMsgs.length,
      lastBodies: t.messages.slice(-2).map((m) => m.body.slice(0, 120)),
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
