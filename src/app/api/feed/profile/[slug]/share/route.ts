import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/api-helpers";
import { shareProfileWithNetwork } from "@/lib/feed/share-profile";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ slug: string }> };

/** Send this public profile as a direct message to people in the sender's network. */
export async function POST(request: Request, context: RouteContext) {
  const { user, error } = await requireSessionUser();
  if (error || !user) return error;

  const { slug } = await context.params;
  if (!slug?.trim()) {
    return NextResponse.json({ error: "Profile slug is required." }, { status: 400 });
  }

  const payload = (await request.json().catch(() => null)) as { userIds?: unknown } | null;
  const userIds = Array.isArray(payload?.userIds)
    ? payload.userIds.filter((id): id is string => typeof id === "string")
    : [];

  try {
    const result = await shareProfileWithNetwork(user.id, slug, userIds);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      sent: result.sent,
      sentUserIds: result.sentUserIds,
      confirmation: result.confirmation,
      failures: result.failures,
    });
  } catch (err) {
    console.error("POST /api/feed/profile/[slug]/share error", err);
    return NextResponse.json({ error: "Could not share this profile." }, { status: 500 });
  }
}
