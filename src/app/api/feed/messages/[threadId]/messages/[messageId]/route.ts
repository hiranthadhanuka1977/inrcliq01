import { NextResponse } from "next/server";
import { deleteChatMessage, editChatMessage } from "@/lib/feed/chat-service";
import { conversationFromThread } from "@/lib/feed/messages-with-restrictions";
import { getSessionUser } from "@/lib/session";

interface RouteContext {
  params: Promise<{ threadId: string; messageId: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { threadId, messageId } = await context.params;
    const payload = (await request.json().catch(() => null)) as {
      body?: string;
      acceptModeration?: boolean;
    } | null;
    const body = payload?.body?.trim() ?? "";
    if (!body) {
      return NextResponse.json({ error: "Write a message." }, { status: 400 });
    }

    const result = await editChatMessage(user.id, threadId, messageId, body, {
      acceptModeration: payload?.acceptModeration === true,
    });
    if (!result) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    if ("restricted" in result && result.restricted) {
      return NextResponse.json(
        {
          error: result.message,
          code: result.code,
          ...(result.code === "DM_MINOR_RESTRICTED"
            ? { restrictionEndsAt: result.restrictionEndsAt ?? null }
            : {}),
        },
        { status: 403 },
      );
    }
    if ("moderationRequired" in result && result.moderationRequired) {
      return NextResponse.json(
        {
          error: result.moderation.message,
          code: "DM_MODERATION_WARNING",
          moderation: result.moderation,
        },
        { status: 422 },
      );
    }
    if (!("thread" in result) || !result.thread) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      conversation: await conversationFromThread(user.id, result.thread),
    });
  } catch (error) {
    console.error("PATCH /api/feed/messages/[threadId]/messages/[messageId] error", error);
    return NextResponse.json({ error: "Could not edit message." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { threadId, messageId } = await context.params;
    const scope = new URL(request.url).searchParams.get("scope") === "everyone" ? "everyone" : "me";
    const thread = await deleteChatMessage(user.id, threadId, messageId, scope);
    if (!thread) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      conversation: await conversationFromThread(user.id, thread),
    });
  } catch (error) {
    console.error("DELETE /api/feed/messages/[threadId]/messages/[messageId] error", error);
    return NextResponse.json({ error: "Could not delete message." }, { status: 500 });
  }
}
