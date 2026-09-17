import { NextResponse } from "next/server";
import { AccountType, ApprovalStatus } from "@/generated/prisma/client";
import { verifyApprovalWatchToken } from "@/lib/auth/approval-watch-token";
import { getLatestParentRequest } from "@/lib/auth/parent-invite";
import { prisma } from "@/lib/prisma";
import { createSession, getSessionUser } from "@/lib/session";

/**
 * Restores the child's browser session after parent approval and sends them
 * to the approved onboarding step. Used by the waiting-page auto-advance flow
 * (works even if the parent signed in on another tab and overwrote the cookie).
 */
export async function GET(request: Request) {
  try {
    const watch = new URL(request.url).searchParams.get("watch")?.trim() ?? "";
    const childUserId = verifyApprovalWatchToken(watch);
    if (!childUserId) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    const [child, latest] = await Promise.all([
      prisma.user.findUnique({
        where: { id: childUserId },
        select: { id: true, accountType: true, onboardingStep: true },
      }),
      getLatestParentRequest(childUserId),
    ]);

    if (!child || child.accountType !== AccountType.MINOR) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    if (!latest || latest.status !== ApprovalStatus.APPROVED) {
      return NextResponse.redirect(new URL("/onboarding/waiting", request.url));
    }

    if (child.onboardingStep === "waiting" || child.onboardingStep === "parent" || !child.onboardingStep) {
      await prisma.user.update({
        where: { id: child.id },
        data: { onboardingStep: "approved" },
      });
    }

    // Prefer restoring the approved child session for this tab.
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.id !== child.id) {
      await createSession(child.id);
    }

    return NextResponse.redirect(new URL("/onboarding/approved", request.url));
  } catch (error) {
    console.error("onboarding/resume-after-approval error", error);
    return NextResponse.redirect(new URL("/", request.url));
  }
}
