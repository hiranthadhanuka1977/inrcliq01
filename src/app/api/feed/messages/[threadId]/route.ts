import { NextResponse } from "next/server";
import { mapThreadToConversation } from "@/lib/feed/chat";
import {
  getChatThreadForUser,
  markThreadRead,
  sendChatMessage,
} from "@/lib/feed/chat-service";
import { getDirectMessagingRestriction } from "@/lib/guardian/dm-contact-controls";
import { getSessionUser } from "@/lib/session";

interface RouteContext {
  params: Promise<{ threadId: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { threadId } = await context.params;
  const thread = await getChatThreadForUser(user.id, threadId);
  if (!thread) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await markThreadRead(user.id, threadId);
  const fresh = await getChatThreadForUser(user.id, threadId);
  if (!fresh) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const restriction = await getDirectMessagingRestriction(user.id, fresh);
  return NextResponse.json({
    conversation: {
      ...mapThreadToConversation(fresh),
      dmRestricted: restriction.restricted,
      dmRestrictedMessage: restriction.message,
    },
  });
}

export async function POST(request: Request, context: RouteContext) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { threadId } = await context.params;
  const payload = (await request.json().catch(() => null)) as { body?: string } | null;
  const body = payload?.body?.trim() ?? "";
  if (!body) {
    return NextResponse.json({ error: "Message body is required" }, { status: 400 });
  }

  const result = await sendChatMessage(user.id, threadId, body);
  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if ("restricted" in result && result.restricted) {
    return NextResponse.json(
      { error: result.message, code: "DM_RESTRICTED" },
      { status: 403 },
    );
  }

  if (!("thread" in result) || !result.thread) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ conversation: mapThreadToConversation(result.thread) });
}
