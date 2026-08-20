import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireSessionUser } from "@/lib/api-helpers";
import { activateVerifiedMembership } from "@/lib/seller/membership";

export async function POST() {
  const { user, error } = await requireSessionUser();
  if (error) return error;

  try {
    const result = await activateVerifiedMembership(user.id);
    revalidatePath("/seller");
    revalidatePath("/feed/me");
    if (result.slug) {
      revalidatePath(`/feed/profile/${result.slug}`);
    }
    return NextResponse.json({
      ok: true,
      redirectTo: result.redirectTo,
      displayName: result.displayName,
    });
  } catch (err) {
    console.error("seller/membership POST error", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Unable to activate Verified membership.",
      },
      { status: 500 },
    );
  }
}
