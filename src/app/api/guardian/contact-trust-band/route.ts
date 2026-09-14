import { NextResponse } from "next/server";
import { AccountType } from "@/generated/prisma/client";
import {
  isContactTrustBandId,
  upsertContactTrustBand,
  type ContactTrustBandKind,
} from "@/lib/guardian/contact-trust-band";
import { getSessionUser } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user || user.accountType !== AccountType.GUARDIAN) {
      return NextResponse.json({ error: "Guardian session required." }, { status: 401 });
    }

    const body = await request.json();
    const childUserId = typeof body.childUserId === "string" ? body.childUserId.trim() : "";
    const contactKey = typeof body.contactKey === "string" ? body.contactKey.trim() : "";
    const contactKindRaw = typeof body.contactKind === "string" ? body.contactKind.trim() : "";
    const trustBandRaw = typeof body.trustBand === "string" ? body.trustBand.trim() : "";

    if (!childUserId || !contactKey || !contactKindRaw || !trustBandRaw) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    if (contactKindRaw !== "dm" && contactKindRaw !== "sibling") {
      return NextResponse.json({ error: "Invalid contact kind." }, { status: 400 });
    }

    if (!isContactTrustBandId(trustBandRaw)) {
      return NextResponse.json({ error: "Invalid trust band." }, { status: 400 });
    }

    const result = await upsertContactTrustBand({
      guardianUserId: user.id,
      childUserId,
      contactKey,
      contactKind: contactKindRaw as ContactTrustBandKind,
      trustBand: trustBandRaw,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      ok: true,
      childUserId,
      contactKey,
      contactKind: contactKindRaw,
      trustBand: trustBandRaw,
    });
  } catch (error) {
    console.error("guardian/contact-trust-band error", error);
    return NextResponse.json({ error: "Unable to save trust band." }, { status: 500 });
  }
}
