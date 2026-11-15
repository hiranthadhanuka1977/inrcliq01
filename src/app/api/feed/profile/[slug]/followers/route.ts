import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/api-helpers";
import { getProfileIdentity } from "@/lib/feed/profile-directory";
import { listViewerShareRecipients } from "@/lib/feed/share-profile";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ slug: string }> };

/**
 * Share-picker list for a public profile.
 * People are the signed-in viewer's followers and the people the viewer follows,
 * not the followers of the profile being shared.
 */
export async function GET(_request: Request, context: RouteContext) {
  const { user, error } = await requireSessionUser();
  if (error || !user) return error;

  const { slug } = await context.params;
  if (!slug?.trim()) {
    return NextResponse.json({ error: "Profile slug is required." }, { status: 400 });
  }

  try {
    const profile = await getProfileIdentity(slug);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    }

    const people = await listViewerShareRecipients(user.id);

    return NextResponse.json({
      slug: profile.slug,
      name: profile.name,
      people,
    });
  } catch (err) {
    console.error("GET /api/feed/profile/[slug]/followers error", err);
    return NextResponse.json({ error: "Could not load your network." }, { status: 500 });
  }
}
