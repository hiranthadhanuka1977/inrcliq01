import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  acceptCounterOfferSettingsBooking,
  acceptSettingsBooking,
  completeOfferBalancePayment,
  declineCounterOfferSettingsBooking,
  declineOfferByRequester,
  declineSettingsBooking,
  deliverSettingsBooking,
  sendCounterOfferByRequester,
  sendNewOfferSettingsBooking,
  submitBookingFeedback,
  type BookingFeedbackSide,
} from "@/lib/settings/bookings";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function requireInboundBookingOwner(bookingId: string, userId: string) {
  return prisma.specialRequest.findFirst({
    where: {
      id: bookingId,
      creator: { userId },
    },
    select: {
      id: true,
      status: true,
      instantBooking: true,
    },
  });
}

async function requireOutboundBookingOwner(bookingId: string, userId: string) {
  return prisma.specialRequest.findFirst({
    where: {
      id: bookingId,
      userId,
    },
    select: {
      id: true,
      status: true,
    },
  });
}

async function resolveFeedbackAccess(bookingId: string, userId: string) {
  const booking = await prisma.specialRequest.findFirst({
    where: {
      id: bookingId,
      OR: [{ userId }, { creator: { userId } }],
    },
    select: {
      id: true,
      userId: true,
      creator: { select: { userId: true } },
    },
  });
  if (!booking) return null;

  let side: BookingFeedbackSide | null = null;
  if (booking.userId === userId) side = "requester";
  else if (booking.creator.userId === userId) side = "provider";
  if (!side) return null;

  return { id: booking.id, side };
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const body = (await request.json().catch(() => null)) as {
      action?: string;
      reason?: string;
      offerPrice?: number | string | null;
      note?: string | null;
      attachmentUrl?: string | null;
      attachmentName?: string | null;
      deliveryUrl?: string | null;
      deliveryName?: string | null;
      rating?: number | string | null;
      picks?: string[] | null;
    } | null;
    const action = body?.action?.trim().toLowerCase();

    if (action === "feedback") {
      const access = await resolveFeedbackAccess(id, user.id);
      if (!access) {
        return NextResponse.json({ error: "Booking not found." }, { status: 404 });
      }

      const rating =
        body?.rating === "" || body?.rating == null ? NaN : Number(body.rating);
      const result = await submitBookingFeedback(id, {
        side: access.side,
        rating,
        note: body?.note ?? null,
        picks: Array.isArray(body?.picks) ? body.picks : [],
      });
      if (!result.ok) {
        const status =
          result.error === "Booking not found."
            ? 404
            : result.error.includes("star rating") ||
                result.error.includes("500 characters")
              ? 400
              : 409;
        return NextResponse.json({ error: result.error }, { status });
      }

      return NextResponse.json({
        ok: true,
        reference: result.reference,
        status: result.status,
        statusLabel: result.statusLabel,
        feedbackSubmitted: result.feedbackSubmitted,
        feedbackRating: result.feedbackRating,
        feedbackNote: result.feedbackNote,
        feedbackPicks: result.feedbackPicks,
        feedbackSubmittedAt: result.feedbackSubmittedAt,
        alreadySubmitted: result.alreadySubmitted,
      });
    }

    if (action === "send_offer") {
      const booking = await requireInboundBookingOwner(id, user.id);
      if (!booking) {
        return NextResponse.json({ error: "Booking not found." }, { status: 404 });
      }

      const parsedPrice =
        body?.offerPrice === "" || body?.offerPrice == null
          ? null
          : Number(body.offerPrice);
      const result = await sendNewOfferSettingsBooking(id, {
        offerPrice: Number.isFinite(parsedPrice) ? parsedPrice : null,
        note: body?.note ?? null,
      });
      if (!result.ok) {
        const status = result.error === "Booking not found." ? 404 : 409;
        return NextResponse.json({ error: result.error }, { status });
      }

      return NextResponse.json({
        ok: true,
        reference: result.reference,
        status: result.status,
        statusLabel: result.statusLabel,
        totalLabel: result.totalLabel,
        offerPrice: result.offerPrice ?? null,
        note: result.note ?? null,
        alreadySent: result.alreadySent,
      });
    }

    if (action === "decline_offer") {
      const booking = await requireOutboundBookingOwner(id, user.id);
      if (!booking) {
        return NextResponse.json({ error: "Booking not found." }, { status: 404 });
      }

      const result = await declineOfferByRequester(id, body?.reason ?? undefined);
      if (!result.ok) {
        const status = result.error === "Booking not found." ? 404 : 409;
        return NextResponse.json({ error: result.error }, { status });
      }

      return NextResponse.json({
        ok: true,
        reference: result.reference,
        status: result.status,
        statusLabel: result.statusLabel,
        declinedAtLabel: result.declinedAtLabel,
        declineReason: result.declineReason,
        alreadyDeclined: result.alreadyDeclined,
      });
    }

    if (action === "counter_offer") {
      const booking = await requireOutboundBookingOwner(id, user.id);
      if (!booking) {
        return NextResponse.json({ error: "Booking not found." }, { status: 404 });
      }

      const parsedPrice =
        body?.offerPrice === "" || body?.offerPrice == null
          ? NaN
          : Number(body.offerPrice);
      const result = await sendCounterOfferByRequester(id, user.id, {
        offerPrice: parsedPrice,
        note: body?.note ?? null,
      });
      if (!result.ok) {
        const status =
          result.error === "Booking not found."
            ? 404
            : result.error.includes("valid counter offer price")
              ? 400
              : 409;
        return NextResponse.json({ error: result.error }, { status });
      }

      return NextResponse.json({
        ok: true,
        reference: result.reference,
        status: result.status,
        statusLabel: result.statusLabel,
        totalLabel: result.totalLabel,
        offerPrice: result.offerPrice ?? null,
        note: result.note ?? null,
        alreadySent: result.alreadySent,
      });
    }

    if (action === "accept_counter") {
      const booking = await requireInboundBookingOwner(id, user.id);
      if (!booking) {
        return NextResponse.json({ error: "Booking not found." }, { status: 404 });
      }

      const result = await acceptCounterOfferSettingsBooking(id);
      if (!result.ok) {
        const status = result.error === "Booking not found." ? 404 : 409;
        return NextResponse.json({ error: result.error }, { status });
      }

      return NextResponse.json({
        ok: true,
        reference: result.reference,
        status: result.status,
        statusLabel: result.statusLabel,
        totalLabel: result.totalLabel,
        offerPrice: result.offerPrice ?? null,
        note: result.note ?? null,
      });
    }

    if (action === "decline_counter") {
      const booking = await requireInboundBookingOwner(id, user.id);
      if (!booking) {
        return NextResponse.json({ error: "Booking not found." }, { status: 404 });
      }

      const result = await declineCounterOfferSettingsBooking(id, body?.reason ?? undefined);
      if (!result.ok) {
        const status = result.error === "Booking not found." ? 404 : 409;
        return NextResponse.json({ error: result.error }, { status });
      }

      return NextResponse.json({
        ok: true,
        reference: result.reference,
        status: result.status,
        statusLabel: result.statusLabel,
        totalLabel: result.totalLabel,
        declineReason: result.declineReason,
      });
    }

    if (action === "pay_balance") {
      const booking = await requireOutboundBookingOwner(id, user.id);
      if (!booking) {
        return NextResponse.json({ error: "Booking not found." }, { status: 404 });
      }

      const result = await completeOfferBalancePayment(id, user.id);
      if (!result.ok) {
        const status = result.error === "Booking not found." ? 404 : 409;
        return NextResponse.json({ error: result.error }, { status });
      }

      return NextResponse.json({
        ok: true,
        reference: result.reference,
        status: result.status,
        statusLabel: result.statusLabel,
        balancePaid: result.balancePaid,
        currency: result.currency,
        alreadyPaid: result.alreadyPaid,
      });
    }

    const booking = await requireInboundBookingOwner(id, user.id);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    if (action === "accept") {
      const parsedPrice =
        body?.offerPrice === "" || body?.offerPrice == null
          ? null
          : Number(body.offerPrice);
      const result = await acceptSettingsBooking(id, {
        offerPrice: Number.isFinite(parsedPrice) ? parsedPrice : null,
        note: body?.note ?? null,
        attachmentUrl: body?.attachmentUrl ?? null,
        attachmentName: body?.attachmentName ?? null,
      });
      if (!result.ok) {
        const status =
          result.error === "Booking not found."
            ? 404
            : result.error === "Invalid attachment."
              ? 400
              : 409;
        return NextResponse.json({ error: result.error }, { status });
      }

      return NextResponse.json({
        ok: true,
        reference: result.reference,
        status: result.status,
        statusLabel: result.statusLabel,
        acceptedAtLabel: result.acceptedAtLabel,
        deliverBy: result.deliverBy ?? null,
        totalLabel: result.totalLabel ?? null,
        offerPrice: result.offerPrice ?? null,
        note: result.note ?? null,
        attachmentUrl: result.attachmentUrl ?? null,
        attachmentName: result.attachmentName ?? null,
        alreadyAccepted: result.alreadyAccepted,
      });
    }

    if (action === "decline") {
      const result = await declineSettingsBooking(id, body?.reason ?? "");
      if (!result.ok) {
        const status =
          result.error === "Booking not found."
            ? 404
            : result.error === "A decline reason is required."
              ? 400
              : 409;
        return NextResponse.json({ error: result.error }, { status });
      }

      return NextResponse.json({
        ok: true,
        reference: result.reference,
        status: result.status,
        statusLabel: result.statusLabel,
        declinedAtLabel: result.declinedAtLabel,
        declineReason: result.declineReason,
        alreadyDeclined: result.alreadyDeclined,
      });
    }

    if (action === "deliver") {
      const result = await deliverSettingsBooking(id, {
        deliveryUrl: body?.deliveryUrl ?? "",
        deliveryName: body?.deliveryName ?? null,
        note: body?.note ?? null,
      });
      if (!result.ok) {
        const status =
          result.error === "Booking not found."
            ? 404
            : result.error.includes("Upload a delivery file") ||
                result.error.includes("Invalid delivery file")
              ? 400
              : 409;
        return NextResponse.json({ error: result.error }, { status });
      }

      return NextResponse.json({
        ok: true,
        reference: result.reference,
        status: result.status,
        statusLabel: result.statusLabel,
        deliveredAtLabel: result.deliveredAtLabel,
        deliveryUrl: result.deliveryUrl,
        deliveryName: result.deliveryName,
        alreadyDelivered: result.alreadyDelivered,
      });
    }

    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  } catch (error) {
    console.error("feed/bookings/[id] PATCH error", error);
    const message =
      error instanceof Error && process.env.NODE_ENV !== "production"
        ? error.message
        : "Unable to update booking.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
