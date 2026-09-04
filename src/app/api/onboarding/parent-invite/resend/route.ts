import { NextResponse } from "next/server";
import { isLiveBackend } from "@/lib/backend/config";
import { liveParentInviteResend, liveParentInviteStatus } from "@/lib/backend/routes";
import { AccountType } from "@/generated/prisma/client";
import { createApprovalWatchToken, verifyApprovalWatchToken } from "@/lib/auth/approval-watch-token";
import {
  createParentApprovalRequest,
  getLatestParentRequest,
  sendParentInviteEmail,
} from "@/lib/auth/parent-invite";
import { requireSessionUser } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export async function POST() {
  if (isLiveBackend()) return liveParentInviteResend();

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

    return NextResponse.json({
      ok: true,
      cooldownRemaining: invite.cooldownRemaining,
      approveUrl: invite.approveUrl,
      watchToken: createApprovalWatchToken(user.id),
    });
  } catch (error) {
    console.error("parent-invite/resend error", error);
    return NextResponse.json({ error: "Unable to resend parent invite." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  if (isLiveBackend()) return liveParentInviteStatus();

  try {
    const watch = new URL(request.url).searchParams.get("watch")?.trim() ?? "";
    const watchChildId = watch ? verifyApprovalWatchToken(watch) : null;

    let childUserId: string | null = watchChildId;
    let childFirstName = "Your child";

    if (!childUserId) {
      const { user, error } = await requireSessionUser();
      if (error) return error;
      childUserId = user.id;
      childFirstName = user.firstName ?? "Your child";
    } else {
      const child = await prisma.user.findUnique({
        where: { id: childUserId },
        select: { firstName: true },
      });
      childFirstName = child?.firstName ?? "Your child";
    }

    const latest = await getLatestParentRequest(childUserId);

    if (!latest) {
      return NextResponse.json({ status: null });
    }

    const payload: Record<string, unknown> = {
      status: latest.status,
      parentEmail: latest.parentEmail,
      sentAt: latest.sentAt.toISOString(),
      expiresAt: latest.expiresAt.toISOString(),
      childFirstName,
    };

    const effectiveWatch = watchChildId ? watch : createApprovalWatchToken(childUserId);
    if (!watchChildId) {
      payload.watchToken = effectiveWatch;
    }

    if (latest.status === "APPROVED") {
      payload.resumeUrl = `/api/onboarding/resume-after-approval?watch=${encodeURIComponent(effectiveWatch)}`;
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error("parent-invite/status error", error);
    return NextResponse.json({ error: "Unable to load status." }, { status: 500 });
  }
}
