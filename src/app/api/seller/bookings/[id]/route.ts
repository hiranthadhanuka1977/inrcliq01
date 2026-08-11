import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import {
  acceptSellerBooking,
  declineSellerBooking,
  getSellerBookingById,
} from "@/lib/seller/bookings";
import { requireSellerSpecialRequestsIdentity } from "@/lib/seller/identity";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const identity = await requireSellerSpecialRequestsIdentity();
  if (!identity) {
    return NextResponse.json(
      { error: "Special Requests are not enabled for this account." },
      { status: 403 },
    );
  }

  const { id } = await context.params;
  const booking = await getSellerBookingById(id, identity.slug);
  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  return NextResponse.json({ booking });
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const identity = await requireSellerSpecialRequestsIdentity();
  if (!identity) {
    return NextResponse.json(
      { error: "Special Requests are not enabled for this account." },
      { status: 403 },
    );
  }

  try {
    const { id } = await context.params;
    const body = (await request.json().catch(() => null)) as {
      action?: string;
      reason?: string;
    } | null;
    const action = body?.action?.trim().toLowerCase();

    if (action === "accept") {
      const result = await acceptSellerBooking(id, identity.slug);
      if (!result.ok) {
        const status = result.error === "Booking not found." ? 404 : 409;
        return NextResponse.json({ error: result.error }, { status });
      }

      return NextResponse.json({
        ok: true,
        reference: result.reference,
        status: result.status,
        statusLabel: result.statusLabel,
        acceptedAtLabel: result.acceptedAtLabel,
        alreadyAccepted: result.alreadyAccepted,
      });
    }

    if (action === "decline") {
      const result = await declineSellerBooking(id, body?.reason ?? "", identity.slug);
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
    console.error("seller/bookings/[id] PATCH error", error);
    return NextResponse.json({ error: "Unable to update booking." }, { status: 500 });
  }
}
