import { NextResponse } from "next/server";
import { getChatThreadForUser, resolveReceiverUserId } from "@/lib/feed/chat-service";
import { createDmUserSafetyReport, REPORT_DETAILS_MAX_LENGTH } from "@/lib/guardian/safety-reports";
import { getSessionUser } from "@/lib/session";

interface RouteContext {
  params: Promise<{ threadId: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { threadId } = await context.params;
    const payload = (await request.json().catch(() => null)) as { reason?: string } | null;
    const reason = payload?.reason?.trim() ?? "";
    if (!reason) {
      return NextResponse.json({ error: "A reason is required." }, { status: 400 });
    }
    if (reason.length > REPORT_DETAILS_MAX_LENGTH) {
      return NextResponse.json(
        { error: `Reason must be ${REPORT_DETAILS_MAX_LENGTH} characters or fewer.` },
        { status: 400 },
      );
    }

    const thread = await getChatThreadForUser(user.id, threadId);
    if (!thread) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const subjectUserId = await resolveReceiverUserId(thread);
    if (!subjectUserId || subjectUserId === user.id) {
      return NextResponse.json(
        { error: "This person can't be reported from here yet." },
        { status: 400 },
      );
    }

    const report = await createDmUserSafetyReport({
      reporterUserId: user.id,
      subjectUserId,
      threadId,
      reason,
    });

    return NextResponse.json({ ok: true, reportId: report.id });
  } catch (error) {
    console.error("POST /api/feed/messages/[threadId]/report error", error);
    return NextResponse.json({ error: "Could not submit report." }, { status: 500 });
  }
}
