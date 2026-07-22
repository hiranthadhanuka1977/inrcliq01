import { NextResponse } from "next/server";
import { mapThreadToConversation } from "@/lib/feed/chat";
import {
  getChatThreadForUser,
  markThreadRead,
  sendChatMessage,
} from "@/lib/feed/chat-service";
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
  return NextResponse.json({ conversation: mapThreadToConversation(fresh!) });
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
  if (!result?.thread) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ conversation: mapThreadToConversation(result.thread) });
}
