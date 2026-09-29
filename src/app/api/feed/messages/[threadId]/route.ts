import { NextResponse } from "next/server";
import { mapThreadToConversation } from "@/lib/feed/chat";
import {
  clearChatThreadMessages,
  deleteChatThread,
  getChatThreadForUser,
  markThreadRead,
  sendChatMessage,
} from "@/lib/feed/chat-service";
import { getConversationRestriction } from "@/lib/feed/messages-with-restrictions";
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

  const restriction = await getConversationRestriction(user.id, fresh);
  return NextResponse.json({
    conversation: {
      ...mapThreadToConversation(fresh),
      dmRestricted: restriction.restricted,
      dmRestrictedMessage: restriction.message,
    },
  });
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { threadId } = await context.params;
    const payload = (await request.json().catch(() => null)) as {
      body?: string;
      acceptModeration?: boolean;
    } | null;
    const body = payload?.body?.trim() ?? "";
    if (!body) {
      return NextResponse.json({ error: "Message body is required" }, { status: 400 });
    }

    const result = await sendChatMessage(user.id, threadId, body, {
      acceptModeration: payload?.acceptModeration === true,
    });
    if (!result) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
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
      conversation: mapThreadToConversation(result.thread),
      ...(result.enforcement ? { enforcement: result.enforcement } : {}),
    });
  } catch (error) {
    console.error("POST /api/feed/messages/[threadId] error", error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Could not send message.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { threadId } = await context.params;
    const scope = new URL(request.url).searchParams.get("scope")?.trim().toLowerCase();

    if (scope === "thread") {
      const deleted = await deleteChatThread(user.id, threadId);
      if (!deleted) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json({ ok: true, deleted: true, threadId: deleted.id });
    }

    const thread = await clearChatThreadMessages(user.id, threadId);
    if (!thread) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const restriction = await getConversationRestriction(user.id, thread);
    return NextResponse.json({
      ok: true,
      conversation: {
        ...mapThreadToConversation(thread),
        dmRestricted: restriction.restricted,
        dmRestrictedMessage: restriction.message,
      },
    });
  } catch (error) {
    console.error("DELETE /api/feed/messages/[threadId] error", error);
    return NextResponse.json({ error: "Could not update chat." }, { status: 500 });
  }
}
