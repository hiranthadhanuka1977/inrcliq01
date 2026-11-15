import { NextResponse } from "next/server";
import {
  ensureChatThreadForProfileSlug,
  ensureChatThreadForUserId,
  listChatThreadsForUser,
} from "@/lib/feed/chat-service";
import {
  conversationFromThread,
  mapThreadsToConversationsWithRestrictions,
} from "@/lib/feed/messages-with-restrictions";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const threads = await listChatThreadsForUser(user.id);
  const conversations = await mapThreadsToConversationsWithRestrictions(user.id, threads);
  const unreadTotal = conversations.reduce((sum, item) => sum + item.unread, 0);

  return NextResponse.json({ conversations, unreadTotal });
}

/** Open or create a DM thread for a user, or for a public profile slug. */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as { slug?: string; userId?: string } | null;
  const slug = payload?.slug?.trim() ?? "";
  const recipientUserId = payload?.userId?.trim() ?? "";
  if (!slug && !recipientUserId) {
    return NextResponse.json({ error: "Choose a person to message." }, { status: 400 });
  }
  if (recipientUserId && recipientUserId === user.id) {
    return NextResponse.json({ error: "You can't message yourself." }, { status: 400 });
  }

  try {
    const thread = recipientUserId
      ? await ensureChatThreadForUserId(user.id, recipientUserId)
      : await ensureChatThreadForProfileSlug(user.id, slug);
    if (!thread) {
      return NextResponse.json(
        { error: "Unable to start a conversation with this person." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      conversation: await conversationFromThread(user.id, thread),
    });
  } catch (error) {
    console.error("POST /api/feed/messages error", error);
    return NextResponse.json({ error: "Unable to open conversation." }, { status: 500 });
  }
}
