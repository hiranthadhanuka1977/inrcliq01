import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/api-helpers";
import { AccountType } from "@/generated/prisma/client";
import { viewHeldMessageForGuardian } from "@/lib/guardian/safety-alerts";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const { user, error } = await requireSessionUser();
    if (error) return error;
    if (user.accountType !== AccountType.GUARDIAN) {
      return NextResponse.json({ error: "Guardian access required." }, { status: 403 });
    }

    const { id } = await context.params;
    const alertId = id?.trim();
    if (!alertId) {
      return NextResponse.json({ error: "Alert id is required." }, { status: 400 });
    }

    const result = await viewHeldMessageForGuardian(user.id, alertId);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, ...(result.code ? { code: result.code } : {}) },
        { status: result.status, headers: NO_STORE },
      );
    }

    return NextResponse.json(
      { lightMaskedBody: result.lightMaskedBody, flaggedCategory: result.flaggedCategory },
      { headers: NO_STORE },
    );
  } catch (error) {
    console.error("POST /api/family-circle/alerts/[id]/view error", error);
    return NextResponse.json({ error: "Unable to load this message." }, { status: 500 });
  }
}
