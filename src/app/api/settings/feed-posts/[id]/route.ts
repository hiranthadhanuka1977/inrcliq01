import { NextResponse } from "next/server";
import { deleteSettingsFeedPost } from "@/lib/settings/feed-posts";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const result = await deleteSettingsFeedPost(id);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("settings/feed-posts/[id] DELETE error", err);
    return NextResponse.json({ error: "Unable to delete post." }, { status: 500 });
  }
}
