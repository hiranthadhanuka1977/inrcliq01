import { NextResponse } from "next/server";
import { mapThreadToConversation } from "@/lib/feed/chat";
import { listChatThreadsForUser } from "@/lib/feed/chat-service";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const threads = await listChatThreadsForUser(user.id);
  const conversations = threads.map(mapThreadToConversation);
  const unreadTotal = conversations.reduce((sum, item) => sum + item.unread, 0);

  return NextResponse.json({ conversations, unreadTotal });
}
