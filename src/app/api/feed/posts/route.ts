import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/api-helpers";
import { createOwnTextPost } from "@/lib/feed/create-post";
import { deleteOwnFeedPost, hidePostFromFeed } from "@/lib/feed/post-actions";

function isMissingHiddenModel(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("FeedHiddenPost") ||
    message.includes("feedHiddenPost") ||
    message.includes("does not exist")
  );
}

function readPostId(body: Record<string, unknown>) {
  return typeof body.postId === "string" ? body.postId.trim() : "";
}

export async function POST(request: Request) {
  try {
    const { user, error } = await requireSessionUser();
    if (error) return error;

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const result = await createOwnTextPost(user.id, body);

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error,
          ...("moderation" in result && result.moderation ? { moderation: result.moderation } : {}),
        },
        { status: result.status },
      );
    }

    return NextResponse.json({
      ok: true,
      postId: result.postId,
      profileHref: result.profileHref,
    });
  } catch (error) {
    console.error("POST /api/feed/posts error", error);
    return NextResponse.json({ error: "Unable to publish your post." }, { status: 500 });
  }
}

/** Hide someone else's post from the current user's feed. */
export async function PATCH(request: Request) {
  try {
    const { user, error } = await requireSessionUser();
    if (error) return error;

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const postId = readPostId(body);
    if (!postId) {
      return NextResponse.json({ error: "Post id is required." }, { status: 400 });
    }

    await hidePostFromFeed(user.id, postId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PATCH /api/feed/posts (hide) error", error);
    if (isMissingHiddenModel(error)) {
      return NextResponse.json(
        { error: "Hide storage is not ready. Run database migrations." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "Unable to remove this post from your feed." }, { status: 500 });
  }
}

/** Permanently delete the current user's own post. */
export async function DELETE(request: Request) {
  try {
    const { user, error } = await requireSessionUser();
    if (error) return error;

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const postId = readPostId(body);
    if (!postId) {
      return NextResponse.json({ error: "Post id is required." }, { status: 400 });
    }

    const result = await deleteOwnFeedPost(user.id, postId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/feed/posts error", error);
    return NextResponse.json({ error: "Unable to delete this post." }, { status: 500 });
  }
}
