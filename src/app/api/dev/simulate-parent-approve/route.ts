import { NextResponse } from "next/server";
import { ApprovalStatus } from "@/generated/prisma/client";
import { approveParentRequest, getLatestParentRequest } from "@/lib/auth/parent-invite";
import { requireSessionUser } from "@/lib/api-helpers";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production." }, { status: 404 });
  }

  try {
    const { user, error } = await requireSessionUser();
    if (error) return error;

    const latest = await getLatestParentRequest(user.id);

    if (!latest || latest.status !== ApprovalStatus.PENDING) {
      return NextResponse.json({ error: "No pending parent request." }, { status: 400 });
    }

    await approveParentRequest(latest.id);

    return NextResponse.json({ ok: true, redirectTo: "/onboarding/approved" });
  } catch (err) {
    console.error("dev/simulate-parent-approve error", err);
    return NextResponse.json({ error: "Unable to simulate approval." }, { status: 500 });
  }
}
