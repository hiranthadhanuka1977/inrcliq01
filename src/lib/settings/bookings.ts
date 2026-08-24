import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import {
  bookingNotePreview,
  encodeBookingNote,
} from "@/lib/feed/booking-confirmation";
import { bookingBalanceDue, bookingFeeDueNow, paidAmountOnBooking } from "@/lib/feed/booking-fee";

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
  /** ISO date for when the fan wants delivery / appearance. */
  deliverBy: string | null;
  /** ISO date for the scheduled request moment when set. */
  requestedForAt: string | null;
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
  declinedAtLabel: string | null;
  declineReason: string | null;
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
    case "NEW_OFFER":
      return "New offer";
    case "COUNTER_OFFER":
      return "Counter offer";
    case "OFFER_ACCEPTED":
      return "Awaiting acceptance";
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
      deliverBy: request.deliverBy?.toISOString() ?? null,
      requestedForAt: request.requestedForAt?.toISOString() ?? null,
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
  const declineReason =
    typeof details?.declineReason === "string" && details.declineReason.trim()
      ? details.declineReason.trim()
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
    declinedAtLabel: formatDateTime(request.declinedAt),
    declineReason,
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

export type AcceptBookingOptions = {
  offerPrice?: number | null;
  note?: string | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
};

export type SendNewOfferOptions = {
  offerPrice?: number | null;
  note?: string | null;
};

export type CounterOfferOptions = {
  offerPrice: number;
  note?: string | null;
};

function readDetailsJson(detailsJson: unknown): Record<string, unknown> {
  return detailsJson && typeof detailsJson === "object" && !Array.isArray(detailsJson)
    ? (detailsJson as Record<string, unknown>)
    : {};
}

function readPendingOffer(detailsJson: unknown): {
  offerPrice: number | null;
  currency: string;
  note: string | null;
  sentAt: string | null;
} | null {
  const details = readDetailsJson(detailsJson);
  const pending = details.pendingOffer;
  if (!pending || typeof pending !== "object" || Array.isArray(pending)) return null;
  const row = pending as Record<string, unknown>;
  const offerPrice =
    typeof row.offerPrice === "number" && Number.isFinite(row.offerPrice)
      ? Math.round(row.offerPrice)
      : null;
  return {
    offerPrice,
    currency: typeof row.currency === "string" ? row.currency : "USD",
    note: typeof row.note === "string" ? row.note : null,
    sentAt: typeof row.sentAt === "string" ? row.sentAt : null,
  };
}

function readPendingCounterOffer(detailsJson: unknown): {
  offerPrice: number;
  currency: string;
  note: string | null;
  sentAt: string | null;
} | null {
  const details = readDetailsJson(detailsJson);
  const pending = details.pendingCounterOffer;
  if (!pending || typeof pending !== "object" || Array.isArray(pending)) return null;
  const row = pending as Record<string, unknown>;
  const offerPrice =
    typeof row.offerPrice === "number" && Number.isFinite(row.offerPrice)
      ? Math.round(row.offerPrice)
      : null;
  if (offerPrice == null || offerPrice <= 0) return null;
  return {
    offerPrice,
    currency: typeof row.currency === "string" ? row.currency : "USD",
    note: typeof row.note === "string" ? row.note : null,
    sentAt: typeof row.sentAt === "string" ? row.sentAt : null,
  };
}

export async function sendNewOfferSettingsBooking(
  id: string,
  options: SendNewOfferOptions = {},
) {
  const booking = await prisma.specialRequest.findUnique({
    where: { id },
    select: {
      id: true,
      reference: true,
      status: true,
      instantBooking: true,
      userId: true,
      threadId: true,
      deliverBy: true,
      totalFee: true,
      currency: true,
      detailsJson: true,
      creator: {
        select: {
          name: true,
          userId: true,
        },
      },
      user: {
        select: {
          firstName: true,
          lastName: true,
          handle: true,
          profile: {
            select: {
              displayName: true,
              handle: true,
              slug: true,
            },
          },
        },
      },
    },
  });

  if (!booking) {
    return { ok: false as const, error: "Booking not found." };
  }

  if (booking.instantBooking) {
    return {
      ok: false as const,
      error: "Instant bookings cannot send a new offer. Accept or decline instead.",
    };
  }

  if (booking.status === "NEW_OFFER") {
    return {
      ok: true as const,
      alreadySent: true as const,
      reference: booking.reference,
      status: "NEW_OFFER" as const,
      statusLabel: statusLabel("NEW_OFFER"),
      totalLabel: `${booking.totalFee} ${booking.currency}`,
      offerPrice: null as number | null,
      note: null as string | null,
    };
  }

  if (booking.status !== "RECEIVED") {
    return {
      ok: false as const,
      error: `Only received bookings can receive a new offer (current status: ${statusLabel(booking.status)}).`,
    };
  }

  const offerPriceRaw = options.offerPrice;
  const offerPrice =
    typeof offerPriceRaw === "number" && Number.isFinite(offerPriceRaw) && offerPriceRaw > 0
      ? Math.round(offerPriceRaw)
      : null;
  const note = options.note?.trim() || "";
  const sentAt = new Date();
  const creatorName = booking.creator.name?.trim() || "the creator";
  const firstName = creatorName.split(" ")[0];
  const currency = booking.currency || "USD";
  const finalTotal = offerPrice ?? booking.totalFee;

  const bodyParts = [`${firstName} sent a new offer for booking ${booking.reference}.`];
  if (offerPrice != null) {
    bodyParts.push(`Offer price: ${offerPrice} ${currency}.`);
  } else {
    bodyParts.push(`Total remains ${finalTotal} ${currency}.`);
  }
  if (note) {
    bodyParts.push(`Note: ${note}`);
  }

  const notePayload = {
    kind: "new_offer" as const,
    reference: booking.reference,
    creatorName,
    specialRequestId: booking.id,
    title: `New offer from ${firstName}`,
    body: bodyParts.join(" "),
    deliverBy: booking.deliverBy?.toISOString(),
    ...(offerPrice != null ? { offerPrice, currency } : {}),
    ...(note ? { note } : {}),
  };
  const noteBody = encodeBookingNote(notePayload);
  const notePreview = bookingNotePreview(notePayload);

  const existingDetails =
    booking.detailsJson &&
    typeof booking.detailsJson === "object" &&
    !Array.isArray(booking.detailsJson)
      ? (booking.detailsJson as Record<string, unknown>)
      : {};
  const detailsJson = {
    ...existingDetails,
    pendingOffer: {
      offerPrice,
      currency,
      note: note || null,
      sentAt: sentAt.toISOString(),
    },
  };

  await prisma.specialRequest.update({
    where: { id },
    data: {
      status: "NEW_OFFER",
      ...(offerPrice != null ? { totalFee: offerPrice } : {}),
      detailsJson,
    },
  });

  await postBookingNoteToBothParties({
    bookingId: booking.id,
    requesterUserId: booking.userId,
    requesterThreadId: booking.threadId,
    creatorOwnerUserId: booking.creator.userId,
    requester: booking.user,
    noteBody,
    notePreview,
    at: sentAt,
  });

  return {
    ok: true as const,
    alreadySent: false as const,
    reference: booking.reference,
    status: "NEW_OFFER" as const,
    statusLabel: statusLabel("NEW_OFFER"),
    totalLabel: `${finalTotal} ${currency}`,
    offerPrice,
    note: note || null,
  };
}

export async function sendCounterOfferByRequester(
  id: string,
  userId: string,
  options: CounterOfferOptions,
) {
  const booking = await prisma.specialRequest.findUnique({
    where: { id },
    select: {
      id: true,
      reference: true,
      status: true,
      instantBooking: true,
      userId: true,
      threadId: true,
      deliverBy: true,
      totalFee: true,
      currency: true,
      detailsJson: true,
      creator: {
        select: {
          name: true,
          userId: true,
        },
      },
      user: {
        select: {
          firstName: true,
          lastName: true,
          handle: true,
          profile: {
            select: {
              displayName: true,
              handle: true,
              slug: true,
            },
          },
        },
      },
    },
  });

  if (!booking) {
    return { ok: false as const, error: "Booking not found." };
  }

  if (booking.userId !== userId) {
    return { ok: false as const, error: "Booking not found." };
  }

  if (booking.instantBooking) {
    return {
      ok: false as const,
      error: "Instant bookings cannot send a counter offer.",
    };
  }

  if (
    booking.status === "NEW_OFFER" &&
    readPendingCounterOffer(booking.detailsJson) &&
    readDetailsJson(booking.detailsJson).counterAcceptedByProvider !== true
  ) {
    return {
      ok: true as const,
      alreadySent: true as const,
      reference: booking.reference,
      status: "NEW_OFFER" as const,
      statusLabel: statusLabel("NEW_OFFER"),
      totalLabel: `${booking.totalFee} ${booking.currency}`,
      offerPrice: readPendingCounterOffer(booking.detailsJson)?.offerPrice ?? null,
      note: readPendingCounterOffer(booking.detailsJson)?.note ?? null,
    };
  }

  if (booking.status !== "NEW_OFFER") {
    return {
      ok: false as const,
      error: `Counter offers are only available for new offers (current status: ${statusLabel(booking.status)}).`,
    };
  }

  const offerPrice =
    typeof options.offerPrice === "number" && Number.isFinite(options.offerPrice) && options.offerPrice > 0
      ? Math.round(options.offerPrice)
      : null;
  if (offerPrice == null) {
    return { ok: false as const, error: "Enter a valid counter offer price." };
  }

  const note = options.note?.trim() || "";
  const sentAt = new Date();
  const creatorName = booking.creator.name?.trim() || "the creator";
  const requesterName =
    booking.user.profile?.displayName?.trim() ||
    `${booking.user.firstName?.trim() || ""} ${booking.user.lastName?.trim() || ""}`.trim() ||
    "The requester";
  const firstName = requesterName.split(" ")[0];
  const currency = booking.currency || "USD";

  const bodyParts = [
    `${firstName} sent a counter offer for booking ${booking.reference}.`,
    `Counter price: ${offerPrice} ${currency}.`,
  ];
  if (note) {
    bodyParts.push(`Note: ${note}`);
  }

  const notePayload = {
    kind: "counter_offer" as const,
    reference: booking.reference,
    creatorName,
    specialRequestId: booking.id,
    title: `Counter offer from ${firstName}`,
    body: bodyParts.join(" "),
    deliverBy: booking.deliverBy?.toISOString(),
    offerPrice,
    currency,
    ...(note ? { note } : {}),
  };
  const noteBody = encodeBookingNote(notePayload);
  const notePreview = bookingNotePreview(notePayload);

  const existingDetails = readDetailsJson(booking.detailsJson);
  const detailsJson = {
    ...existingDetails,
    counterAcceptedByProvider: false,
    pendingCounterOffer: {
      offerPrice,
      currency,
      note: note || null,
      sentAt: sentAt.toISOString(),
    },
  };

  await prisma.specialRequest.update({
    where: { id },
    data: {
      status: "NEW_OFFER",
      detailsJson,
    },
  });

  await postBookingNoteToBothParties({
    bookingId: booking.id,
    requesterUserId: booking.userId,
    requesterThreadId: booking.threadId,
    creatorOwnerUserId: booking.creator.userId,
    requester: booking.user,
    noteBody,
    notePreview,
    at: sentAt,
  });

  return {
    ok: true as const,
    alreadySent: false as const,
    reference: booking.reference,
    status: "NEW_OFFER" as const,
    statusLabel: statusLabel("NEW_OFFER"),
    totalLabel: `${offerPrice} ${currency}`,
    offerPrice,
    note: note || null,
  };
}

export async function acceptCounterOfferSettingsBooking(id: string) {
  const booking = await prisma.specialRequest.findUnique({
    where: { id },
    select: {
      id: true,
      reference: true,
      status: true,
      instantBooking: true,
      userId: true,
      threadId: true,
      deliverBy: true,
      totalFee: true,
      currency: true,
      detailsJson: true,
      creator: {
        select: {
          name: true,
          userId: true,
        },
      },
      user: {
        select: {
          firstName: true,
          lastName: true,
          handle: true,
          profile: {
            select: {
              displayName: true,
              handle: true,
              slug: true,
            },
          },
        },
      },
    },
  });

  if (!booking) {
    return { ok: false as const, error: "Booking not found." };
  }

  if (booking.status !== "NEW_OFFER") {
    return {
      ok: false as const,
      error: `Only counter offers can be accepted (current status: ${statusLabel(booking.status)}).`,
    };
  }

  const counter = readPendingCounterOffer(booking.detailsJson);
  if (!counter) {
    return { ok: false as const, error: "Counter offer details are missing." };
  }
  const existingDetailsForAccept = readDetailsJson(booking.detailsJson);
  if (existingDetailsForAccept.counterAcceptedByProvider === true) {
    return {
      ok: false as const,
      error: "Counter offer is already accepted.",
    };
  }

  const acceptedAt = new Date();
  const creatorName = booking.creator.name?.trim() || "the creator";
  const firstName = creatorName.split(" ")[0];
  const currency = booking.currency || "USD";

  const notePayload = {
    kind: "counter_accepted" as const,
    reference: booking.reference,
    creatorName,
    specialRequestId: booking.id,
    title: `Counter accepted by ${firstName}`,
    body: `${firstName} accepted the counter offer for booking ${booking.reference} at ${counter.offerPrice} ${currency}. The requester can pay the balance to continue.`,
    offerPrice: counter.offerPrice,
    currency,
    ...(counter.note ? { note: counter.note } : {}),
  };
  const noteBody = encodeBookingNote(notePayload);
  const notePreview = bookingNotePreview(notePayload);

  const existingDetails = existingDetailsForAccept;
  const detailsJson = {
    ...existingDetails,
    counterAcceptedByProvider: true,
    pendingOffer: {
      offerPrice: counter.offerPrice,
      currency,
      note: counter.note,
      sentAt: acceptedAt.toISOString(),
      source: "requester_counter",
    },
  };

  await prisma.specialRequest.update({
    where: { id },
    data: {
      status: "NEW_OFFER",
      totalFee: counter.offerPrice,
      detailsJson,
    },
  });

  await postBookingNoteToBothParties({
    bookingId: booking.id,
    requesterUserId: booking.userId,
    requesterThreadId: booking.threadId,
    creatorOwnerUserId: booking.creator.userId,
    requester: booking.user,
    noteBody,
    notePreview,
    at: acceptedAt,
  });

  return {
    ok: true as const,
    reference: booking.reference,
    status: "NEW_OFFER" as const,
    statusLabel: statusLabel("NEW_OFFER"),
    totalLabel: `${counter.offerPrice} ${currency}`,
    offerPrice: counter.offerPrice,
    note: counter.note,
  };
}

export async function declineCounterOfferSettingsBooking(id: string, reasonInput?: string) {
  const reason = reasonInput?.trim() || "Counter offer declined.";
  const booking = await prisma.specialRequest.findUnique({
    where: { id },
    select: {
      id: true,
      reference: true,
      status: true,
      instantBooking: true,
      userId: true,
      threadId: true,
      deliverBy: true,
      totalFee: true,
      currency: true,
      detailsJson: true,
      creator: {
        select: {
          name: true,
          userId: true,
        },
      },
      user: {
        select: {
          firstName: true,
          lastName: true,
          handle: true,
          profile: {
            select: {
              displayName: true,
              handle: true,
              slug: true,
            },
          },
        },
      },
    },
  });

  if (!booking) {
    return { ok: false as const, error: "Booking not found." };
  }

  if (booking.status !== "NEW_OFFER") {
    return {
      ok: false as const,
      error: `Only counter offers can be declined (current status: ${statusLabel(booking.status)}).`,
    };
  }
  const pendingCounter = readPendingCounterOffer(booking.detailsJson);
  if (!pendingCounter) {
    return { ok: false as const, error: "Counter offer details are missing." };
  }

  const declinedAt = new Date();
  const creatorName = booking.creator.name?.trim() || "the creator";
  const firstName = creatorName.split(" ")[0];
  const currency = booking.currency || "USD";
  const providerOffer = readPendingOffer(booking.detailsJson);
  const restoredTotal =
    providerOffer?.offerPrice != null && providerOffer.offerPrice > 0
      ? providerOffer.offerPrice
      : booking.totalFee;

  const notePayload = {
    kind: "counter_declined" as const,
    reference: booking.reference,
    creatorName,
    specialRequestId: booking.id,
    title: `Counter declined by ${firstName}`,
    body: `${firstName} declined the counter offer for booking ${booking.reference}. Reason: ${reason} Your original offer of ${restoredTotal} ${currency} still stands.`,
    reason,
    offerPrice: restoredTotal,
    currency,
  };
  const noteBody = encodeBookingNote(notePayload);
  const notePreview = bookingNotePreview(notePayload);

  const existingDetails = readDetailsJson(booking.detailsJson);
  const { pendingCounterOffer: _removed, counterAcceptedByProvider: _accepted, ...rest } =
    existingDetails;
  const detailsJson = {
    ...rest,
    counterAcceptedByProvider: false,
  };

  await prisma.specialRequest.update({
    where: { id },
    data: {
      status: "NEW_OFFER",
      totalFee: restoredTotal,
      detailsJson,
    },
  });

  await postBookingNoteToBothParties({
    bookingId: booking.id,
    requesterUserId: booking.userId,
    requesterThreadId: booking.threadId,
    creatorOwnerUserId: booking.creator.userId,
    requester: booking.user,
    noteBody,
    notePreview,
    at: declinedAt,
  });

  return {
    ok: true as const,
    reference: booking.reference,
    status: "NEW_OFFER" as const,
    statusLabel: statusLabel("NEW_OFFER"),
    totalLabel: `${restoredTotal} ${currency}`,
    declineReason: reason,
  };
}

export async function declineOfferByRequester(id: string, reasonInput?: string) {
  const reason = reasonInput?.trim() || "Offer declined.";
  const booking = await prisma.specialRequest.findUnique({
    where: { id },
    select: {
      id: true,
      reference: true,
      status: true,
      instantBooking: true,
      totalFee: true,
      currency: true,
      userId: true,
      threadId: true,
      detailsJson: true,
      creator: {
        select: {
          name: true,
          userId: true,
        },
      },
      user: {
        select: {
          firstName: true,
          lastName: true,
          handle: true,
          profile: {
            select: {
              displayName: true,
              handle: true,
              slug: true,
            },
          },
        },
      },
    },
  });

  if (!booking) {
    return { ok: false as const, error: "Booking not found." };
  }

  if (booking.status === "DECLINED") {
    return {
      ok: true as const,
      alreadyDeclined: true as const,
      reference: booking.reference,
      status: "DECLINED" as const,
      statusLabel: statusLabel("DECLINED"),
      declinedAtLabel: null as string | null,
      declineReason: reason,
    };
  }

  if (booking.status !== "NEW_OFFER") {
    return {
      ok: false as const,
      error: `Only bookings with a new offer can be declined (current status: ${statusLabel(booking.status)}).`,
    };
  }

  const declinedAt = new Date();
  const creatorName = booking.creator.name?.trim() || "the creator";
  const requesterName =
    booking.user.profile?.displayName?.trim() ||
    `${booking.user.firstName?.trim() || ""} ${booking.user.lastName?.trim() || ""}`.trim() ||
    "The requester";
  const firstName = requesterName.split(" ")[0];
  const notePayload = {
    kind: "offer_declined" as const,
    reference: booking.reference,
    creatorName,
    specialRequestId: booking.id,
    title: `Offer declined by ${firstName}`,
    body: `The new offer for booking ${booking.reference} was declined. ${reason}`,
    reason,
  };
  const noteBody = encodeBookingNote(notePayload);
  const notePreview = bookingNotePreview(notePayload);

  const existingDetails =
    booking.detailsJson &&
    typeof booking.detailsJson === "object" &&
    !Array.isArray(booking.detailsJson)
      ? (booking.detailsJson as Record<string, unknown>)
      : {};
  const refundAmount = paidAmountOnBooking({
    totalFee: booking.totalFee,
    instantBooking: booking.instantBooking,
    status: booking.status,
    detailsJson: booking.detailsJson,
  });
  const currency = booking.currency || "USD";
  const detailsJson = {
    ...existingDetails,
    declineReason: reason,
    offerDeclinedAt: declinedAt.toISOString(),
    refund: {
      amount: refundAmount,
      currency,
      issuedAt: declinedAt.toISOString(),
    },
  };

  await prisma.specialRequest.update({
    where: { id },
    data: {
      status: "DECLINED",
      declinedAt,
      detailsJson,
    },
  });

  await postBookingNoteToBothParties({
    bookingId: booking.id,
    requesterUserId: booking.userId,
    requesterThreadId: booking.threadId,
    creatorOwnerUserId: booking.creator.userId,
    requester: booking.user,
    noteBody,
    notePreview,
    at: declinedAt,
  });

  await postDeclineRefundNotice({
    booking,
    amount: refundAmount,
    currency,
    at: new Date(declinedAt.getTime() + 1000),
  });

  return {
    ok: true as const,
    alreadyDeclined: false as const,
    reference: booking.reference,
    status: "DECLINED" as const,
    statusLabel: statusLabel("DECLINED"),
    declinedAtLabel: formatDateTime(declinedAt),
    declineReason: reason,
  };
}

export async function completeOfferBalancePayment(id: string, userId: string) {
  const booking = await prisma.specialRequest.findUnique({
    where: { id },
    select: {
      id: true,
      reference: true,
      status: true,
      instantBooking: true,
      userId: true,
      threadId: true,
      totalFee: true,
      currency: true,
      detailsJson: true,
      creator: {
        select: {
          name: true,
          userId: true,
        },
      },
      user: {
        select: {
          firstName: true,
          lastName: true,
          handle: true,
          profile: {
            select: {
              displayName: true,
              handle: true,
              slug: true,
            },
          },
        },
      },
    },
  });

  if (!booking) {
    return { ok: false as const, error: "Booking not found." };
  }

  if (booking.userId !== userId) {
    return { ok: false as const, error: "Booking not found." };
  }

  if (booking.status === "OFFER_ACCEPTED") {
    return {
      ok: true as const,
      alreadyPaid: true as const,
      reference: booking.reference,
      status: "OFFER_ACCEPTED" as const,
      statusLabel: statusLabel("OFFER_ACCEPTED"),
    };
  }

  if (booking.status !== "NEW_OFFER") {
    return {
      ok: false as const,
      error: `Balance payment is only available for new offers (current status: ${statusLabel(booking.status)}).`,
    };
  }
  if (
    readPendingCounterOffer(booking.detailsJson) &&
    readDetailsJson(booking.detailsJson).counterAcceptedByProvider !== true
  ) {
    return {
      ok: false as const,
      error: "Wait for the provider to respond to your counter offer before paying the balance.",
    };
  }

  const existingDetails =
    booking.detailsJson &&
    typeof booking.detailsJson === "object" &&
    !Array.isArray(booking.detailsJson)
      ? (booking.detailsJson as Record<string, unknown>)
      : {};
  const depositPaid =
    typeof existingDetails.bookingFee === "number" && Number.isFinite(existingDetails.bookingFee)
      ? existingDetails.bookingFee
      : bookingFeeDueNow(booking.totalFee);
  const balancePaid = bookingBalanceDue(booking.totalFee, depositPaid);
  const paidAt = new Date();
  const creatorName = booking.creator.name?.trim() || "the creator";
  const requesterName =
    booking.user.profile?.displayName?.trim() ||
    `${booking.user.firstName?.trim() || ""} ${booking.user.lastName?.trim() || ""}`.trim() ||
    "The requester";
  const firstName = requesterName.split(" ")[0];
  const currency = booking.currency || "USD";

  const notePayload = {
    kind: "offer_accepted" as const,
    reference: booking.reference,
    creatorName,
    specialRequestId: booking.id,
    title: `Balance paid by ${firstName}`,
    body: `The new offer for booking ${booking.reference} was accepted and the balance of ${balancePaid} ${currency} has been paid. Waiting for ${creatorName.split(" ")[0] || "the provider"} to accept before the delivery countdown starts.`,
    offerPrice: booking.totalFee,
    currency,
  };
  const noteBody = encodeBookingNote(notePayload);
  const notePreview = bookingNotePreview(notePayload);

  const detailsJson = {
    ...existingDetails,
    balancePayment: {
      amount: balancePaid,
      currency,
      depositPaid,
      paidAt: paidAt.toISOString(),
    },
  };

  await prisma.specialRequest.update({
    where: { id },
    data: {
      status: "OFFER_ACCEPTED",
      detailsJson,
    },
  });

  await postBookingNoteToBothParties({
    bookingId: booking.id,
    requesterUserId: booking.userId,
    requesterThreadId: booking.threadId,
    creatorOwnerUserId: booking.creator.userId,
    requester: booking.user,
    noteBody,
    notePreview,
    at: paidAt,
  });

  return {
    ok: true as const,
    alreadyPaid: false as const,
    reference: booking.reference,
    status: "OFFER_ACCEPTED" as const,
    statusLabel: statusLabel("OFFER_ACCEPTED"),
    balancePaid,
    currency,
  };
}

export async function getBookingBalanceCheckout(id: string, userId: string) {
  const booking = await prisma.specialRequest.findUnique({
    where: { id },
    select: {
      id: true,
      reference: true,
      status: true,
      instantBooking: true,
      userId: true,
      requestLabel: true,
      totalFee: true,
      currency: true,
      detailsJson: true,
      creator: {
        select: {
          name: true,
          slug: true,
        },
      },
    },
  });

  if (!booking || booking.userId !== userId) {
    return { ok: false as const, error: "Booking not found." };
  }

  if (booking.status !== "NEW_OFFER") {
    return {
      ok: false as const,
      error: `Balance checkout is not available (current status: ${statusLabel(booking.status)}).`,
    };
  }
  if (
    readPendingCounterOffer(booking.detailsJson) &&
    readDetailsJson(booking.detailsJson).counterAcceptedByProvider !== true
  ) {
    return {
      ok: false as const,
      error: "Balance checkout is unavailable while your counter offer is pending provider response.",
    };
  }

  const existingDetails =
    booking.detailsJson &&
    typeof booking.detailsJson === "object" &&
    !Array.isArray(booking.detailsJson)
      ? (booking.detailsJson as Record<string, unknown>)
      : {};
  const depositPaid =
    typeof existingDetails.bookingFee === "number" && Number.isFinite(existingDetails.bookingFee)
      ? existingDetails.bookingFee
      : bookingFeeDueNow(booking.totalFee);
  const balanceDue = bookingBalanceDue(booking.totalFee, depositPaid);

  return {
    ok: true as const,
    id: booking.id,
    reference: booking.reference,
    requestLabel: booking.requestLabel,
    totalFee: booking.totalFee,
    currency: booking.currency,
    depositPaid,
    balanceDue,
    creatorName: booking.creator.name?.trim() || "Creator",
    creatorSlug: booking.creator.slug,
  };
}

export async function acceptSettingsBooking(id: string, options: AcceptBookingOptions = {}) {
  const booking = await prisma.specialRequest.findUnique({
    where: { id },
    select: {
      id: true,
      reference: true,
      status: true,
      instantBooking: true,
      userId: true,
      threadId: true,
      deliverBy: true,
      totalFee: true,
      currency: true,
      detailsJson: true,
      creator: {
        select: {
          name: true,
          userId: true,
        },
      },
      user: {
        select: {
          firstName: true,
          lastName: true,
          handle: true,
          profile: {
            select: {
              displayName: true,
              handle: true,
              slug: true,
            },
          },
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
      deliverBy: booking.deliverBy?.toISOString() ?? null,
      totalLabel: `${booking.totalFee} ${booking.currency}`,
      offerPrice: null as number | null,
      note: null as string | null,
      attachmentUrl: null as string | null,
      attachmentName: null as string | null,
    };
  }

  const isInstant = Boolean(booking.instantBooking);
  const allowedStatus = isInstant ? "RECEIVED" : "OFFER_ACCEPTED";
  if (booking.status !== allowedStatus) {
    if (!isInstant && booking.status === "RECEIVED") {
      return {
        ok: false as const,
        error: "Send a new offer first. The requester must accept and pay the balance before you can confirm delivery.",
      };
    }
    return {
      ok: false as const,
      error: `This booking cannot be accepted yet (current status: ${statusLabel(booking.status)}).`,
    };
  }

  const offerPriceRaw = options.offerPrice;
  const offerPrice =
    isInstant &&
    typeof offerPriceRaw === "number" &&
    Number.isFinite(offerPriceRaw) &&
    offerPriceRaw > 0
      ? Math.round(offerPriceRaw)
      : null;
  const note = options.note?.trim() || "";
  const attachmentUrl = isInstant ? "" : options.attachmentUrl?.trim() || "";
  const attachmentName = isInstant ? "" : options.attachmentName?.trim() || "";
  if (attachmentUrl && !/^\/uploads\//.test(attachmentUrl)) {
    return { ok: false as const, error: "Invalid attachment." };
  }

  const acceptedAt = new Date();
  const creatorName = booking.creator.name?.trim() || "the creator";
  const firstName = creatorName.split(" ")[0] || creatorName;
  const currency = booking.currency || "USD";
  const deliverBy =
    booking.deliverBy?.toISOString() ??
    new Date(acceptedAt.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const bodyParts = [
    isInstant
      ? `Booking ${booking.reference} has been accepted.`
      : `Booking ${booking.reference} has been accepted and the delivery countdown has started.`,
  ];
  if (offerPrice != null) {
    bodyParts.push(`New offer: ${offerPrice} ${currency}.`);
  }
  if (note) {
    bodyParts.push(`Note: ${note}`);
  }
  if (attachmentUrl) {
    bodyParts.push(`Attachment: ${attachmentName || "File attached"}.`);
  }
  if (!offerPrice && !note && !attachmentUrl) {
    bodyParts.push("Delivery will follow the agreed schedule.");
  }

  const notePayload = {
    kind: "accepted" as const,
    reference: booking.reference,
    creatorName,
    specialRequestId: booking.id,
    title: `Accepted by ${firstName}`,
    body: bodyParts.join(" "),
    deliverBy,
    ...(offerPrice != null ? { offerPrice, currency } : {}),
    ...(note ? { note } : {}),
    ...(attachmentUrl
      ? { attachmentUrl, attachmentName: attachmentName || "Attachment" }
      : {}),
  };
  const noteBody = encodeBookingNote(notePayload);
  const notePreview = bookingNotePreview(notePayload);

  const existingDetails =
    booking.detailsJson &&
    typeof booking.detailsJson === "object" &&
    !Array.isArray(booking.detailsJson)
      ? (booking.detailsJson as Record<string, unknown>)
      : {};
  const detailsJson = {
    ...existingDetails,
    acceptance: {
      offerPrice,
      currency,
      note: note || null,
      attachmentUrl: attachmentUrl || null,
      attachmentName: attachmentName || null,
      acceptedAt: acceptedAt.toISOString(),
    },
  };

  await prisma.specialRequest.update({
    where: { id },
    data: {
      status: "ACCEPTED",
      acceptedAt,
      ...(offerPrice != null ? { totalFee: offerPrice } : {}),
      detailsJson,
    },
  });

  await postBookingNoteToBothParties({
    bookingId: booking.id,
    requesterUserId: booking.userId,
    requesterThreadId: booking.threadId,
    creatorOwnerUserId: booking.creator.userId,
    requester: booking.user,
    noteBody,
    notePreview,
    at: acceptedAt,
  });

  const finalTotal = offerPrice ?? booking.totalFee;

  return {
    ok: true as const,
    alreadyAccepted: false as const,
    reference: booking.reference,
    status: "ACCEPTED" as const,
    statusLabel: statusLabel("ACCEPTED"),
    acceptedAtLabel: formatDateTime(acceptedAt),
    deliverBy,
    totalLabel: `${finalTotal} ${currency}`,
    offerPrice,
    note: note || null,
    attachmentUrl: attachmentUrl || null,
    attachmentName: attachmentName || null,
  };
}

export async function declineSettingsBooking(id: string, reasonInput: string) {
  const reason = reasonInput.trim();
  if (!reason) {
    return { ok: false as const, error: "A decline reason is required." };
  }

  const booking = await prisma.specialRequest.findUnique({
    where: { id },
    select: {
      id: true,
      reference: true,
      status: true,
      instantBooking: true,
      totalFee: true,
      currency: true,
      userId: true,
      threadId: true,
      detailsJson: true,
      creator: {
        select: {
          name: true,
          userId: true,
        },
      },
      user: {
        select: {
          firstName: true,
          lastName: true,
          handle: true,
          profile: {
            select: {
              displayName: true,
              handle: true,
              slug: true,
            },
          },
        },
      },
    },
  });

  if (!booking) {
    return { ok: false as const, error: "Booking not found." };
  }

  if (booking.status === "DECLINED") {
    return {
      ok: true as const,
      alreadyDeclined: true as const,
      reference: booking.reference,
      status: "DECLINED" as const,
      statusLabel: statusLabel("DECLINED"),
      declinedAtLabel: null as string | null,
      declineReason: reason,
    };
  }

  if (booking.status !== "RECEIVED" && booking.status !== "OFFER_ACCEPTED") {
    return {
      ok: false as const,
      error: `This booking cannot be declined (current status: ${statusLabel(booking.status)}).`,
    };
  }

  const declinedAt = new Date();
  const creatorName = booking.creator.name?.trim() || "the creator";
  const firstName = creatorName.split(" ")[0];
  const notePayload = {
    kind: "declined" as const,
    reference: booking.reference,
    creatorName,
    specialRequestId: booking.id,
    title: `Declined by ${firstName}`,
    body: `Booking ${booking.reference} was declined. Reason: ${reason}`,
    reason,
  };
  const noteBody = encodeBookingNote(notePayload);
  const notePreview = bookingNotePreview(notePayload);

  const existingDetails =
    booking.detailsJson &&
    typeof booking.detailsJson === "object" &&
    !Array.isArray(booking.detailsJson)
      ? (booking.detailsJson as Record<string, unknown>)
      : {};
  const refundAmount = paidAmountOnBooking({
    totalFee: booking.totalFee,
    instantBooking: booking.instantBooking,
    status: booking.status,
    detailsJson: booking.detailsJson,
  });
  const currency = booking.currency || "USD";
  const detailsJson = {
    ...existingDetails,
    declineReason: reason,
    refund: {
      amount: refundAmount,
      currency,
      issuedAt: declinedAt.toISOString(),
    },
  };

  await prisma.specialRequest.update({
    where: { id },
    data: {
      status: "DECLINED",
      declinedAt,
      detailsJson,
    },
  });

  await postBookingNoteToBothParties({
    bookingId: booking.id,
    requesterUserId: booking.userId,
    requesterThreadId: booking.threadId,
    creatorOwnerUserId: booking.creator.userId,
    requester: booking.user,
    noteBody,
    notePreview,
    at: declinedAt,
  });

  await postDeclineRefundNotice({
    booking,
    amount: refundAmount,
    currency,
    at: new Date(declinedAt.getTime() + 1000),
  });

  return {
    ok: true as const,
    alreadyDeclined: false as const,
    reference: booking.reference,
    status: "DECLINED" as const,
    statusLabel: statusLabel("DECLINED"),
    declinedAtLabel: formatDateTime(declinedAt),
    declineReason: reason,
  };
}

export type DeliverBookingOptions = {
  deliveryUrl: string;
  deliveryName?: string | null;
  note?: string | null;
};

export async function deliverSettingsBooking(id: string, options: DeliverBookingOptions) {
  const deliveryUrl = options.deliveryUrl?.trim() || "";
  const hasDeliveryFile = Boolean(deliveryUrl) && /^\/uploads\//.test(deliveryUrl);
  if (deliveryUrl && !hasDeliveryFile) {
    return { ok: false as const, error: "Invalid delivery file." };
  }

  const booking = await prisma.specialRequest.findUnique({
    where: { id },
    select: {
      id: true,
      reference: true,
      status: true,
      userId: true,
      threadId: true,
      detailsJson: true,
      instantBooking: true,
      creator: {
        select: {
          name: true,
          userId: true,
        },
      },
      user: {
        select: {
          firstName: true,
          lastName: true,
          handle: true,
          profile: {
            select: {
              displayName: true,
              handle: true,
              slug: true,
            },
          },
        },
      },
    },
  });

  if (!booking) {
    return { ok: false as const, error: "Booking not found." };
  }

  if (booking.instantBooking && !hasDeliveryFile) {
    return { ok: false as const, error: "Upload a delivery file before marking this complete." };
  }

  if (booking.status === "DELIVERED") {
    return {
      ok: true as const,
      alreadyDelivered: true as const,
      reference: booking.reference,
      status: "DELIVERED" as const,
      statusLabel: statusLabel("DELIVERED"),
      deliveredAtLabel: null as string | null,
      deliveryUrl: hasDeliveryFile ? deliveryUrl : "",
      deliveryName: hasDeliveryFile
        ? options.deliveryName?.trim() || "Delivery file"
        : null,
    };
  }

  if (booking.status !== "ACCEPTED" && booking.status !== "IN_PROGRESS") {
    return {
      ok: false as const,
      error: `Only accepted bookings can be delivered (current status: ${statusLabel(booking.status)}).`,
    };
  }

  const deliveredAt = new Date();
  const creatorName = booking.creator.name?.trim() || "the creator";
  const firstName = creatorName.split(" ")[0] || creatorName;
  const deliveryName = hasDeliveryFile
    ? options.deliveryName?.trim() || "Delivery file"
    : null;
  const note = options.note?.trim() || "";

  const bodyParts = [
    booking.instantBooking
      ? `Booking ${booking.reference} has been delivered.`
      : `Booking ${booking.reference} has been marked as completed.`,
  ];
  if (deliveryName) bodyParts.push(`File: ${deliveryName}.`);
  if (note) bodyParts.push(`Note: ${note}`);

  const notePayload = {
    kind: "delivered" as const,
    reference: booking.reference,
    creatorName,
    specialRequestId: booking.id,
    title: booking.instantBooking
      ? `Delivered by ${firstName}`
      : `Completed by ${firstName}`,
    body: bodyParts.join(" "),
    ...(note ? { note } : {}),
    ...(hasDeliveryFile
      ? { attachmentUrl: deliveryUrl, attachmentName: deliveryName || "Delivery file" }
      : {}),
  };
  const noteBody = encodeBookingNote(notePayload);
  const notePreview = bookingNotePreview(notePayload);

  const existingDetails =
    booking.detailsJson &&
    typeof booking.detailsJson === "object" &&
    !Array.isArray(booking.detailsJson)
      ? (booking.detailsJson as Record<string, unknown>)
      : {};
  const detailsJson = {
    ...existingDetails,
    delivery: {
      deliveryUrl: hasDeliveryFile ? deliveryUrl : null,
      deliveryName,
      note: note || null,
      deliveredAt: deliveredAt.toISOString(),
    },
  };

  await prisma.specialRequest.update({
    where: { id },
    data: {
      status: "DELIVERED",
      deliveredAt,
      detailsJson,
    },
  });

  await postBookingNoteToBothParties({
    bookingId: booking.id,
    requesterUserId: booking.userId,
    requesterThreadId: booking.threadId,
    creatorOwnerUserId: booking.creator.userId,
    requester: booking.user,
    noteBody,
    notePreview,
    at: deliveredAt,
  });

  return {
    ok: true as const,
    alreadyDelivered: false as const,
    reference: booking.reference,
    status: "DELIVERED" as const,
    statusLabel: statusLabel("DELIVERED"),
    deliveredAtLabel: formatDateTime(deliveredAt),
    deliveryUrl: hasDeliveryFile ? deliveryUrl : "",
    deliveryName,
  };
}

export type BookingFeedbackSide = "provider" | "requester";

export type SubmitBookingFeedbackOptions = {
  side: BookingFeedbackSide;
  rating: number;
  note?: string | null;
  picks?: string[] | null;
};

export type StoredBookingFeedback = {
  rating: number;
  note: string | null;
  picks: string[];
  submittedAt: string;
};

function parseFeedbackEntry(value: unknown): StoredBookingFeedback | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const rating = typeof record.rating === "number" ? record.rating : Number(record.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return null;
  const note =
    typeof record.note === "string" && record.note.trim() ? record.note.trim() : null;
  const picks = Array.isArray(record.picks)
    ? record.picks
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 8)
    : [];
  const submittedAt =
    typeof record.submittedAt === "string" && record.submittedAt.trim()
      ? record.submittedAt.trim()
      : new Date().toISOString();
  return { rating, note, picks, submittedAt };
}

export function readBookingFeedback(
  detailsJson: unknown,
  side: BookingFeedbackSide,
): StoredBookingFeedback | null {
  if (!detailsJson || typeof detailsJson !== "object" || Array.isArray(detailsJson)) {
    return null;
  }
  const details = detailsJson as Record<string, unknown>;
  const feedback = details.feedback;
  if (!feedback || typeof feedback !== "object" || Array.isArray(feedback)) {
    return null;
  }
  return parseFeedbackEntry((feedback as Record<string, unknown>)[side]);
}

export async function submitBookingFeedback(id: string, options: SubmitBookingFeedbackOptions) {
  const rating = Number(options.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false as const, error: "Choose a star rating from 1 to 5." };
  }

  const noteRaw = options.note?.trim() || "";
  if (noteRaw.length > 500) {
    return { ok: false as const, error: "Feedback must be 500 characters or fewer." };
  }

  const picks = (options.picks ?? [])
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);

  const booking = await prisma.specialRequest.findUnique({
    where: { id },
    select: {
      id: true,
      reference: true,
      status: true,
      detailsJson: true,
    },
  });

  if (!booking) {
    return { ok: false as const, error: "Booking not found." };
  }

  if (booking.status !== "DELIVERED") {
    return {
      ok: false as const,
      error: "Feedback is only available after a request is delivered.",
    };
  }

  const existing = readBookingFeedback(booking.detailsJson, options.side);
  if (existing) {
    return {
      ok: true as const,
      alreadySubmitted: true as const,
      reference: booking.reference,
      status: booking.status,
      statusLabel: statusLabel(booking.status),
      feedbackSubmitted: true as const,
      feedbackRating: existing.rating,
      feedbackNote: existing.note,
      feedbackPicks: existing.picks,
      feedbackSubmittedAt: existing.submittedAt,
    };
  }

  const submittedAt = new Date().toISOString();
  const entry: StoredBookingFeedback = {
    rating,
    note: noteRaw || null,
    picks,
    submittedAt,
  };

  const existingDetails =
    booking.detailsJson &&
    typeof booking.detailsJson === "object" &&
    !Array.isArray(booking.detailsJson)
      ? (booking.detailsJson as Record<string, unknown>)
      : {};
  const existingFeedback =
    existingDetails.feedback &&
    typeof existingDetails.feedback === "object" &&
    !Array.isArray(existingDetails.feedback)
      ? (existingDetails.feedback as Record<string, unknown>)
      : {};

  const detailsJson = {
    ...existingDetails,
    feedback: {
      ...existingFeedback,
      [options.side]: entry,
    },
  };

  await prisma.specialRequest.update({
    where: { id },
    data: { detailsJson: detailsJson as Prisma.InputJsonValue },
  });

  return {
    ok: true as const,
    alreadySubmitted: false as const,
    reference: booking.reference,
    status: booking.status,
    statusLabel: statusLabel(booking.status),
    feedbackSubmitted: true as const,
    feedbackRating: entry.rating,
    feedbackNote: entry.note,
    feedbackPicks: entry.picks,
    feedbackSubmittedAt: entry.submittedAt,
  };
}

async function postDeclineRefundNotice(input: {
  booking: {
    id: string;
    reference: string;
    userId: string;
    threadId: string | null;
    creator: {
      name: string | null;
      userId: string | null;
    };
    user: {
      firstName: string | null;
      lastName: string | null;
      handle: string | null;
      profile: {
        displayName: string | null;
        handle: string | null;
        slug: string | null;
      } | null;
    };
  };
  amount: number;
  currency: string;
  at: Date;
}) {
  const amount = Math.max(0, Math.round(input.amount));
  if (amount <= 0) return;

  const creatorName = input.booking.creator.name?.trim() || "the creator";
  const amountLabel = `${amount} ${input.currency}`;
  const notePayload = {
    kind: "refund" as const,
    reference: input.booking.reference,
    creatorName,
    specialRequestId: input.booking.id,
    title: "Refund issued",
    body: `A refund of ${amountLabel} has been issued for booking ${input.booking.reference} because this request was declined. The amount will return to your original payment method.`,
    refundAmount: amount,
    currency: input.currency,
  };

  await postBookingNoteToBothParties({
    bookingId: input.booking.id,
    requesterUserId: input.booking.userId,
    requesterThreadId: input.booking.threadId,
    creatorOwnerUserId: input.booking.creator.userId,
    requester: input.booking.user,
    noteBody: encodeBookingNote(notePayload),
    notePreview: bookingNotePreview(notePayload),
    at: input.at,
  });
}

async function postBookingNoteToBothParties(input: {
  bookingId: string;
  requesterUserId: string;
  requesterThreadId: string | null;
  creatorOwnerUserId: string | null;
  requester: {
    firstName: string | null;
    lastName: string | null;
    handle: string | null;
    profile: {
      displayName: string | null;
      handle: string | null;
      slug: string | null;
    } | null;
  };
  noteBody: string;
  notePreview: string;
  at: Date;
}) {
  const {
    bookingId,
    requesterUserId,
    requesterThreadId,
    creatorOwnerUserId,
    requester,
    noteBody,
    notePreview,
    at,
  } = input;

  if (requesterThreadId) {
    await prisma.$transaction([
      prisma.chatMessage.create({
        data: {
          threadId: requesterThreadId,
          body: noteBody,
          fromMe: false,
          specialRequestId: bookingId,
        },
      }),
      prisma.chatThread.update({
        where: { id: requesterThreadId },
        data: {
          preview: notePreview,
          lastMessageAt: at,
          unreadCount: { increment: 1 },
        },
      }),
    ]);
  }

  if (!creatorOwnerUserId || creatorOwnerUserId === requesterUserId) return;

  const requesterName =
    requester.profile?.displayName?.trim() ||
    `${requester.firstName?.trim() || ""} ${requester.lastName?.trim() || ""}`.trim() ||
    "Fan";
  const requesterHandle =
    requester.profile?.handle?.trim() ||
    requester.handle?.trim() ||
    `@${requesterName.toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 24) || "fan"}`;
  const requesterSlug = requester.profile?.slug?.trim() || null;

  const ownerThread =
    (await prisma.chatThread.findFirst({
      where: {
        userId: creatorOwnerUserId,
        OR: [
          requesterSlug
            ? { peerSlug: { equals: requesterSlug, mode: "insensitive" as const } }
            : undefined,
          { peerHandle: { equals: requesterHandle, mode: "insensitive" as const } },
        ].filter(Boolean) as Array<
          | { peerSlug: { equals: string; mode: "insensitive" } }
          | { peerHandle: { equals: string; mode: "insensitive" } }
        >,
      },
      select: { id: true },
    })) || null;

  if (!ownerThread) return;

  await prisma.$transaction([
    prisma.chatMessage.create({
      data: {
        threadId: ownerThread.id,
        body: noteBody,
        fromMe: true,
        specialRequestId: bookingId,
      },
    }),
    prisma.chatThread.update({
      where: { id: ownerThread.id },
      data: {
        preview: notePreview,
        lastMessageAt: at,
      },
    }),
  ]);
}
