import { prisma } from "@/lib/prisma";
import { CONVERSATIONS } from "@/lib/feed/messages";
import { resolveAuthorProfileSlug } from "@/lib/feed/profile-slugs";

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
        peerSlug:
          creator?.slug ??
          conversation.participant.slug ??
          resolveAuthorProfileSlug(conversation.participant.handle),
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

function initialsFromName(name: string) {
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
  return initials || "??";
}

function normalizeHandle(value: string | null | undefined, fallback: string) {
  const raw = value?.trim() || "";
  if (raw) return raw.startsWith("@") ? raw : `@${raw}`;
  const cleaned = fallback.replace(/^@/, "").trim() || "user";
  return `@${cleaned}`;
}

function previewFromBody(body: string) {
  const trimmed = body.trim();
  if (trimmed.length <= 140) return trimmed;
  return `${trimmed.slice(0, 137)}…`;
}

type PeerDisplay = {
  peerCreatorId: string | null;
  peerName: string;
  peerHandle: string;
  peerInitials: string;
  peerAvatarColor: string;
  peerAvatarUrl: string | null;
  peerSlug: string | null;
};

async function peerDisplayFromUser(userId: string): Promise<PeerDisplay | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      firstName: true,
      lastName: true,
      handle: true,
      profile: {
        select: {
          displayName: true,
          handle: true,
          slug: true,
          avatarInitials: true,
          avatarColor: true,
          avatarUrl: true,
        },
      },
    },
  });
  if (!user) return null;

  const name =
    user.profile?.displayName?.trim() ||
    `${user.firstName?.trim() || ""} ${user.lastName?.trim() || ""}`.trim() ||
    "Member";
  const handle = normalizeHandle(
    user.profile?.handle || user.handle,
    name.toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 24) || "member",
  );

  return {
    peerCreatorId: null,
    peerName: name,
    peerHandle: handle,
    peerInitials: user.profile?.avatarInitials?.trim() || initialsFromName(name),
    peerAvatarColor: user.profile?.avatarColor?.trim() || "#6b9fff",
    peerAvatarUrl: user.profile?.avatarUrl?.trim() || null,
    peerSlug: user.profile?.slug?.trim() || resolveAuthorProfileSlug(handle),
  };
}

async function peerDisplayFromCreatorOwner(userId: string): Promise<PeerDisplay | null> {
  const creator = await prisma.creatorUser.findFirst({
    where: { userId },
    select: {
      id: true,
      name: true,
      handle: true,
      slug: true,
      avatarInitials: true,
      avatarColor: true,
      avatarUrl: true,
    },
  });
  if (!creator) return null;

  return {
    peerCreatorId: creator.id,
    peerName: creator.name,
    peerHandle: creator.handle,
    peerInitials: creator.avatarInitials,
    peerAvatarColor: creator.avatarColor,
    peerAvatarUrl: creator.avatarUrl,
    peerSlug: creator.slug?.trim() || resolveAuthorProfileSlug(creator.handle),
  };
}

export async function resolveReceiverUserId(thread: {
  peerCreatorId: string | null;
  peerSlug: string | null;
  peerHandle: string;
}): Promise<string | null> {
  if (thread.peerCreatorId) {
    const creator = await prisma.creatorUser.findUnique({
      where: { id: thread.peerCreatorId },
      select: { userId: true },
    });
    return creator?.userId ?? null;
  }

  const slug = thread.peerSlug?.trim();
  if (slug) {
    const bySlug = await prisma.userProfile.findFirst({
      where: { slug: { equals: slug, mode: "insensitive" } },
      select: { userId: true },
    });
    if (bySlug?.userId) return bySlug.userId;
  }

  const handle = thread.peerHandle?.trim();
  if (!handle) return null;
  const normalized = handle.replace(/^@/, "");
  const handleFilters = [
    { equals: handle, mode: "insensitive" as const },
    { equals: `@${normalized}`, mode: "insensitive" as const },
    { equals: normalized, mode: "insensitive" as const },
  ];

  const byUserHandle = await prisma.user.findFirst({
    where: { OR: handleFilters.map((equals) => ({ handle: equals })) },
    select: { id: true },
  });
  if (byUserHandle?.id) return byUserHandle.id;

  const byProfileHandle = await prisma.userProfile.findFirst({
    where: { OR: handleFilters.map((equals) => ({ handle: equals })) },
    select: { userId: true },
  });
  return byProfileHandle?.userId ?? null;
}

async function findOrCreatePeerInboxThread(receiverUserId: string, peer: PeerDisplay) {
  if (peer.peerCreatorId) {
    const byCreator = await prisma.chatThread.findFirst({
      where: { userId: receiverUserId, peerCreatorId: peer.peerCreatorId },
      select: { id: true },
    });
    if (byCreator) return byCreator;
  }

  const orFilters = [
    peer.peerSlug
      ? { peerSlug: { equals: peer.peerSlug, mode: "insensitive" as const } }
      : undefined,
    peer.peerHandle
      ? { peerHandle: { equals: peer.peerHandle, mode: "insensitive" as const } }
      : undefined,
  ].filter(Boolean) as Array<
    | { peerSlug: { equals: string; mode: "insensitive" } }
    | { peerHandle: { equals: string; mode: "insensitive" } }
  >;

  if (orFilters.length > 0) {
    const existing = await prisma.chatThread.findFirst({
      where: { userId: receiverUserId, OR: orFilters },
      select: { id: true },
    });
    if (existing) return existing;
  }

  return prisma.chatThread.create({
    data: {
      userId: receiverUserId,
      peerCreatorId: peer.peerCreatorId,
      peerName: peer.peerName,
      peerHandle: peer.peerHandle,
      peerInitials: peer.peerInitials,
      peerAvatarColor: peer.peerAvatarColor,
      peerAvatarUrl: peer.peerAvatarUrl,
      peerSlug: peer.peerSlug,
      peerOnline: false,
      preview: null,
      lastMessageAt: null,
      unreadCount: 0,
    },
    select: { id: true },
  });
}

/**
 * Mirror a sent message into the peer user's private inbox thread.
 * Chat is stored per-user (not a shared thread), same pattern as booking confirmations.
 */
async function mirrorChatMessageToPeer(
  senderUserId: string,
  senderThread: {
    peerCreatorId: string | null;
    peerSlug: string | null;
    peerHandle: string;
  },
  body: string,
) {
  const receiverUserId = await resolveReceiverUserId(senderThread);
  if (!receiverUserId || receiverUserId === senderUserId) return;

  // Messaging a creator → peer inbox shows the fan. Messaging a fan → show the creator when possible.
  const peer = senderThread.peerCreatorId
    ? await peerDisplayFromUser(senderUserId)
    : (await peerDisplayFromCreatorOwner(senderUserId)) ||
      (await peerDisplayFromUser(senderUserId));
  if (!peer) return;

  const receiverThread = await findOrCreatePeerInboxThread(receiverUserId, peer);
  const preview = previewFromBody(body);

  await prisma.$transaction([
    prisma.chatMessage.create({
      data: {
        threadId: receiverThread.id,
        body,
        fromMe: false,
      },
    }),
    prisma.chatThread.update({
      where: { id: receiverThread.id },
      data: {
        preview,
        lastMessageAt: new Date(),
        unreadCount: { increment: 1 },
        peerName: peer.peerName,
        peerHandle: peer.peerHandle,
        peerInitials: peer.peerInitials,
        peerAvatarColor: peer.peerAvatarColor,
        peerAvatarUrl: peer.peerAvatarUrl,
        peerSlug: peer.peerSlug,
        ...(peer.peerCreatorId ? { peerCreatorId: peer.peerCreatorId } : {}),
      },
    }),
  ]);
}

export async function sendChatMessage(userId: string, threadId: string, body: string) {
  const thread = await prisma.chatThread.findFirst({
    where: { id: threadId, userId },
  });
  if (!thread) return null;

  const trimmed = body.trim();
  if (!trimmed) return null;

  const { getDirectMessagingRestriction } = await import("@/lib/guardian/dm-contact-controls");
  const restriction = await getDirectMessagingRestriction(userId, thread);
  if (restriction.restricted) {
    return {
      restricted: true as const,
      message: restriction.message ?? "Direct messaging is restricted for this contact.",
    };
  }

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
        preview: previewFromBody(trimmed),
        lastMessageAt: new Date(),
        unreadCount: 0,
      },
    }),
  ]);

  try {
    await mirrorChatMessageToPeer(userId, thread, trimmed);
  } catch (error) {
    console.error("chat mirror to peer failed", error);
  }

  return getChatThreadForUser(userId, threadId).then((fresh) => ({
    thread: fresh,
    message,
  }));
}

export async function ensureChatThreadForCreatorSlug(userId: string, slug: string) {
  await seedDefaultChatThreadsForUser(userId);

  const normalized = slug.trim().toLowerCase();
  if (!normalized) return null;

  const existing = await prisma.chatThread.findFirst({
    where: {
      userId,
      OR: [
        { peerSlug: { equals: normalized, mode: "insensitive" } },
        { seedKey: normalized },
      ],
    },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (existing) return existing;

  const creator = await prisma.creatorUser.findFirst({
    where: {
      OR: [
        { slug: { equals: normalized, mode: "insensitive" } },
        { handle: { equals: `@${normalized}`, mode: "insensitive" } },
        { handle: { equals: normalized, mode: "insensitive" } },
      ],
    },
  });
  if (!creator) return null;

  if (creator.id) {
    const byCreator = await prisma.chatThread.findFirst({
      where: { userId, peerCreatorId: creator.id },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
      },
    });
    if (byCreator) return byCreator;
  }

  return prisma.chatThread.create({
    data: {
      userId,
      peerCreatorId: creator.id,
      peerName: creator.name,
      peerHandle: creator.handle,
      peerInitials: creator.avatarInitials,
      peerAvatarColor: creator.avatarColor,
      peerAvatarUrl: creator.avatarUrl,
      peerSlug: creator.slug ?? normalized,
      peerOnline: false,
      preview: null,
      lastMessageAt: null,
      unreadCount: 0,
    },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
}

export async function sendBookingConfirmationMessage(
  userId: string,
  threadId: string,
  encodedBody: string,
  preview: string,
  specialRequestId?: string | null,
  options?: {
    fromMe?: boolean;
    incrementUnread?: boolean;
  },
) {
  const thread = await prisma.chatThread.findFirst({
    where: { id: threadId, userId },
  });
  if (!thread) return null;

  const fromMe = options?.fromMe ?? false;
  const incrementUnread = options?.incrementUnread ?? false;

  await prisma.$transaction([
    prisma.chatMessage.create({
      data: {
        threadId,
        body: encodedBody,
        fromMe,
        specialRequestId: specialRequestId ?? null,
      },
    }),
    prisma.chatThread.update({
      where: { id: threadId },
      data: {
        preview,
        lastMessageAt: new Date(),
        unreadCount: incrementUnread ? { increment: 1 } : 0,
      },
    }),
  ]);

  return getChatThreadForUser(userId, threadId);
}

type GuardianChatPeer = {
  guardianUserId: string;
  fullName: string;
  handleLabel: string;
  avatarInitials: string;
  avatarColor: string;
  avatarUrl: string | null;
  slug: string | null;
};

/** Ensures a minor has a DM thread with their linked guardian. */
export async function ensureGuardianChatThreadForMinor(
  minorUserId: string,
  peer: GuardianChatPeer,
) {
  const seedKey = `guardian:${peer.guardianUserId}`;

  const existing = await prisma.chatThread.findFirst({
    where: { userId: minorUserId, seedKey },
    select: { id: true },
  });
  if (existing) return existing;

  return prisma.chatThread.create({
    data: {
      userId: minorUserId,
      seedKey,
      peerName: peer.fullName,
      peerHandle: peer.handleLabel,
      peerInitials: peer.avatarInitials,
      peerAvatarColor: peer.avatarColor,
      peerAvatarUrl: peer.avatarUrl,
      peerSlug: peer.slug?.trim() || resolveAuthorProfileSlug(peer.handleLabel),
      peerOnline: false,
      preview: null,
      lastMessageAt: null,
      unreadCount: 0,
    },
    select: { id: true },
  });
}

type ChildChatPeer = {
  childUserId: string;
  fullName: string;
  handleLabel: string;
  avatarInitials: string;
  avatarColor: string;
  avatarUrl: string | null;
  slug: string | null;
};

/** Ensures a guardian has a DM thread with a linked child. */
export async function ensureChildChatThreadForGuardian(
  guardianUserId: string,
  peer: ChildChatPeer,
) {
  const seedKey = `child:${peer.childUserId}`;

  const existing = await prisma.chatThread.findFirst({
    where: { userId: guardianUserId, seedKey },
    select: { id: true },
  });
  if (existing) return existing;

  return prisma.chatThread.create({
    data: {
      userId: guardianUserId,
      seedKey,
      peerName: peer.fullName,
      peerHandle: peer.handleLabel,
      peerInitials: peer.avatarInitials,
      peerAvatarColor: peer.avatarColor,
      peerAvatarUrl: peer.avatarUrl,
      peerSlug: peer.slug?.trim() || resolveAuthorProfileSlug(peer.handleLabel),
      peerOnline: false,
      preview: null,
      lastMessageAt: null,
      unreadCount: 0,
    },
    select: { id: true },
  });
}
