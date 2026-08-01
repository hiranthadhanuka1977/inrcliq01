import { prisma } from "@/lib/prisma";
import {
  bookingNotePreview,
  encodeBookingNote,
} from "@/lib/feed/booking-confirmation";

export type SettingsBookingRow = {
  id: string;
  reference: string;
  status: string;
  statusLabel: string;
  requestLabel: string;
  category: string | null;
  contentType: string | null;
  totalFee: number;
  currency: string;
  totalLabel: string;
  requesterName: string;
  requesterEmail: string;
  createdAt: string;
  createdLabel: string;
};

export type SettingsCreatorBookingsGroup = {
  creatorId: string;
  creatorName: string;
  creatorHandle: string;
  creatorSlug: string | null;
  avatarUrl: string | null;
  avatarInitials: string;
  avatarColor: string;
  bookingCount: number;
  bookings: SettingsBookingRow[];
};

export type SettingsBookingDetail = {
  id: string;
  reference: string;
  status: string;
  statusLabel: string;
  requestLabel: string;
  category: string | null;
  occasion: string | null;
  contentType: string | null;
  duration: string | null;
  tone: string | null;
  contentSummary: string | null;
  publishingMethod: string | null;
  recipientLabel: string | null;
  recipientUsername: string | null;
  shoutoutMessage: string | null;
  specialInstructions: string | null;
  isAppearance: boolean;
  appearanceLocation: string | null;
  appearanceExpectation: string | null;
  appearanceReference: string | null;
  dayRate: number;
  feedFee: number;
  totalFee: number;
  currency: string;
  dayRateLabel: string;
  feedFeeLabel: string;
  totalLabel: string;
  requestedForLabel: string | null;
  deliverByLabel: string | null;
  acceptedAtLabel: string | null;
  deliveredAtLabel: string | null;
  createdLabel: string;
  updatedLabel: string;
  creator: {
    id: string;
    name: string;
    handle: string;
    slug: string | null;
    avatarUrl: string | null;
    avatarInitials: string;
    avatarColor: string;
  };
  requester: {
    name: string;
    email: string;
    handle: string | null;
  };
};

function statusLabel(status: string) {
  switch (status) {
    case "RECEIVED":
      return "Received";
    case "ACCEPTED":
      return "Accepted";
    case "IN_PROGRESS":
      return "In Progress";
    case "DELIVERED":
      return "Delivered";
    case "DECLINED":
      return "Declined";
    case "CANCELLED":
      return "Cancelled";
    default:
      return status;
  }
}

function formatDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(date: Date | null | undefined) {
  if (!date) return null;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function moneyLabel(amount: number, currency: string) {
  return `${amount} ${currency}`;
}

function requesterName(user: {
  firstName: string | null;
  lastName: string | null;
  email: string;
  handle: string | null;
}) {
  const full = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  if (full) return full;
  if (user.handle?.trim()) return user.handle.trim();
  return user.email;
}

export async function listSettingsBookingsByCreator(): Promise<SettingsCreatorBookingsGroup[]> {
  const requests = await prisma.specialRequest.findMany({
    orderBy: [{ createdAt: "desc" }],
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          handle: true,
          slug: true,
          avatarUrl: true,
          avatarInitials: true,
          avatarColor: true,
        },
      },
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          handle: true,
        },
      },
    },
  });

  const groups = new Map<string, SettingsCreatorBookingsGroup>();

  for (const request of requests) {
    const existing = groups.get(request.creatorId);
    const row: SettingsBookingRow = {
      id: request.id,
      reference: request.reference,
      status: request.status,
      statusLabel: statusLabel(request.status),
      requestLabel: request.requestLabel,
      category: request.category,
      contentType: request.contentType,
      totalFee: request.totalFee,
      currency: request.currency,
      totalLabel: `${request.totalFee} ${request.currency}`,
      requesterName: requesterName(request.user),
      requesterEmail: request.user.email,
      createdAt: request.createdAt.toISOString(),
      createdLabel: formatDate(request.createdAt),
    };

    if (existing) {
      existing.bookings.push(row);
      existing.bookingCount += 1;
      continue;
    }

    groups.set(request.creatorId, {
      creatorId: request.creator.id,
      creatorName: request.creator.name,
      creatorHandle: request.creator.handle,
      creatorSlug: request.creator.slug,
      avatarUrl: request.creator.avatarUrl,
      avatarInitials: request.creator.avatarInitials,
      avatarColor: request.creator.avatarColor,
      bookingCount: 1,
      bookings: [row],
    });
  }

  return [...groups.values()].sort((a, b) => {
    const aLatest = a.bookings[0]?.createdAt ?? "";
    const bLatest = b.bookings[0]?.createdAt ?? "";
    return bLatest.localeCompare(aLatest);
  });
}

export async function getSettingsBookingById(id: string): Promise<SettingsBookingDetail | null> {
  const request = await prisma.specialRequest.findUnique({
    where: { id },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          handle: true,
          slug: true,
          avatarUrl: true,
          avatarInitials: true,
          avatarColor: true,
        },
      },
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          handle: true,
        },
      },
    },
  });

  if (!request) return null;

  const details =
    request.detailsJson && typeof request.detailsJson === "object" && !Array.isArray(request.detailsJson)
      ? (request.detailsJson as Record<string, unknown>)
      : null;
  const tone =
    typeof details?.tone === "string" && details.tone.trim() ? details.tone.trim() : null;
  const contentSummary =
    typeof details?.contentSummary === "string" && details.contentSummary.trim()
      ? details.contentSummary.trim()
      : null;

  return {
    id: request.id,
    reference: request.reference,
    status: request.status,
    statusLabel: statusLabel(request.status),
    requestLabel: request.requestLabel,
    category: request.category,
    occasion: request.occasion,
    contentType: request.contentType,
    duration: request.duration,
    tone,
    contentSummary,
    publishingMethod: request.publishingMethod,
    recipientLabel: request.recipientLabel,
    recipientUsername: request.recipientUsername,
    shoutoutMessage: request.shoutoutMessage,
    specialInstructions: request.specialInstructions,
    isAppearance: request.isAppearance,
    appearanceLocation: request.appearanceLocation,
    appearanceExpectation: request.appearanceExpectation,
    appearanceReference: request.appearanceReference,
    dayRate: request.dayRate,
    feedFee: request.feedFee,
    totalFee: request.totalFee,
    currency: request.currency,
    dayRateLabel: moneyLabel(request.dayRate, request.currency),
    feedFeeLabel: moneyLabel(request.feedFee, request.currency),
    totalLabel: moneyLabel(request.totalFee, request.currency),
    requestedForLabel: formatDateTime(request.requestedForAt),
    deliverByLabel: formatDateTime(request.deliverBy),
    acceptedAtLabel: formatDateTime(request.acceptedAt),
    deliveredAtLabel: formatDateTime(request.deliveredAt),
    createdLabel: formatDateTime(request.createdAt) ?? formatDate(request.createdAt),
    updatedLabel: formatDateTime(request.updatedAt) ?? formatDate(request.updatedAt),
    creator: {
      id: request.creator.id,
      name: request.creator.name,
      handle: request.creator.handle,
      slug: request.creator.slug,
      avatarUrl: request.creator.avatarUrl,
      avatarInitials: request.creator.avatarInitials,
      avatarColor: request.creator.avatarColor,
    },
    requester: {
      name: requesterName(request.user),
      email: request.user.email,
      handle: request.user.handle,
    },
  };
}

export async function deleteSettingsBooking(id: string) {
  const booking = await prisma.specialRequest.findUnique({
    where: { id },
    select: { id: true, reference: true },
  });

  if (!booking) {
    return { ok: false as const, error: "Booking not found." };
  }

  await prisma.$transaction([
    prisma.chatMessage.deleteMany({ where: { specialRequestId: id } }),
    prisma.specialRequest.delete({ where: { id } }),
  ]);

  return { ok: true as const, reference: booking.reference };
}

export async function acceptSettingsBooking(id: string) {
  const booking = await prisma.specialRequest.findUnique({
    where: { id },
    select: {
      id: true,
      reference: true,
      status: true,
      userId: true,
      threadId: true,
      deliverBy: true,
      creator: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!booking) {
    return { ok: false as const, error: "Booking not found." };
  }

  if (booking.status === "ACCEPTED") {
    return {
      ok: true as const,
      alreadyAccepted: true as const,
      reference: booking.reference,
      status: "ACCEPTED" as const,
      statusLabel: statusLabel("ACCEPTED"),
      acceptedAtLabel: null as string | null,
    };
  }

  if (booking.status !== "RECEIVED") {
    return {
      ok: false as const,
      error: `Only received bookings can be accepted (current status: ${statusLabel(booking.status)}).`,
    };
  }

  const acceptedAt = new Date();
  const creatorName = booking.creator.name?.trim() || "the creator";
  const deliverBy =
    booking.deliverBy?.toISOString() ??
    new Date(acceptedAt.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const notePayload = {
    kind: "accepted" as const,
    reference: booking.reference,
    creatorName,
    specialRequestId: booking.id,
    title: `Accepted by ${creatorName.split(" ")[0]}`,
    body: `Booking ${booking.reference} has been accepted. Delivery will follow the agreed schedule.`,
    deliverBy,
  };
  const noteBody = encodeBookingNote(notePayload);
  const notePreview = bookingNotePreview(notePayload);

  if (booking.threadId) {
    const threadId = booking.threadId;
    await prisma.$transaction([
      prisma.specialRequest.update({
        where: { id },
        data: {
          status: "ACCEPTED",
          acceptedAt,
        },
      }),
      prisma.chatMessage.create({
        data: {
          threadId,
          body: noteBody,
          fromMe: false,
          specialRequestId: booking.id,
        },
      }),
      prisma.chatThread.update({
        where: { id: threadId },
        data: {
          preview: notePreview,
          lastMessageAt: acceptedAt,
        },
      }),
    ]);
  } else {
    await prisma.specialRequest.update({
      where: { id },
      data: {
        status: "ACCEPTED",
        acceptedAt,
      },
    });
  }

  return {
    ok: true as const,
    alreadyAccepted: false as const,
    reference: booking.reference,
    status: "ACCEPTED" as const,
    statusLabel: statusLabel("ACCEPTED"),
    acceptedAtLabel: formatDateTime(acceptedAt),
  };
}
