import { NextResponse } from "next/server";
import { isLiveBackend } from "@/lib/backend/config";
import { liveSetBookmark } from "@/lib/backend/feed";

type Ctx = { params: Promise<{ postId: string }> };

/** Saving a post. Idempotent for the same reason as the like. */
export async function PUT(_request: Request, { params }: Ctx) {
  const { postId } = await params;
  if (isLiveBackend()) return liveSetBookmark(postId, true);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const { postId } = await params;
  if (isLiveBackend()) return liveSetBookmark(postId, false);
  return NextResponse.json({ ok: true });
}
