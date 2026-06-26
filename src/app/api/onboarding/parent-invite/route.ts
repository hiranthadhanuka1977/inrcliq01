import { NextResponse } from "next/server";
import { AccountType } from "@/generated/prisma/client";
import {
  createParentApprovalRequest,
  sendParentInviteEmail,
} from "@/lib/auth/parent-invite";
import { requireSessionUser } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { parseParentEmail } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const { user, error } = await requireSessionUser();
    if (error) return error;

    if (user.accountType !== AccountType.MINOR) {
      return NextResponse.json({ error: "Parent approval is not required." }, { status: 400 });
    }

    const body = await request.json();
    const parsed = parseParentEmail(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid parent email." },
        { status: 400 },
      );
    }

    const parentEmail = parsed.data.parentEmail.toLowerCase();

    if (parentEmail === user.email.toLowerCase()) {
      return NextResponse.json(
        { error: "Please enter your parent or guardian's email, not your own." },
        { status: 400 },
      );
    }

    const invite = await createParentApprovalRequest(user.id, parentEmail);

    if (!invite.ok) {
      return NextResponse.json(
        { error: "Please wait before resending.", cooldownRemaining: invite.cooldownRemaining },
        { status: 429 },
      );
    }

    await sendParentInviteEmail(
      parentEmail,
      invite.approveUrl,
      user.firstName ?? "Your child",
    );

    await prisma.user.update({
      where: { id: user.id },
      data: { onboardingStep: "waiting" },
    });

    const response: Record<string, unknown> = {
      ok: true,
      redirectTo: "/onboarding/waiting",
      cooldownRemaining: invite.cooldownRemaining,
    };

    if (process.env.NODE_ENV === "development") {
      response.devApproveUrl = invite.approveUrl;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("onboarding/parent-invite error", error);
    return NextResponse.json({ error: "Unable to send parent invite." }, { status: 500 });
  }
}
