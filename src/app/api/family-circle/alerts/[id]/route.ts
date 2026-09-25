import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/api-helpers";
import { AccountType } from "@/generated/prisma/client";
import { acknowledgeSafetyAlert } from "@/lib/guardian/safety-alerts";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
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

    const body = (await request.json().catch(() => ({}))) as { action?: string };
    if (body.action !== "acknowledge") {
      return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
    }

    const result = await acknowledgeSafetyAlert(user.id, alertId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PATCH /api/family-circle/alerts/[id] error", error);
    return NextResponse.json({ error: "Unable to update this alert." }, { status: 500 });
  }
}
