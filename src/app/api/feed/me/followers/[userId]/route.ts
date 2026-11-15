import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/api-helpers";
import { removeInboundFollower } from "@/lib/feed/follow-service";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

function isMissingFollowModel(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("CreatorFollow") ||
    message.includes("creatorFollow") ||
    message.includes("does not exist")
  );
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { user, error } = await requireSessionUser();
    if (error) return error;

    const { userId } = await context.params;
    const followerUserId = userId.trim();
    if (!followerUserId || followerUserId.length > 64) {
      return NextResponse.json({ error: "Follower not found." }, { status: 404 });
    }

    const removed = await removeInboundFollower(user.id, followerUserId);
    return NextResponse.json({ removed });
  } catch (error) {
    console.error("DELETE /api/feed/me/followers error", error);
    if (isMissingFollowModel(error)) {
      return NextResponse.json(
        { error: "Follow storage is not ready. Run database migrations." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "Could not remove follower." }, { status: 500 });
  }
}
