import { NextResponse } from "next/server";
import { AccountType } from "@/generated/prisma/client";
import {
  createParentApprovalRequest,
  getLatestParentRequest,
  sendParentInviteEmail,
} from "@/lib/auth/parent-invite";
import { requireSessionUser } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const { user, error } = await requireSessionUser();
    if (error) return error;

    if (user.accountType !== AccountType.MINOR) {
      return NextResponse.json({ error: "Parent approval is not required." }, { status: 400 });
    }

    const latest = await getLatestParentRequest(user.id);
    if (!latest || latest.status !== "PENDING") {
      return NextResponse.json({ error: "No pending parent invite to resend." }, { status: 400 });
    }

    const invite = await createParentApprovalRequest(user.id, latest.parentEmail);

    if (!invite.ok) {
      return NextResponse.json(
        { error: "Please wait before resending.", cooldownRemaining: invite.cooldownRemaining },
        { status: 429 },
      );
    }

    await sendParentInviteEmail(
      latest.parentEmail,
      invite.approveUrl,
      user.firstName ?? "Your child",
    );

    const response: Record<string, unknown> = {
      ok: true,
      cooldownRemaining: invite.cooldownRemaining,
    };

    if (process.env.NODE_ENV === "development") {
      response.devApproveUrl = invite.approveUrl;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("parent-invite/resend error", error);
    return NextResponse.json({ error: "Unable to resend parent invite." }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { user, error } = await requireSessionUser();
    if (error) return error;

    const latest = await getLatestParentRequest(user.id);

    if (!latest) {
      return NextResponse.json({ status: null });
    }

    return NextResponse.json({
      status: latest.status,
      parentEmail: latest.parentEmail,
      sentAt: latest.sentAt.toISOString(),
      expiresAt: latest.expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("parent-invite/status error", error);
    return NextResponse.json({ error: "Unable to load status." }, { status: 500 });
  }
}
