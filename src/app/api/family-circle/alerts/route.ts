import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/api-helpers";
import { AccountType } from "@/generated/prisma/client";
import { countUnresolvedSafetyAlerts } from "@/lib/guardian/safety-alerts";

export async function GET() {
  try {
    const { user, error } = await requireSessionUser();
    if (error) return error;
    if (user.accountType !== AccountType.GUARDIAN) {
      return NextResponse.json({ error: "Guardian access required." }, { status: 403 });
    }

    const unresolvedCount = await countUnresolvedSafetyAlerts(user.id);
    return NextResponse.json({ unresolvedCount });
  } catch (error) {
    console.error("GET /api/family-circle/alerts error", error);
    return NextResponse.json({ error: "Unable to load safety alerts." }, { status: 500 });
  }
}
