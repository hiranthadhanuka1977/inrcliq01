import { NextResponse } from "next/server";
import { isLiveBackend } from "@/lib/backend/config";
import { liveSetLike } from "@/lib/backend/feed";

type Ctx = { params: Promise<{ postId: string }> };

/**
 * The heart on a feed card.
 *
 * PUT and DELETE rather than one toggle: on a flaky connection a request that
 * succeeded but whose response was lost gets retried, and a toggle would undo
 * the like while the user watched the count drop.
 *
 * The body carries which reaction was pressed. Sending a different one is a
 * change of mind, not a second reaction, so it stays a PUT.
 *
 * Mock mode keeps likes in component state, so there is nothing to persist —
 * answering ok leaves that behaviour untouched.
 */
export async function PUT(request: Request, { params }: Ctx) {
  const { postId } = await params;
  const body = (await request.json().catch(() => ({}))) as { reaction?: string };
  if (isLiveBackend()) return liveSetLike(postId, true, body.reaction);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { postId } = await params;
  if (isLiveBackend()) return liveSetLike(postId, false);
  return NextResponse.json({ ok: true });
}
