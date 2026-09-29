import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { CONVERSATIONS } from "@/lib/feed/messages";
import type { SenderEnforcement } from "@/lib/guardian/sender-enforcement";
import { resolveAuthorProfileSlug } from "@/lib/feed/profile-slugs";

type SeedMessage = {
  body: string;
  fromMe: boolean;
  createdAt: Date;
};

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "P2002"
  );
}

async function createChatThreadOrFind(
  data: Parameters<typeof prisma.chatThread.create>[0]["data"],
  where: { userId: string; seedKey: string },
) {
  try {
    return await prisma.chatThread.create({
      data,
      select: { id: true },
    });
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;

    const existing = await prisma.chatThread.findFirst({
      where,
      select: { id: true },
    });
    if (!existing) throw error;
    return existing;
  }
}

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

    try {
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
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
    }
  }
}

async function expireOverdueHoldsForUser(userId: string) {
  try {
    const { expireOverdueHolds } = await import("@/lib/guardian/dm-moderation-hold");
    await expireOverdueHolds({ userIds: [userId] });
  } catch (error) {
    console.error("lazy DM hold expiry failed", error);
  }
}

export async function listChatThreadsForUser(userId: string) {
  await seedDefaultChatThreadsForUser(userId);
  await expireOverdueHoldsForUser(userId);

  return prisma.chatThread.findMany({
    where: { userId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
    orderBy: [{ lastMessageAt: "desc" }, { updatedAt: "desc" }],
  });
}

export async function getChatThreadForUser(userId: string, threadId: string) {
  await expireOverdueHoldsForUser(userId);
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

export function previewFromBody(body: string) {
  const trimmed = body.trim();
  if (trimmed.length <= 140) return trimmed;
  return `${trimmed.slice(0, 137)}…`;
}

type ChatDb = Pick<Prisma.TransactionClient, "chatThread" | "chatMessage">;

export type PeerDisplay = {
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
      select: { userId: true, slug: true, handle: true },
    });
    if (creator?.userId) return creator.userId;
    // Fall through to slug/handle when the creator row is not linked to a User yet.
  }

  const slug = thread.peerSlug?.trim();
  if (slug) {
    const bySlug = await prisma.userProfile.findFirst({
      where: { slug: { equals: slug, mode: "insensitive" } },
      select: { userId: true },
    });
    if (bySlug?.userId) return bySlug.userId;

    const creatorBySlug = await prisma.creatorUser.findFirst({
      where: {
        OR: [
          { slug: { equals: slug, mode: "insensitive" } },
          { handle: { equals: slug, mode: "insensitive" } },
          { handle: { equals: `@${slug}`, mode: "insensitive" } },
        ],
      },
      select: { userId: true },
    });
    if (creatorBySlug?.userId) return creatorBySlug.userId;
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
  if (byProfileHandle?.userId) return byProfileHandle.userId;

  const creatorByHandle = await prisma.creatorUser.findFirst({
    where: { OR: handleFilters.map((equals) => ({ handle: equals })) },
    select: { userId: true },
  });
  return creatorByHandle?.userId ?? null;
}

/** Find the receiver's inbox thread for this peer without creating one. */
export async function findPeerInboxThread(
  receiverUserId: string,
  peer: PeerDisplay,
  db: ChatDb = prisma,
): Promise<{ id: string } | null> {
  if (peer.peerCreatorId) {
    const byCreator = await db.chatThread.findFirst({
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
    const existing = await db.chatThread.findFirst({
      where: { userId: receiverUserId, OR: orFilters },
      select: { id: true },
    });
    if (existing) return existing;
  }

  return null;
}

export async function findOrCreatePeerInboxThread(
  receiverUserId: string,
  peer: PeerDisplay,
  db: ChatDb = prisma,
) {
  const existing = await findPeerInboxThread(receiverUserId, peer, db);
  if (existing) return existing;

  return db.chatThread.create({
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
 * How the sender appears in the receiver's inbox. Messaging a creator → the receiver sees the fan;
 * messaging a fan → the receiver sees the creator when possible.
 */
export async function resolveSenderPeerDisplay(
  senderUserId: string,
  senderThread: { peerCreatorId: string | null } | null,
): Promise<PeerDisplay | null> {
  if (senderThread?.peerCreatorId) return peerDisplayFromUser(senderUserId);
  return (await peerDisplayFromCreatorOwner(senderUserId)) || (await peerDisplayFromUser(senderUserId));
}

/** Display fields refreshed on the receiver's thread whenever a message is delivered into it. */
export function peerThreadDisplayUpdate(peer: PeerDisplay) {
  return {
    peerName: peer.peerName,
    peerHandle: peer.peerHandle,
    peerInitials: peer.peerInitials,
    peerAvatarColor: peer.peerAvatarColor,
    peerAvatarUrl: peer.peerAvatarUrl,
    peerSlug: peer.peerSlug,
    ...(peer.peerCreatorId ? { peerCreatorId: peer.peerCreatorId } : {}),
  };
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
  contentMasked = false,
) {
  const receiverUserId = await resolveReceiverUserId(senderThread);
  if (!receiverUserId || receiverUserId === senderUserId) {
    console.warn("[chat] mirror skipped — receiver unresolved or self", {
      senderUserId,
      receiverUserId,
      peerSlug: senderThread.peerSlug,
      peerHandle: senderThread.peerHandle,
    });
    return;
  }

  const peer = await resolveSenderPeerDisplay(senderUserId, senderThread);
  if (!peer) {
    console.warn("[chat] mirror skipped — could not build peer display", senderUserId);
    return;
  }

  const receiverThread = await findOrCreatePeerInboxThread(receiverUserId, peer);
  const { MASKED_DM_BODY, MASKED_DM_PREVIEW } = await import("@/lib/guardian/is-user-minor");
  // Never store the raw flagged text on the recipient thread.
  const recipientBody = contentMasked ? MASKED_DM_BODY : body;
  const preview = previewFromBody(contentMasked ? MASKED_DM_PREVIEW : body);

  await prisma.$transaction([
    prisma.chatMessage.create({
      data: {
        threadId: receiverThread.id,
        body: recipientBody,
        fromMe: false,
        contentMasked,
      },
    }),
    prisma.chatThread.update({
      where: { id: receiverThread.id },
      data: {
        preview,
        lastMessageAt: new Date(),
        unreadCount: { increment: 1 },
        ...peerThreadDisplayUpdate(peer),
      },
    }),
  ]);
}

export type SendChatMessageOptions = {
  /** Sender confirmed sending after a content-safety warning. */
  acceptModeration?: boolean;
};

export type DmModerationWarningPayload = {
  title: string;
  message: string;
  category: string;
  confidence: number;
  verificationFailed: boolean;
  recipientIsMinor: boolean;
  canSendAnyway: boolean;
  sendAnywayOutcome: "guardian_review" | "masked" | null;
};

export type SendChatMessageResult =
  | {
      restricted: true;
      code: "DM_RESTRICTED" | "DM_MINOR_RESTRICTED";
      message: string;
      restrictionEndsAt?: string | null;
    }
  | { moderationRequired: true; moderation: DmModerationWarningPayload }
  | {
      thread: Awaited<ReturnType<typeof getChatThreadForUser>>;
      message: { id: string };
      enforcement?: SenderEnforcement;
    };

export async function sendChatMessage(
  userId: string,
  threadId: string,
  body: string,
  options: SendChatMessageOptions = {},
): Promise<SendChatMessageResult | null> {
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
      restricted: true,
      code: "DM_RESTRICTED",
      message: restriction.message ?? "Direct messaging is restricted for this contact.",
    };
  }

  const receiverUserId = await resolveReceiverUserId(thread);
  if (!receiverUserId) {
    console.warn("[moderation] DM receiver unresolved for thread", threadId);
  }
  const recipientUserId = receiverUserId && receiverUserId !== userId ? receiverUserId : null;

  const [
    { loadDmSafetyParticipants },
    { evaluateDmSafetyPolicy, normalizeDmSafetyCategory, severityFromConfidence, DM_MINOR_WARNING_COPY },
    { minorRestrictionMessage },
    { moderateDmText },
    { isMinorAgeZone },
  ] = await Promise.all([
    import("@/lib/guardian/dm-moderation-hold"),
    import("@/lib/guardian/dm-safety-policy"),
    import("@/lib/guardian/sender-enforcement"),
    import("@/lib/moderation/dm-text-moderation"),
    import("@/lib/utils/age-zone"),
  ]);

  const participants = await loadDmSafetyParticipants(userId, recipientUserId);
  const recipientIsMinor = Boolean(
    participants.recipient && isMinorAgeZone(participants.recipient.zone),
  );

  const minorRestricted = (endsAt: Date | null): SendChatMessageResult => ({
    restricted: true,
    code: "DM_MINOR_RESTRICTED",
    message: minorRestrictionMessage(endsAt),
    restrictionEndsAt: endsAt ? endsAt.toISOString() : null,
  });

  if (recipientIsMinor && participants.senderRestriction) {
    return minorRestricted(participants.senderRestriction.endsAt);
  }

  // Always re-moderate: `acceptModeration` only expresses the sender's intent.
  const moderation = await moderateDmText(trimmed, { recipientIsMinor });
  const verificationFailed = !moderation.allowed && Boolean(moderation.verificationFailed);
  const flagged = !moderation.allowed && !verificationFailed;
  const category = moderation.allowed ? "Neutral" : normalizeDmSafetyCategory(moderation.category);
  const severity = moderation.allowed ? 0 : severityFromConfidence(moderation.confidence);

  const decision = evaluateDmSafetyPolicy({
    flagged,
    verificationFailed,
    category,
    severity,
    senderZone: participants.sender.zone,
    senderAgeYears: participants.sender.ageYears,
    senderMonitored: participants.sender.monitored,
    recipientZone: participants.recipient?.zone ?? "ADULT",
    recipientAgeYears: participants.recipient?.ageYears ?? null,
    recipientMonitored: participants.recipient?.monitored ?? false,
    senderRestrictedFromMinors: Boolean(participants.senderRestriction),
    senderIsRecipientGuardian: participants.senderIsRecipientGuardian,
  });

  if (decision.outcome === "restricted") {
    return minorRestricted(participants.senderRestriction?.endsAt ?? null);
  }

  if (decision.outcome === "deliver" || moderation.allowed) {
    return deliverChatMessage(userId, thread, trimmed, false);
  }

  const canSendAnyway = decision.outcome === "warn";
  const warning: DmModerationWarningPayload = {
    title: moderation.title,
    message: moderation.message,
    category: moderation.category,
    confidence: moderation.confidence,
    verificationFailed,
    recipientIsMinor,
    canSendAnyway,
    sendAnywayOutcome:
      decision.onSendAnyway === "hold_withheld" || decision.onSendAnyway === "hold_masked_placeholder"
        ? "guardian_review"
        : decision.onSendAnyway === "masked_delivery"
          ? "masked"
          : null,
  };
  if (recipientIsMinor) {
    // Never reveal category, severity, or guardian involvement to someone messaging a minor.
    warning.category = "";
    warning.confidence = 0;
    warning.sendAnywayOutcome = null;
    warning.title = verificationFailed
      ? DM_MINOR_WARNING_COPY.verificationFailedTitle
      : DM_MINOR_WARNING_COPY.title;
    warning.message = verificationFailed
      ? DM_MINOR_WARNING_COPY.verificationFailedMessage
      : DM_MINOR_WARNING_COPY.message;
  }

  if (!options.acceptModeration || decision.onSendAnyway === "not_allowed") {
    if (options.acceptModeration && decision.autoReport && recipientUserId) {
      try {
        const { createSystemSafetyReport } = await import("@/lib/guardian/safety-reports");
        await createSystemSafetyReport({
          subjectUserId: userId,
          reason: "sexual_content_to_minor",
          childUserId: recipientUserId,
          mandatoryReportCandidate: true,
          dedupeSince: new Date(Date.now() - 86_400_000),
        });
      } catch (error) {
        console.error("system safety report create failed", error);
      }
    }
    return { moderationRequired: true, moderation: warning };
  }

  if (decision.onSendAnyway === "masked_delivery") {
    const result = await deliverChatMessage(userId, thread, trimmed, true);
    try {
      const { createDmModerationSafetyAlerts } = await import("@/lib/guardian/safety-alerts");
      await createDmModerationSafetyAlerts({
        senderUserId: userId,
        receiverUserId: recipientUserId,
        chatThreadId: threadId,
        chatMessageId: result.message.id,
        category: moderation.category,
        priority: decision.alertPriority,
        senderIsAdult: participants.sender.zone === "ADULT",
        recipientIsAdult: !recipientIsMinor,
      });
    } catch (error) {
      console.error("guardian safety alert create failed", error);
    }
    return result;
  }

  if (!recipientUserId || !participants.recipient) {
    return { moderationRequired: true, moderation: { ...warning, canSendAnyway: false, sendAnywayOutcome: null } };
  }

  const { createDmModerationHold } = await import("@/lib/guardian/dm-moderation-hold");
  const hold = await createDmModerationHold({
    senderUserId: userId,
    recipientUserId,
    senderThread: thread,
    body: trimmed,
    category: moderation.category,
    severity,
    senderZone: participants.sender.zone,
    recipientZone: participants.recipient.zone,
    treatment: decision.onSendAnyway === "hold_masked_placeholder" ? "MASKED_PLACEHOLDER" : "WITHHELD",
    decision,
  });

  return {
    thread: await getChatThreadForUser(userId, threadId),
    message: { id: hold.senderMessageId },
    ...(hold.enforcement ? { enforcement: hold.enforcement } : {}),
  };
}

async function deliverChatMessage(
  userId: string,
  thread: { id: string; peerCreatorId: string | null; peerSlug: string | null; peerHandle: string },
  trimmed: string,
  contentMasked: boolean,
) {
  const threadId = thread.id;
  const [message] = await prisma.$transaction([
    prisma.chatMessage.create({
      data: {
        threadId,
        body: trimmed,
        fromMe: true,
        contentMasked,
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
    await mirrorChatMessageToPeer(userId, thread, trimmed, contentMasked);
  } catch (error) {
    console.error("chat mirror to peer failed", error);
  }

  return {
    thread: await getChatThreadForUser(userId, threadId),
    message: { id: message.id },
  };
}

/** Delete all messages in a thread for the current user (clears their local chat history). */
export async function clearChatThreadMessages(userId: string, threadId: string) {
  const thread = await prisma.chatThread.findFirst({
    where: { id: threadId, userId },
    select: { id: true },
  });
  if (!thread) return null;

  await prisma.$transaction([
    prisma.chatMessage.deleteMany({ where: { threadId } }),
    prisma.chatThread.update({
      where: { id: threadId },
      data: {
        preview: null,
        lastMessageAt: null,
        unreadCount: 0,
      },
    }),
  ]);

  return getChatThreadForUser(userId, threadId);
}

/** Remove the conversation from the current user's inbox entirely. */
export async function deleteChatThread(userId: string, threadId: string) {
  const thread = await prisma.chatThread.findFirst({
    where: { id: threadId, userId },
    select: { id: true },
  });
  if (!thread) return null;

  await prisma.chatThread.delete({ where: { id: threadId } });
  return { id: threadId };
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

  if (creator) {
    // Don't open a DM thread with yourself.
    if (creator.userId && creator.userId === userId) return null;

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

  // Regular member profiles (UserProfile) without a CreatorUser row.
  const profile = await prisma.userProfile.findFirst({
    where: { slug: { equals: normalized, mode: "insensitive" } },
    select: { userId: true },
  });
  if (!profile?.userId || profile.userId === userId) return null;

  const peer = await peerDisplayFromUser(profile.userId);
  if (!peer) return null;

  const byPeerSlug = await prisma.chatThread.findFirst({
    where: {
      userId,
      peerSlug: { equals: peer.peerSlug || normalized, mode: "insensitive" },
    },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (byPeerSlug) return byPeerSlug;

  return prisma.chatThread.create({
    data: {
      userId,
      peerCreatorId: null,
      peerName: peer.peerName,
      peerHandle: peer.peerHandle,
      peerInitials: peer.peerInitials,
      peerAvatarColor: peer.peerAvatarColor,
      peerAvatarUrl: peer.peerAvatarUrl,
      peerSlug: peer.peerSlug ?? normalized,
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

/** Alias used when opening a DM from a public profile page. */
export const ensureChatThreadForProfileSlug = ensureChatThreadForCreatorSlug;

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

  return createChatThreadOrFind(
    {
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
    { userId: minorUserId, seedKey },
  );
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

  return createChatThreadOrFind(
    {
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
    { userId: guardianUserId, seedKey },
  );
}
