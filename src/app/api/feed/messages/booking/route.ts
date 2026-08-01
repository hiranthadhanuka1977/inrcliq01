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

    const chatPayload = {
      ...specialRequestToBookingPayload(specialRequest, creatorName),
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
