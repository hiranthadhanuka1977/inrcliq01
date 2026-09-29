import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/api-helpers";
import { AccountType } from "@/generated/prisma/client";
import {
  applySafetyAlertAction,
  getSafetyAlertDetailForGuardian,
} from "@/lib/guardian/safety-alerts";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const ACTIONS = ["acknowledge", "allow", "reject", "block"] as const;
type AlertAction = (typeof ACTIONS)[number];

function isAlertAction(value: unknown): value is AlertAction {
  return typeof value === "string" && (ACTIONS as readonly string[]).includes(value);
}

async function guardianAndAlertId(context: RouteContext) {
  const { user, error } = await requireSessionUser();
  if (error) return { error };
  if (user.accountType !== AccountType.GUARDIAN) {
    return { error: NextResponse.json({ error: "Guardian access required." }, { status: 403 }) };
  }
  const { id } = await context.params;
  const alertId = id?.trim();
  if (!alertId) {
    return { error: NextResponse.json({ error: "Alert id is required." }, { status: 400 }) };
  }
  return { user, alertId };
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const resolved = await guardianAndAlertId(context);
    if ("error" in resolved) return resolved.error;

    const detail = await getSafetyAlertDetailForGuardian(resolved.user.id, resolved.alertId);
    if (!detail) {
      return NextResponse.json({ error: "Alert not found." }, { status: 404 });
    }
    return NextResponse.json(detail, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("GET /api/family-circle/alerts/[id] error", error);
    return NextResponse.json({ error: "Unable to load this alert." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const resolved = await guardianAndAlertId(context);
    if ("error" in resolved) return resolved.error;

    const body = (await request.json().catch(() => ({}))) as { action?: string };
    if (!isAlertAction(body.action)) {
      return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
    }

    const result = await applySafetyAlertAction(resolved.user.id, resolved.alertId, body.action);
    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error,
          ...(result.code ? { code: result.code } : {}),
          ...(result.alertStatus ? { status: result.alertStatus } : {}),
        },
        { status: result.status },
      );
    }

    return NextResponse.json({ ok: true, status: result.status ?? null });
  } catch (error) {
    console.error("PATCH /api/family-circle/alerts/[id] error", error);
    return NextResponse.json({ error: "Unable to update this alert." }, { status: 500 });
  }
}
