import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  acceptSettingsBooking,
  declineSettingsBooking,
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

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const booking = await requireInboundBookingOwner(id, user.id);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found." }, { status: 404 });
    }

    const body = (await request.json().catch(() => null)) as {
      action?: string;
      reason?: string;
      offerPrice?: number | string | null;
      note?: string | null;
      attachmentUrl?: string | null;
      attachmentName?: string | null;
    } | null;
    const action = body?.action?.trim().toLowerCase();

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

    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  } catch (error) {
    console.error("feed/bookings/[id] PATCH error", error);
    return NextResponse.json({ error: "Unable to update booking." }, { status: 500 });
  }
}
