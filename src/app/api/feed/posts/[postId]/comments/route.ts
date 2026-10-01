import { NextResponse } from "next/server";
import { isLiveBackend } from "@/lib/backend/config";
import { liveListComments, liveAddComment } from "@/lib/backend/comments";

type Ctx = { params: Promise<{ postId: string }> };

/**
 * A post's comments.
 *
 * Mock mode keeps generating them from the fixture pool, so the prototype still
 * demonstrates the UI without a backend; live mode reads the real thread.
 */
export async function GET(_request: Request, { params }: Ctx) {
  const { postId } = await params;
  if (!isLiveBackend()) return NextResponse.json({ live: false, items: [] });
  return liveListComments(postId);
}

export async function POST(request: Request, { params }: Ctx) {
  const { postId } = await params;
  if (!isLiveBackend()) return NextResponse.json({ ok: true, live: false });
  return liveAddComment(postId, request);
}
