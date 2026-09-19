import { NextResponse } from "next/server";
import { mapThreadToConversation } from "@/lib/feed/chat";
import {
  ensureChatThreadForProfileSlug,
  listChatThreadsForUser,
} from "@/lib/feed/chat-service";
import { mapThreadsToConversationsWithRestrictions } from "@/lib/feed/messages-with-restrictions";
import { getDirectMessagingRestriction } from "@/lib/guardian/dm-contact-controls";
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

/** Open or create a DM thread for a public profile slug (profile message button). */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as { slug?: string } | null;
  const slug = payload?.slug?.trim() ?? "";
  if (!slug) {
    return NextResponse.json({ error: "Profile slug is required." }, { status: 400 });
  }

  try {
    const thread = await ensureChatThreadForProfileSlug(user.id, slug);
    if (!thread) {
      return NextResponse.json(
        { error: "Unable to start a conversation with this profile." },
        { status: 404 },
      );
    }

    const restriction = await getDirectMessagingRestriction(user.id, thread);
    return NextResponse.json({
      conversation: {
        ...mapThreadToConversation(thread),
        dmRestricted: restriction.restricted,
        dmRestrictedMessage: restriction.message,
      },
    });
  } catch (error) {
    console.error("POST /api/feed/messages error", error);
    return NextResponse.json({ error: "Unable to open conversation." }, { status: 500 });
  }
}
