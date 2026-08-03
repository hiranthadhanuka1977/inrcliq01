import { NextResponse } from "next/server";
import {
  acceptSettingsBooking,
  declineSettingsBooking,
  deleteSettingsBooking,
} from "@/lib/settings/bookings";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json().catch(() => null)) as {
      action?: string;
      reason?: string;
    } | null;
    const action = body?.action?.trim().toLowerCase();

    if (action === "accept") {
      const result = await acceptSettingsBooking(id);
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
  } catch (err) {
    console.error("settings/bookings/[id] PATCH error", err);
    return NextResponse.json({ error: "Unable to update booking." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const result = await deleteSettingsBooking(id);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json({ ok: true, reference: result.reference });
  } catch (err) {
    console.error("settings/bookings/[id] DELETE error", err);
    return NextResponse.json({ error: "Unable to delete booking." }, { status: 500 });
  }
}
