import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/api-helpers";
import { AccountType } from "@/generated/prisma/client";
import { reportFromSafetyAlert } from "@/lib/guardian/safety-alerts";
import { isGuardianReportReason, REPORT_DETAILS_MAX_LENGTH } from "@/lib/guardian/safety-reports";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
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

    const body = (await request.json().catch(() => ({}))) as { reason?: unknown; details?: unknown };
    if (!isGuardianReportReason(body.reason)) {
      return NextResponse.json({ error: "Choose a reason for the report." }, { status: 400 });
    }
    const details = typeof body.details === "string" ? body.details.trim() : "";
    if (details.length > REPORT_DETAILS_MAX_LENGTH) {
      return NextResponse.json(
        { error: `Details must be ${REPORT_DETAILS_MAX_LENGTH} characters or fewer.` },
        { status: 400 },
      );
    }

    const result = await reportFromSafetyAlert(user.id, alertId, {
      reason: body.reason,
      details: details || null,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(
      { ok: true, reportId: result.reportId, alreadyReported: !result.created },
      { status: result.created ? 201 : 200 },
    );
  } catch (error) {
    console.error("POST /api/family-circle/alerts/[id]/report error", error);
    return NextResponse.json({ error: "Unable to submit this report." }, { status: 500 });
  }
}
