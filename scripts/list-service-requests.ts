import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { prisma } from "../src/lib/prisma";

function displayName(user: {
  firstName: string | null;
  lastName: string | null;
  email: string;
  handle: string | null;
  profile: { displayName: string | null; handle: string | null } | null;
}) {
  const profileName = user.profile?.displayName?.trim();
  const full = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return profileName || full || user.handle || user.email;
}

async function main() {
  const requests = await prisma.specialRequest.findMany({
    orderBy: [{ createdAt: "desc" }],
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          handle: true,
          profile: { select: { displayName: true, handle: true, slug: true } },
        },
      },
      creator: {
        select: {
          id: true,
          name: true,
          handle: true,
          slug: true,
          email: true,
          userId: true,
        },
      },
      _count: { select: { messages: true } },
    },
  });

  const requestIds = requests.map((r) => r.id);
  const linkedMessages =
    requestIds.length > 0
      ? await prisma.chatMessage.count({
          where: { specialRequestId: { in: requestIds } },
        })
      : 0;

  const bookingPrefixMessages = await prisma.chatMessage.count({
    where: {
      OR: [
        { body: { startsWith: "__ICQ_BOOKING__:" } },
        { body: { startsWith: "__ICQ_BOOKING_NOTE__:" } },
      ],
    },
  });

  const threadIds = [...new Set(requests.map((r) => r.threadId).filter(Boolean))] as string[];

  console.log(JSON.stringify({ summary: {
    totalRequests: requests.length,
    linkedChatMessages: linkedMessages,
    bookingStructuredMessages: bookingPrefixMessages,
    distinctThreads: threadIds.length,
  }}, null, 2));

  const requesters = new Map<
    string,
    { id: string; name: string; email: string; handle: string | null; count: number }
  >();
  const creators = new Map<
    string,
    { id: string; name: string; email: string; handle: string; slug: string | null; count: number }
  >();

  for (const req of requests) {
    const requesterKey = req.userId;
    const requesterExisting = requesters.get(requesterKey);
    if (requesterExisting) requesterExisting.count += 1;
    else {
      requesters.set(requesterKey, {
        id: req.user.id,
        name: displayName(req.user),
        email: req.user.email,
        handle: req.user.handle ?? req.user.profile?.handle ?? null,
        count: 1,
      });
    }

    const creatorExisting = creators.get(req.creatorId);
    if (creatorExisting) creatorExisting.count += 1;
    else {
      creators.set(req.creatorId, {
        id: req.creator.id,
        name: req.creator.name,
        email: req.creator.email,
        handle: req.creator.handle,
        slug: req.creator.slug,
        count: 1,
      });
    }
  }

  console.log("\nREQUESTERS:");
  console.log(JSON.stringify([...requesters.values()].sort((a, b) => b.count - a.count), null, 2));

  console.log("\nCREATORS:");
  console.log(JSON.stringify([...creators.values()].sort((a, b) => b.count - a.count), null, 2));

  console.log("\nREQUESTS:");
  console.log(
    JSON.stringify(
      requests.map((r) => ({
        reference: r.reference,
        status: r.status,
        requestLabel: r.requestLabel,
        totalFee: r.totalFee,
        currency: r.currency,
        instantBooking: r.instantBooking,
        createdAt: r.createdAt.toISOString(),
        requester: displayName(r.user),
        requesterEmail: r.user.email,
        creator: r.creator.name,
        creatorHandle: r.creator.handle,
        creatorSlug: r.creator.slug,
        linkedMessages: r._count.messages,
      })),
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
