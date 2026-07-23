import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { ApprovalStatus } from "@/generated/prisma/client";
import { sendParentApprovedChildEmail } from "@/lib/email/notifications";
import { prisma } from "@/lib/prisma";
import { getAppUrl } from "@/lib/api-helpers";
import {
  CHILD_CONTINUE_EXPIRY_HOURS,
  PARENT_INVITE_COOLDOWN_SECONDS,
  PARENT_INVITE_EXPIRY_HOURS,
} from "@/lib/auth/parent-invite.constants";
import { sendParentInviteEmail as deliverParentInviteEmail } from "@/lib/email/notifications";
import { createSession } from "@/lib/session";

function generateToken() {
  return randomBytes(32).toString("hex");
}

export async function getParentInviteCooldownRemaining(childUserId: string) {
  const latest = await prisma.parentApprovalRequest.findFirst({
    where: { childUserId },
    orderBy: { createdAt: "desc" },
  });

  if (!latest) return 0;

  const cooldownEndsAt = latest.createdAt.getTime() + PARENT_INVITE_COOLDOWN_SECONDS * 1000;
  const remaining = Math.ceil((cooldownEndsAt - Date.now()) / 1000);

  return remaining > 0 ? remaining : 0;
}

export async function createParentApprovalRequest(childUserId: string, parentEmail: string) {
  const normalizedParentEmail = parentEmail.toLowerCase();
  const remaining = await getParentInviteCooldownRemaining(childUserId);

  if (remaining > 0) {
    return { ok: false as const, cooldownRemaining: remaining };
  }

  const rawToken = generateToken();
  const tokenHash = await bcrypt.hash(rawToken, 10);
  const expiresAt = new Date(Date.now() + PARENT_INVITE_EXPIRY_HOURS * 60 * 60 * 1000);

  await prisma.parentApprovalRequest.updateMany({
    where: { childUserId, status: ApprovalStatus.PENDING },
    data: { status: ApprovalStatus.EXPIRED, resolvedAt: new Date() },
  });

  const request = await prisma.parentApprovalRequest.create({
    data: {
      childUserId,
      parentEmail: normalizedParentEmail,
      tokenHash,
      expiresAt,
    },
  });

  const approveUrl = `${getAppUrl()}/guardian/approve?token=${rawToken}`;

  return {
    ok: true as const,
    request,
    approveUrl,
    rawToken,
    cooldownRemaining: PARENT_INVITE_COOLDOWN_SECONDS,
  };
}

export async function verifyParentApprovalToken(rawToken: string) {
  const requests = await prisma.parentApprovalRequest.findMany({
    where: {
      status: ApprovalStatus.PENDING,
      expiresAt: { gt: new Date() },
    },
    include: { childUser: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  for (const record of requests) {
    const matches = await bcrypt.compare(rawToken, record.tokenHash);
    if (!matches) continue;

    return { ok: true as const, request: record };
  }

  return { ok: false as const, reason: "invalid" as const };
}

/** Issues a one-time continue link bound to this approved request / child. */
export async function issueChildContinueUrl(requestId: string) {
  const rawToken = generateToken();
  const continueTokenHash = await bcrypt.hash(rawToken, 10);
  const continueTokenExpiresAt = new Date(
    Date.now() + CHILD_CONTINUE_EXPIRY_HOURS * 60 * 60 * 1000,
  );

  await prisma.parentApprovalRequest.update({
    where: { id: requestId },
    data: {
      continueTokenHash,
      continueTokenExpiresAt,
      continueTokenUsedAt: null,
    },
  });

  return `${getAppUrl()}/api/onboarding/continue-approval?token=${rawToken}`;
}

/**
 * Validates the child's emailed continue token, starts their session,
 * and returns where onboarding should resume.
 * Tokens remain usable until expiry so email prefetch / re-clicks still work.
 */
export async function consumeChildContinueToken(rawToken: string) {
  const candidates = await prisma.parentApprovalRequest.findMany({
    where: {
      status: ApprovalStatus.APPROVED,
      continueTokenHash: { not: null },
      continueTokenExpiresAt: { gt: new Date() },
    },
    include: { childUser: true },
    orderBy: { resolvedAt: "desc" },
    take: 50,
  });

  for (const record of candidates) {
    if (!record.continueTokenHash) continue;

    const matches = await bcrypt.compare(rawToken, record.continueTokenHash);
    if (!matches) continue;

    if (!record.continueTokenUsedAt) {
      await prisma.parentApprovalRequest.update({
        where: { id: record.id },
        data: { continueTokenUsedAt: new Date() },
      });
    }

    const step = record.childUser.onboardingStep;
    if (step === "waiting" || step === "parent" || !step) {
      await prisma.user.update({
        where: { id: record.childUserId },
        data: { onboardingStep: "approved" },
      });
    }

    await createSession(record.childUserId);

    return {
      ok: true as const,
      childUserId: record.childUserId,
      redirectTo: "/onboarding/approved" as const,
    };
  }

  return { ok: false as const, reason: "invalid" as const };
}

export async function unlockChildAfterParentApproval(childUserId: string) {
  await prisma.user.update({
    where: { id: childUserId },
    data: { onboardingStep: "approved" },
  });
}

export async function notifyChildOfParentApproval(requestId: string) {
  const request = await prisma.parentApprovalRequest.findUniqueOrThrow({
    where: { id: requestId },
    include: { childUser: true },
  });

  const continueUrl = await issueChildContinueUrl(requestId);
  await sendParentApprovedChildEmail(
    request.childUser.email,
    request.childUser.firstName ?? "there",
    continueUrl,
  );

  return { continueUrl };
}

export async function approveParentRequest(requestId: string) {
  const request = await prisma.parentApprovalRequest.findUniqueOrThrow({
    where: { id: requestId },
    include: { childUser: true },
  });

  await prisma.$transaction([
    prisma.parentApprovalRequest.update({
      where: { id: requestId },
      data: {
        status: ApprovalStatus.APPROVED,
        resolvedAt: new Date(),
      },
    }),
    prisma.user.update({
      where: { id: request.childUserId },
      data: { onboardingStep: "approved" },
    }),
  ]);

  await notifyChildOfParentApproval(requestId);

  return request;
}

export async function getLatestParentRequest(childUserId: string) {
  return prisma.parentApprovalRequest.findFirst({
    where: { childUserId },
    orderBy: { createdAt: "desc" },
  });
}

export async function sendParentInviteEmail(
  parentEmail: string,
  approveUrl: string,
  childFirstName: string,
) {
  await deliverParentInviteEmail(parentEmail, approveUrl, childFirstName);
}
