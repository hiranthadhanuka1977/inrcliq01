import { NextResponse } from "next/server";
import {
  clearChatThreadMessages,
  deleteChatThread,
  getChatThreadForUser,
  markThreadRead,
  resolveReceiverUserId,
  sendChatMessage,
  setThreadNotificationsMuted,
} from "@/lib/feed/chat-service";
import { setDirectMessageBlock } from "@/lib/feed/dm-participant-controls";
import { conversationFromThread } from "@/lib/feed/messages-with-restrictions";
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

  return NextResponse.json({
    conversation: await conversationFromThread(user.id, fresh),
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
      attachments?: unknown;
    } | null;
    const body = payload?.body?.trim() ?? "";
    const attachments = Array.isArray(payload?.attachments) ? payload.attachments : [];
    if (!body && attachments.length === 0) {
      return NextResponse.json({ error: "Write a message or attach a file." }, { status: 400 });
    }

    const result = await sendChatMessage(user.id, threadId, body, {
      acceptModeration: payload?.acceptModeration === true,
      attachments,
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
      conversation: await conversationFromThread(user.id, result.thread),
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

    return NextResponse.json({
      ok: true,
      conversation: await conversationFromThread(user.id, thread),
    });
  } catch (error) {
    console.error("DELETE /api/feed/messages/[threadId] error", error);
    return NextResponse.json({ error: "Could not update chat." }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { threadId } = await context.params;
    const payload = (await request.json().catch(() => null)) as {
      muted?: boolean;
      blocked?: boolean;
    } | null;
    const wantsMute = typeof payload?.muted === "boolean";
    const wantsBlock = typeof payload?.blocked === "boolean";
    if (!wantsMute && !wantsBlock) {
      return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
    }

    const thread = await getChatThreadForUser(user.id, threadId);
    if (!thread) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (wantsMute) {
      const muted = await setThreadNotificationsMuted(user.id, threadId, payload!.muted === true);
      if (!muted) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
    }

    if (wantsBlock) {
      const peerUserId = await resolveReceiverUserId(thread);
      if (!peerUserId || peerUserId === user.id) {
        return NextResponse.json(
          { error: "This person can't be blocked from here yet." },
          { status: 400 },
        );
      }
      await setDirectMessageBlock(user.id, peerUserId, payload!.blocked === true);
    }

    const fresh = await getChatThreadForUser(user.id, threadId);
    if (!fresh) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      conversation: await conversationFromThread(user.id, fresh),
    });
  } catch (error) {
    console.error("PATCH /api/feed/messages/[threadId] error", error);
    return NextResponse.json({ error: "Could not update chat." }, { status: 500 });
  }
}
