import { NextResponse } from "next/server";
import { isLiveBackend } from "@/lib/backend/config";
import { liveSetCommentLike } from "@/lib/backend/comments";

type Ctx = { params: Promise<{ postId: string; commentId: string }> };

/**
 * A reaction on a comment. Same contract as the post's, down to the body.
 *
 * Mock mode keeps comment likes in component state, so there is nothing to
 * persist — answering ok leaves that behaviour untouched.
 */
export async function PUT(request: Request, { params }: Ctx) {
  const { postId, commentId } = await params;
  const body = (await request.json().catch(() => ({}))) as { reaction?: string };
  if (isLiveBackend()) return liveSetCommentLike(postId, commentId, true, body.reaction);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { postId, commentId } = await params;
  if (isLiveBackend()) return liveSetCommentLike(postId, commentId, false);
  return NextResponse.json({ ok: true });
}
