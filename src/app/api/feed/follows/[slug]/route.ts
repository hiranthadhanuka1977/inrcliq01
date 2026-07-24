import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/api-helpers";
import {
  followCreator,
  isFollowingCreator,
  resolveFollowTargetBySlug,
  unfollowCreator,
} from "@/lib/feed/follow-service";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

function isMissingFollowModel(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("CreatorFollow") ||
    message.includes("creatorFollow") ||
    message.includes("does not exist")
  );
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { user, error } = await requireSessionUser();
    if (error) return error;

    const { slug } = await context.params;
    const creator = await resolveFollowTargetBySlug(slug);
    if (!creator) {
      return NextResponse.json({ error: "Creator not found." }, { status: 404 });
    }

    const following = await isFollowingCreator(user.id, creator.id);
    return NextResponse.json({ following, slug: creator.slug ?? slug });
  } catch (error) {
    console.error("GET /api/feed/follows error", error);
    if (isMissingFollowModel(error)) {
      return NextResponse.json({
        error: "Follow storage is not ready. Run database migrations.",
      }, { status: 503 });
    }
    return NextResponse.json({ error: "Unable to load follow state." }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { user, error } = await requireSessionUser();
    if (error) return error;

    const { slug } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { action?: string };
    const action = body.action === "unfollow" ? "unfollow" : "follow";

    const creator = await resolveFollowTargetBySlug(slug);
    if (!creator) {
      return NextResponse.json({ error: "Creator not found." }, { status: 404 });
    }

    if (action === "unfollow") {
      await unfollowCreator(user.id, creator.id);
    } else {
      await followCreator(user.id, creator.id);
    }

    const following = await isFollowingCreator(user.id, creator.id);
    return NextResponse.json({ following, slug: creator.slug ?? slug });
  } catch (error) {
    console.error("POST /api/feed/follows error", error);
    if (isMissingFollowModel(error)) {
      return NextResponse.json({
        error: "Follow storage is not ready. Run database migrations.",
      }, { status: 503 });
    }
    return NextResponse.json({ error: "Could not update follow." }, { status: 500 });
  }
}
