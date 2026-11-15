import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/api-helpers";
import { removeFeedBookmark, saveFeedBookmark } from "@/lib/feed/bookmarks";

function isMissingBookmarkModel(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("FeedBookmark") ||
    message.includes("feedBookmark") ||
    message.includes("does not exist")
  );
}

function readPostId(body: Record<string, unknown>) {
  return typeof body.postId === "string" ? body.postId.trim() : "";
}

/** Save a post for the signed-in user. */
export async function POST(request: Request) {
  try {
    const { user, error } = await requireSessionUser();
    if (error) return error;

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const postId = readPostId(body);
    if (!postId) {
      return NextResponse.json({ error: "Post id is required." }, { status: 400 });
    }

    const result = await saveFeedBookmark(user.id, postId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ ok: true, bookmarked: true });
  } catch (error) {
    console.error("POST /api/feed/bookmarks error", error);
    if (isMissingBookmarkModel(error)) {
      return NextResponse.json(
        { error: "Saved storage is not ready. Run database migrations." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "Unable to save this post." }, { status: 500 });
  }
}

/** Remove a saved post for the signed-in user. */
export async function DELETE(request: Request) {
  try {
    const { user, error } = await requireSessionUser();
    if (error) return error;

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const postId = readPostId(body);
    if (!postId) {
      return NextResponse.json({ error: "Post id is required." }, { status: 400 });
    }

    await removeFeedBookmark(user.id, postId);
    return NextResponse.json({ ok: true, bookmarked: false });
  } catch (error) {
    console.error("DELETE /api/feed/bookmarks error", error);
    if (isMissingBookmarkModel(error)) {
      return NextResponse.json(
        { error: "Saved storage is not ready. Run database migrations." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "Unable to remove this bookmark." }, { status: 500 });
  }
}
