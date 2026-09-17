import { NextResponse } from "next/server";
import {
  type DmContactGuardianSettings,
  updateDmContactControlsForSession,
} from "@/lib/guardian/dm-contact-controls";

interface RouteContext {
  params: Promise<{ childId: string; threadId: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const { childId, threadId } = await context.params;
  const payload = (await request.json().catch(() => null)) as Partial<DmContactGuardianSettings> | null;

  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const settings = await updateDmContactControlsForSession({
    childUserId: childId,
    childThreadId: threadId,
    settings: {
      ...(payload.dmRestricted !== undefined ? { dmRestricted: Boolean(payload.dmRestricted) } : {}),
      ...(payload.requiresApproval !== undefined
        ? { requiresApproval: Boolean(payload.requiresApproval) }
        : {}),
      ...(payload.blocked !== undefined ? { blocked: Boolean(payload.blocked) } : {}),
    },
  });

  if (!settings) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ settings });
}
