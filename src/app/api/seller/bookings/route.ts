import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { listSellerBookings } from "@/lib/seller/bookings";
import { requireSellerSpecialRequestsIdentity } from "@/lib/seller/identity";

export async function GET() {
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
    const bookings = await listSellerBookings(identity.slug);
    return NextResponse.json({ slug: identity.slug, bookings });
  } catch (error) {
    console.error("seller/bookings GET error", error);
    return NextResponse.json({ error: "Unable to load bookings." }, { status: 500 });
  }
}
