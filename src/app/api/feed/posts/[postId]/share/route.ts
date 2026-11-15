import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/api-helpers";
import { sharePostWithUsers } from "@/lib/feed/share-post";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ postId: string }> };

/** Send a post as a direct message to the chosen people. */
export async function POST(request: Request, context: RouteContext) {
  const { user, error } = await requireSessionUser();
  if (error || !user) return error;

  const { postId } = await context.params;
  if (!postId?.trim()) {
    return NextResponse.json({ error: "Post is required." }, { status: 400 });
  }

  const payload = (await request.json().catch(() => null)) as { userIds?: unknown } | null;
  const userIds = Array.isArray(payload?.userIds)
    ? payload.userIds.filter((id): id is string => typeof id === "string")
    : [];

  try {
    const result = await sharePostWithUsers(user.id, postId, userIds);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      sent: result.sent,
      sentUserIds: result.sentUserIds,
      confirmation: result.confirmation,
      failures: result.failures,
    });
  } catch (err) {
    console.error("POST /api/feed/posts/[postId]/share error", err);
    return NextResponse.json({ error: "Could not send this post." }, { status: 500 });
  }
}
