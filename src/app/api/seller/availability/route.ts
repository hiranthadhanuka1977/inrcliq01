import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { requireSellerSpecialRequestsIdentity } from "@/lib/seller/identity";
import {
  findCreatorIdForSeller,
  listUnavailableDateKeys,
  occupyingDateKeysForCreator,
  setCreatorUnavailableDates,
} from "@/lib/seller/unavailable-dates";

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

  const creatorId = await findCreatorIdForSeller(identity.userId, identity.slug);
  if (!creatorId) {
    return NextResponse.json({ error: "Creator profile not found." }, { status: 404 });
  }

  try {
    const [dates, occupied] = await Promise.all([
      listUnavailableDateKeys(creatorId),
      occupyingDateKeysForCreator(creatorId),
    ]);
    return NextResponse.json({ dates, occupied: [...occupied] });
  } catch (error) {
    console.error("seller/availability GET error", error);
    return NextResponse.json({ error: "Unable to load availability." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
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

  const creatorId = await findCreatorIdForSeller(identity.userId, identity.slug);
  if (!creatorId) {
    return NextResponse.json({ error: "Creator profile not found." }, { status: 404 });
  }

  const payload = (await request.json().catch(() => null)) as {
    dates?: unknown;
    unavailable?: unknown;
  } | null;

  if (!payload || !Array.isArray(payload.dates) || typeof payload.unavailable !== "boolean") {
    return NextResponse.json({ error: "Invalid availability payload." }, { status: 400 });
  }

  const dates = payload.dates.filter((value): value is string => typeof value === "string");
  if (dates.length === 0) {
    return NextResponse.json({ error: "Select at least one date." }, { status: 400 });
  }

  try {
    const result = await setCreatorUnavailableDates(creatorId, dates, payload.unavailable);
    if (payload.unavailable && result.updated.length === 0 && result.skipped.length > 0) {
      return NextResponse.json(
        {
          error: "Those days already have bookings and cannot be blocked.",
          dates: result.dates,
          updated: result.updated,
          skipped: result.skipped,
        },
        { status: 409 },
      );
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("seller/availability PUT error", error);
    return NextResponse.json({ error: "Unable to update availability." }, { status: 500 });
  }
}
