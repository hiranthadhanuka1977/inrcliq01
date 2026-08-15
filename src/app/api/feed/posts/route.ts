import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/api-helpers";
import { createOwnTextPost } from "@/lib/feed/create-post";

export async function POST(request: Request) {
  try {
    const { user, error } = await requireSessionUser();
    if (error) return error;

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const result = await createOwnTextPost(user.id, body);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
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
