import { prisma } from "@/lib/prisma";
import { CONVERSATIONS } from "@/lib/feed/messages";

type SeedMessage = {
  body: string;
  fromMe: boolean;
  createdAt: Date;
};

function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

function daysAgo(days: number) {
  return hoursAgo(days * 24);
}

/** Approximate createdAt from mock display strings. */
function seedCreatedAt(time: string, index: number, total: number): Date {
  const lower = time.toLowerCase();
  if (lower.includes("just now") || lower.includes("2m")) return hoursAgo(0.03);
  if (lower.includes("1h")) return hoursAgo(1);
  if (lower.includes("yesterday")) return hoursAgo(20 - index);
  if (lower.includes("last week")) return daysAgo(7);
  if (lower.includes("tue")) return daysAgo(3);
  if (lower.includes("mon")) return daysAgo(4);
  if (lower.includes("mar")) return daysAgo(30);
  return hoursAgo(total - index);
}

function personalizeSeedBody(body: string, firstName: string) {
  return body.replace(/\bDhanuka\b/g, firstName);
}

async function resolveUserFirstName(userId: string, firstName?: string | null) {
  if (firstName?.trim()) return firstName.trim();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { firstName: true },
  });
  return user?.firstName?.trim() || "there";
}

async function adoptLegacyThread(userId: string, seedKey: string, conversation: (typeof CONVERSATIONS)[number]) {
  const legacy = await prisma.chatThread.findFirst({
    where: {
      userId,
      seedKey: null,
      OR: [
        conversation.participant.slug ? { peerSlug: conversation.participant.slug } : undefined,
        { peerHandle: conversation.participant.handle },
      ].filter(Boolean) as Array<{ peerSlug?: string; peerHandle?: string }>,
    },
  });

  if (!legacy) return false;

  await prisma.chatThread.update({
    where: { id: legacy.id },
    data: { seedKey },
  });
  return true;
}

/**
 * Copy the default inbox template into per-user chat rows.
 * Safe to call multiple times — each template is seeded once per user.
 */
export async function seedDefaultChatThreadsForUser(
  userId: string,
  options?: { firstName?: string | null },
) {
  const firstName = await resolveUserFirstName(userId, options?.firstName);

  for (const conversation of CONVERSATIONS) {
    const existing = await prisma.chatThread.findFirst({
      where: { userId, seedKey: conversation.id },
      select: { id: true },
    });
    if (existing) continue;

    if (await adoptLegacyThread(userId, conversation.id, conversation)) {
      continue;
    }

    const creator = conversation.participant.slug
      ? await prisma.creatorUser.findFirst({
          where: {
            OR: [
              { slug: conversation.participant.slug },
              { handle: conversation.participant.handle },
            ],
          },
        })
      : null;

    const messages: SeedMessage[] = conversation.messages.map((message, index) => ({
      body: personalizeSeedBody(message.body, firstName),
      fromMe: message.sender === "me",
      createdAt: seedCreatedAt(message.time, index, conversation.messages.length),
    }));

    const last = messages[messages.length - 1];

    await prisma.chatThread.create({
      data: {
        userId,
        seedKey: conversation.id,
        peerCreatorId: creator?.id ?? null,
        peerName: creator?.name ?? conversation.participant.name,
        peerHandle: creator?.handle ?? conversation.participant.handle,
        peerInitials: creator?.avatarInitials ?? conversation.participant.initials,
        peerAvatarColor: creator?.avatarColor ?? conversation.participant.avatarColor,
        peerAvatarUrl: creator?.avatarUrl ?? conversation.participant.avatarUrl,
        peerSlug: creator?.slug ?? conversation.participant.slug ?? null,
        peerOnline: Boolean(conversation.participant.online),
        preview: last ? personalizeSeedBody(last.body, firstName) : conversation.preview,
        lastMessageAt: last?.createdAt ?? new Date(),
        unreadCount: conversation.unread,
        messages: {
          create: messages.map((message) => ({
            body: message.body,
            fromMe: message.fromMe,
            createdAt: message.createdAt,
          })),
        },
      },
    });
  }
}

export async function listChatThreadsForUser(userId: string) {
  await seedDefaultChatThreadsForUser(userId);

  return prisma.chatThread.findMany({
    where: { userId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
    orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
  });
}

export async function getChatThreadForUser(userId: string, threadId: string) {
  return prisma.chatThread.findFirst({
    where: { id: threadId, userId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
}

export async function markThreadRead(userId: string, threadId: string) {
  await prisma.chatThread.updateMany({
    where: { id: threadId, userId },
    data: { unreadCount: 0 },
  });
}

export async function sendChatMessage(userId: string, threadId: string, body: string) {
  const thread = await prisma.chatThread.findFirst({
    where: { id: threadId, userId },
  });
  if (!thread) return null;

  const trimmed = body.trim();
  if (!trimmed) return null;

  const [message] = await prisma.$transaction([
    prisma.chatMessage.create({
      data: {
        threadId,
        body: trimmed,
        fromMe: true,
      },
    }),
    prisma.chatThread.update({
      where: { id: threadId },
      data: {
        preview: trimmed,
        lastMessageAt: new Date(),
        unreadCount: 0,
      },
    }),
  ]);

  return getChatThreadForUser(userId, threadId).then((fresh) => ({
    thread: fresh,
    message,
  }));
}
