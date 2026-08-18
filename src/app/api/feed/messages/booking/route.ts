import { NextResponse } from "next/server";
import { mapThreadToConversation } from "@/lib/feed/chat";
import {
  bookingMessagePreview,
  encodeBookingMessage,
  generateBookingReference,
  parseDeliveryDeadline,
} from "@/lib/feed/booking-confirmation";
import {
  ensureChatThreadForCreatorSlug,
  sendBookingConfirmationMessage,
} from "@/lib/feed/chat-service";
import {
  createSpecialRequest,
  specialRequestToBookingPayload,
} from "@/lib/feed/special-request-service";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { acceptSettingsBooking } from "@/lib/settings/bookings";
import { getSpecialRequestCatalogBySlug } from "@/lib/seller/service-requests-store";
import { resolveCategoryInstantBooking } from "@/lib/seller/service-requests-helpers";

type BookingRequestBody = {
  slug?: string;
  booking?: {
    reference?: string;
    requestLabel?: string;
    category?: string;
    occasion?: string;
    contentType?: string;
    duration?: string;
    tone?: string | null;
    contentSummary?: string | null;
    publishingMethod?: string;
    recipientLabel?: string;
    recipientUsername?: string;
    shoutoutMessage?: string;
    specialInstructions?: string;
    isAppearance?: boolean;
    appearanceLocation?: string;
    appearanceExpectation?: string;
    appearanceReference?: string;
    dayRate?: number;
    feedFee?: number;
    totalFee?: number;
    currency?: string;
    when?: string;
    deliverBy?: string;
    creatorName?: string;
  };
};

function initialsFromName(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function normalizeHandle(value: string | null | undefined, fallback: string) {
  const raw = (value || fallback).trim();
  if (!raw) return "@user";
  return raw.startsWith("@") ? raw : `@${raw}`;
}

function parseOptionalDate(value: string | undefined | null) {
  if (!value?.trim()) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : new Date(parsed);
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = (await request.json().catch(() => null)) as BookingRequestBody | null;
    const slug = payload?.slug?.trim() ?? "";
    const booking = payload?.booking;
    if (!slug || !booking) {
      return NextResponse.json({ error: "Invalid booking payload." }, { status: 400 });
    }

    let thread = await ensureChatThreadForCreatorSlug(user.id, slug);
    if (!thread) {
      return NextResponse.json({ error: "Creator conversation not found." }, { status: 404 });
    }

    let creatorId = thread.peerCreatorId;
    let creatorName = booking.creatorName?.trim() || thread.peerName;

    if (!creatorId) {
      const creator = await prisma.creatorUser.findFirst({
        where: {
          OR: [
            { slug: { equals: slug, mode: "insensitive" } },
            { handle: { equals: `@${slug}`, mode: "insensitive" } },
            { handle: { equals: slug, mode: "insensitive" } },
          ],
        },
        select: { id: true, name: true },
      });
      if (!creator) {
        return NextResponse.json({ error: "Creator not found." }, { status: 404 });
      }
      creatorId = creator.id;
      creatorName = booking.creatorName?.trim() || creator.name || thread.peerName;
      try {
        thread = await prisma.chatThread.update({
          where: { id: thread.id },
          data: { peerCreatorId: creator.id },
          include: { messages: { orderBy: { createdAt: "asc" } } },
        });
      } catch {
        // Another thread may already own this user/creator pair; keep going with creatorId.
      }
    } else {
      const creator = await prisma.creatorUser.findUnique({
        where: { id: creatorId },
        select: { name: true },
      });
      creatorName = booking.creatorName?.trim() || creator?.name || thread.peerName;
    }

    const deliverBy =
      parseOptionalDate(booking.deliverBy) ?? new Date(parseDeliveryDeadline(booking.when));

    const catalog = await getSpecialRequestCatalogBySlug(slug);
    const instantBooking = catalog
      ? resolveCategoryInstantBooking(catalog.content, booking.category)
      : false;

    const specialRequest = await createSpecialRequest({
      userId: user.id,
      creatorId,
      threadId: thread.id,
      reference: booking.reference?.trim() || generateBookingReference(),
      requestLabel: booking.requestLabel?.trim() || "Special request",
      category: booking.category,
      occasion: booking.occasion,
      contentType: booking.contentType,
      duration: booking.duration,
      publishingMethod: booking.publishingMethod,
      recipientLabel: booking.recipientLabel,
      recipientUsername: booking.recipientUsername,
      shoutoutMessage: booking.shoutoutMessage,
      specialInstructions: booking.specialInstructions,
      isAppearance: Boolean(booking.isAppearance),
      instantBooking,
      appearanceLocation: booking.appearanceLocation,
      appearanceExpectation: booking.appearanceExpectation,
      appearanceReference: booking.appearanceReference,
      dayRate: booking.dayRate,
      feedFee: booking.feedFee,
      totalFee: booking.totalFee,
      currency: booking.currency,
      requestedForAt: parseOptionalDate(booking.when),
      deliverBy,
      detailsJson: {
        source: "requests-checkout",
        creatorSlug: slug,
        contentSummary: booking.contentSummary?.trim() || null,
        tone: booking.tone?.trim() || null,
      },
    });

    if (instantBooking) {
      await acceptSettingsBooking(specialRequest.id);
    }

    const requestForPayload =
      instantBooking
        ? await prisma.specialRequest.findUniqueOrThrow({ where: { id: specialRequest.id } })
        : specialRequest;

    const chatPayload = {
      ...specialRequestToBookingPayload(requestForPayload, creatorName),
      specialRequestId: specialRequest.id,
    };

    const encoded = encodeBookingMessage(chatPayload);
    const preview = bookingMessagePreview(chatPayload);
    const fresh = await sendBookingConfirmationMessage(
      user.id,
      thread.id,
      encoded,
      preview,
      specialRequest.id,
    );
    if (!fresh) {
      return NextResponse.json({ error: "Could not save booking message." }, { status: 500 });
    }

    const creatorOwner = creatorId
      ? await prisma.creatorUser.findUnique({
          where: { id: creatorId },
          select: { userId: true },
        })
      : null;

    const ownerUserId = creatorOwner?.userId;
    if (ownerUserId && ownerUserId !== user.id) {
      const requester = await prisma.user.findUnique({
        where: { id: user.id },
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

      const requesterName =
        requester?.profile?.displayName?.trim() ||
        `${requester?.firstName?.trim() || ""} ${requester?.lastName?.trim() || ""}`.trim() ||
        "Fan";
      const requesterHandle = normalizeHandle(
        requester?.profile?.handle || requester?.handle,
        requesterName.toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 24),
      );
      const requesterSlug = requester?.profile?.slug?.trim() || null;
      const requesterInitials =
        requester?.profile?.avatarInitials?.trim() || initialsFromName(requesterName);
      const requesterAvatarColor = requester?.profile?.avatarColor?.trim() || "#6b9fff";
      const requesterAvatarUrl = requester?.profile?.avatarUrl?.trim() || null;

      const ownerThread =
        (await prisma.chatThread.findFirst({
          where: {
            userId: ownerUserId,
            OR: [
              requesterSlug
                ? { peerSlug: { equals: requesterSlug, mode: "insensitive" } }
                : undefined,
              { peerHandle: { equals: requesterHandle, mode: "insensitive" } },
            ].filter(Boolean) as Array<
              | { peerSlug: { equals: string; mode: "insensitive" } }
              | { peerHandle: { equals: string; mode: "insensitive" } }
            >,
          },
          select: { id: true },
        })) ||
        (await prisma.chatThread.create({
          data: {
            userId: ownerUserId,
            peerCreatorId: null,
            peerName: requesterName,
            peerHandle: requesterHandle,
            peerInitials: requesterInitials,
            peerAvatarColor: requesterAvatarColor,
            peerAvatarUrl: requesterAvatarUrl,
            peerSlug: requesterSlug,
            peerOnline: false,
            preview: null,
            lastMessageAt: null,
            unreadCount: 0,
          },
          select: { id: true },
        }));

      await sendBookingConfirmationMessage(
        ownerUserId,
        ownerThread.id,
        encoded,
        preview,
        specialRequest.id,
        { fromMe: false, incrementUnread: true },
      );
    }

    return NextResponse.json({
      conversation: mapThreadToConversation(fresh),
      threadId: fresh.id,
      specialRequestId: specialRequest.id,
      reference: specialRequest.reference,
    });
  } catch (error) {
    console.error("[booking] failed to confirm booking", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not confirm booking message.",
      },
      { status: 500 },
    );
  }
}
