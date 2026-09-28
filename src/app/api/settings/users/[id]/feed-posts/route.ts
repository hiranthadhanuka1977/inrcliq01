import { NextResponse } from "next/server";
import { deleteSettingsUserFeedPosts } from "@/lib/settings/feed-posts";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const result = await deleteSettingsUserFeedPosts(id);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json({ ok: true, deleted: result.deleted });
  } catch (err) {
    console.error("settings/users/[id]/feed-posts DELETE error", err);
    return NextResponse.json({ error: "Unable to delete feed posts." }, { status: 500 });
  }
}
