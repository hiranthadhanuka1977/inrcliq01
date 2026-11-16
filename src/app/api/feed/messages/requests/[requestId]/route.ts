import { NextResponse } from "next/server";
import { decideMessageRequest } from "@/lib/feed/message-requests";
import { getSessionUser } from "@/lib/session";

interface RouteContext {
  params: Promise<{ requestId: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { requestId } = await context.params;
    const payload = (await request.json().catch(() => null)) as { action?: string } | null;
    const action = payload?.action;
    if (action !== "accept" && action !== "decline") {
      return NextResponse.json({ error: "Choose accept or decline." }, { status: 400 });
    }

    const result = await decideMessageRequest(user.id, requestId, action);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    if (result.action === "decline") {
      return NextResponse.json({ ok: true, action: "decline", requestId });
    }

    return NextResponse.json({
      ok: true,
      action: "accept",
      requestId,
      conversation: result.conversation,
    });
  } catch (error) {
    console.error("POST /api/feed/messages/requests/[requestId] error", error);
    return NextResponse.json({ error: "Could not update this request." }, { status: 500 });
  }
}
